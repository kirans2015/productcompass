import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Google access token
    const { data: tokenData, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("access_token")
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Google token not found. Please re-authenticate." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleToken = tokenData.access_token;

    // Fetch calendar events for next 7 days
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: weekFromNow.toISOString(),
      maxResults: "20",
      singleEvents: "true",
      orderBy: "startTime",
    });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${googleToken}` } }
    );

    if (calRes.status === 401) {
      return new Response(JSON.stringify({ error: "Google token expired. Please re-authenticate." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!calRes.ok) {
      console.error("Calendar API error:", await calRes.text());
      return new Response(JSON.stringify({ error: "Failed to fetch calendar events" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calData = await calRes.json();
    const events = calData.items || [];

    const syncedMeetings: any[] = [];

    for (const event of events) {
      // Skip all-day events (no dateTime)
      if (!event.start?.dateTime || !event.end?.dateTime) continue;

      const attendees = (event.attendees || []).map((a: any) => ({
        email: a.email,
        name: a.displayName || null,
        role: a.organizer ? "organizer" : "attendee",
      }));

      // Extract meeting URL
      let meetingUrl = event.hangoutLink || null;
      if (!meetingUrl && event.conferenceData?.entryPoints) {
        const videoEntry = event.conferenceData.entryPoints.find(
          (ep: any) => ep.entryPointType === "video"
        );
        if (videoEntry) meetingUrl = videoEntry.uri;
      }

      const meetingData = {
        user_id: user.id,
        calendar_event_id: event.id,
        title: event.summary || "Untitled Meeting",
        description: event.description || null,
        start_time: event.start.dateTime,
        end_time: event.end.dateTime,
        attendees,
        meeting_url: meetingUrl,
      };

      const { data: upserted, error: upsertError } = await serviceClient
        .from("meetings")
        .upsert(meetingData, {
          onConflict: "user_id,calendar_event_id",
        })
        .select("id, title, start_time, end_time, attendees")
        .single();

      if (upsertError) {
        console.error(`Upsert error for event ${event.id}:`, upsertError);
        continue;
      }

      if (upserted) syncedMeetings.push(upserted);
    }

    return new Response(
      JSON.stringify({ synced: syncedMeetings.length, meetings: syncedMeetings }),
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
