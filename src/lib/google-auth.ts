import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/**
 * Step 1: Sign in with Google via Lovable Cloud auth (creates Supabase session).
 * Step 2: Open a separate Google OAuth consent popup to get an auth code,
 *         then exchange it server-side for Google API tokens.
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  redirected?: boolean;
  error?: Error;
}> {
  try {
    // Step 1: Lovable Cloud sign-in (Supabase session)
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

    // Auto-trigger Google API token acquisition (second consent popup)
    console.log("[google-auth] Session established. Auto-acquiring Google API tokens...");
    // Don't block sign-in on token acquisition — fire and forget
    acquireGoogleTokens().then((ok) => {
      if (ok) console.log("[google-auth] Google API tokens acquired successfully");
      else console.warn("[google-auth] Google API token acquisition skipped or failed");
    });

    return { success: true };
  } catch (err) {
    console.error("[google-auth] Error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Opens a Google OAuth consent popup to get an authorization code,
 * then sends it to the backend to exchange for Google API tokens.
 * Can be called independently to re-authorize Google API access.
 */
export async function acquireGoogleTokens(): Promise<boolean> {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const state = crypto.randomUUID();

  // Store state for CSRF validation
  sessionStorage.setItem("google_oauth_state", state);

  try {
    // Get the Google OAuth URL from the backend (keeps client_id server-side)
    const { data, error } = await supabase.functions.invoke("get-google-auth-url", {
      body: { redirect_uri: redirectUri, state },
    });

    if (error || !data?.url) {
      console.error("[google-auth] Failed to get auth URL:", error || data);
      return false;
    }

    return new Promise((resolve) => {
      const popup = window.open(
        data.url,
        "google_auth",
        `width=600,height=700,left=${(screen.width - 600) / 2},top=${(screen.height - 700) / 2}`
      );

      if (!popup) {
        console.error("[google-auth] Popup blocked");
        resolve(false);
        return;
      }

      // Listen for the callback page to post the auth code
      const handler = async (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== "google_auth_code") return;

        window.removeEventListener("message", handler);
        clearInterval(pollTimer);

        const { code, state: returnedState } = e.data;
        const savedState = sessionStorage.getItem("google_oauth_state");
        sessionStorage.removeItem("google_oauth_state");

        if (returnedState !== savedState) {
          console.error("[google-auth] State mismatch");
          resolve(false);
          return;
        }

        try {
          const { error } = await supabase.functions.invoke("google-oauth-exchange", {
            body: { code, redirect_uri: redirectUri },
          });

          if (error) {
            console.error("[google-auth] Token exchange failed:", error);
            resolve(false);
          } else {
            console.log("[google-auth] Google API tokens stored successfully");
            resolve(true);
          }
        } catch (err) {
          console.error("[google-auth] Token exchange error:", err);
          resolve(false);
        }
      };

      window.addEventListener("message", handler);

      // Poll for popup closed without completing
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener("message", handler);
          console.warn("[google-auth] Popup closed without completing");
          resolve(false);
        }
      }, 500);
    });
  } catch (err) {
    console.error("[google-auth] Error acquiring tokens:", err);
    return false;
  }
}
