import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 5;
const CHUNK_SIZE = 1600;
const CHUNK_OVERLAP = 400;
const EMBEDDING_BATCH_SIZE = 20;

const DRIVE_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

function chunkText(text: string, title: string): string[] {
  // Strip null bytes that cause PostgreSQL "unsupported Unicode escape sequence" errors
  const sanitized = text.replace(/\u0000/g, "");
  const chunks: string[] = [];
  const prefix = `Document: ${title}\n\n`;
  let start = 0;
  while (start < sanitized.length) {
    const end = Math.min(start + CHUNK_SIZE, sanitized.length);
    chunks.push(prefix + sanitized.slice(start, end));
    if (end >= sanitized.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.length > 0 ? chunks : [prefix + "(empty document)"];
}

function getMimeExport(mimeType: string): { exportMime: string; method: "export" | "download" } {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return { exportMime: "text/plain", method: "export" };
    case "application/vnd.google-apps.spreadsheet":
      return { exportMime: "text/csv", method: "export" };
    case "application/vnd.google-apps.presentation":
      return { exportMime: "text/plain", method: "export" };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return { exportMime: "text/plain", method: "export" };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return { exportMime: "text/csv", method: "export" };
    case "application/pdf":
    case "text/plain":
      return { exportMime: mimeType, method: "download" };
    default:
      return { exportMime: "text/plain", method: "export" };
  }
}

function getDocType(mimeType: string): string {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "doc";
    case "application/vnd.google-apps.spreadsheet":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "sheet";
    case "application/vnd.google-apps.presentation":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "slide";
    case "application/pdf": return "pdf";
    case "text/plain": return "doc";
    default: return "unknown";
  }
}

function getDocUrl(fileId: string, mimeType: string): string {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return `https://docs.google.com/document/d/${fileId}`;
    case "application/vnd.google-apps.spreadsheet":
      return `https://docs.google.com/spreadsheets/d/${fileId}`;
    case "application/vnd.google-apps.presentation":
      return `https://docs.google.com/presentation/d/${fileId}`;
    default:
      return `https://drive.google.com/file/d/${fileId}`;
  }
}

async function fetchFileContent(fileId: string, mimeType: string, accessToken: string): Promise<string | null> {
  try {
    const { exportMime, method } = getMimeExport(mimeType);

    let url: string;
    if (method === "export") {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`;
    } else {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`Failed to fetch file ${fileId}: ${res.status}`);
      return null;
    }

    if (mimeType === "application/pdf") {
      // Best-effort: just get whatever text we can from the response
      const text = await res.text();
      return text.length > 0 ? text : null;
    }

    return await res.text();
  } catch (err) {
    console.error(`Error fetching file ${fileId}:`, err);
    return null;
  }
}

async function generateEmbeddings(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: "text-embedding-3-small",
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI embeddings error: ${res.status}`);
      return texts.map(() => null);
    }

    const data = await res.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return texts.map(() => null);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client for reading oauth_tokens (respects RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for DB writes (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse optional offset
    let offset = 0;
    try {
      const body = await req.json();
      offset = body.offset || 0;
    } catch {
      // No body or invalid JSON, use default offset
    }

    // Get Google access token (with refresh logic)
    const { data: tokenData, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Google token not found. Please re-authenticate." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let googleToken = tokenData.access_token;

    // Check if token is expired (or expires within 60s)
    const isExpired = tokenData.expires_at &&
      new Date(tokenData.expires_at).getTime() < Date.now() + 60_000;

    console.log("Token expires_at:", tokenData.expires_at, "isExpired:", isExpired);

    if (isExpired && tokenData.refresh_token) {
      console.log("Refreshing token...");
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshRes.ok) {
        console.error("Token refresh failed:", await refreshRes.text());
        return new Response(JSON.stringify({ error: "Google token expired and refresh failed. Please re-authenticate." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refreshData = await refreshRes.json();
      googleToken = refreshData.access_token;

      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await serviceClient
        .from("oauth_tokens")
        .update({ access_token: googleToken, expires_at: newExpiresAt })
        .eq("user_id", user.id)
        .eq("provider", "google");
    }

    // List files from Google Drive
    const mimeQuery = DRIVE_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=(${encodeURIComponent(mimeQuery)}) and trashed=false&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,mimeType,owners)`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${googleToken}` },
    });

    if (listRes.status === 401) {
      return new Response(JSON.stringify({ error: "Google token expired. Please re-authenticate." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Drive API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to list Google Drive files" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const listData = await listRes.json();
    const allFiles = listData.files || [];
    console.log("Drive API status:", listRes.status, "Files found:", allFiles.length);
    const total = allFiles.length;
    const filesToProcess = allFiles.slice(offset, offset + BATCH_SIZE);
    const processed = filesToProcess.length;
    const remaining = Math.max(0, total - offset - processed);

    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    // Process each file in this batch
    for (const file of filesToProcess) {
      try {
        const content = await fetchFileContent(file.id, file.mimeType, googleToken);
        if (!content) continue;

        const chunks = chunkText(content, file.name);
        const docType = getDocType(file.mimeType);
        const docUrl = getDocUrl(file.id, file.mimeType);
        const ownerEmail = file.owners?.[0]?.emailAddress || null;

        // Generate embeddings in batches
        const allEmbeddings: (number[] | null)[] = [];
        for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
          const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
          const embeddings = await generateEmbeddings(batch, openaiKey);
          allEmbeddings.push(...embeddings);
        }

        // If all embeddings failed, skip this document
        if (allEmbeddings.every((e) => e === null)) {
          console.error(`All embeddings failed for ${file.name}, skipping`);
          continue;
        }

        // Delete existing chunks for this document
        await serviceClient
          .from("document_chunks")
          .delete()
          .eq("user_id", user.id)
          .eq("document_id", file.id);

        // Insert new chunks
        const rows = chunks.map((chunkText, idx) => ({
          user_id: user.id,
          document_id: file.id,
          document_title: file.name,
          document_type: docType,
          document_owner: ownerEmail,
          document_url: docUrl,
          chunk_index: idx,
          chunk_text: chunkText,
          embedding: allEmbeddings[idx] ? JSON.stringify(allEmbeddings[idx]) : null,
          metadata: { source: "google_drive" },
        }));

        const { error: insertError } = await serviceClient
          .from("document_chunks")
          .insert(rows);

        if (insertError) {
          console.error(`Insert error for ${file.name}:`, insertError);
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        continue;
      }
    }

    const status = remaining > 0 ? "in_progress" : "complete";

    return new Response(
      JSON.stringify({ processed, remaining, total, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
