import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/**
 * Sign in with Google via Lovable Cloud auth, capturing the provider token
 * from the OAuth broker's postMessage response.
 * 
 * The Lovable Cloud auth bridge only passes through Supabase session tokens,
 * but the OAuth broker may include the Google provider_token in its response.
 * We set up a parallel message listener to capture it.
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  redirected?: boolean;
  error?: Error;
}> {
  // Set up a listener to capture the full OAuth broker response
  // The broker sends: { type: "authorization_response", response: { access_token, refresh_token, state, ...possibly provider_token } }
  let capturedProviderToken: string | null = null;
  let capturedProviderRefreshToken: string | null = null;

  const messageHandler = (e: MessageEvent) => {
    const data = e.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "authorization_response") return;

    const response = data.response;
    console.log("[google-auth] OAuth broker response keys:", response ? Object.keys(response) : "null");

    if (response?.provider_token) {
      capturedProviderToken = response.provider_token;
      console.log("[google-auth] Captured provider_token from broker");
    }
    if (response?.provider_refresh_token) {
      capturedProviderRefreshToken = response.provider_refresh_token;
      console.log("[google-auth] Captured provider_refresh_token from broker");
    }
  };

  window.addEventListener("message", messageHandler);

  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: {
        access_type: "offline",
        prompt: "consent",
        scope: GOOGLE_SCOPES,
      },
    });

    if (result.redirected) {
      return { success: false, redirected: true };
    }

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Sign-in succeeded. Try to store provider tokens if captured.
    console.log("[google-auth] Sign-in succeeded. Provider token captured:", !!capturedProviderToken);

    // Also try getting provider_token from the session (fallback)
    if (!capturedProviderToken) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
          capturedProviderToken = session.provider_token;
          capturedProviderRefreshToken = session.provider_refresh_token || null;
          console.log("[google-auth] Got provider_token from session fallback");
        }
      } catch (e) {
        console.warn("[google-auth] Session fallback failed:", e);
      }
    }

    // Store the provider token if we have one
    if (capturedProviderToken) {
      try {
        const { error } = await supabase.functions.invoke("store-oauth-tokens", {
          body: {
            access_token: capturedProviderToken,
            refresh_token: capturedProviderRefreshToken,
            expires_at: null,
          },
        });
        if (error) {
          console.error("[google-auth] Failed to store OAuth tokens:", error);
        } else {
          console.log("[google-auth] OAuth tokens stored successfully");
        }
      } catch (err) {
        console.error("[google-auth] Error storing tokens:", err);
      }
    } else {
      console.warn("[google-auth] No provider_token available. Google API features won't work until tokens are provided.");
    }

    return { success: true };
  } finally {
    window.removeEventListener("message", messageHandler);
  }
}
