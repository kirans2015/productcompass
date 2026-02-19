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

    // Step 2: Get Google API tokens via separate OAuth flow
    console.log("[google-auth] Session established. Starting Google API token flow...");
    await acquireGoogleTokens();

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
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn("[google-auth] No VITE_GOOGLE_CLIENT_ID configured, skipping token acquisition");
    return false;
  }

  const redirectUri = `${window.location.origin}/auth/callback`;
  const state = crypto.randomUUID();

  // Store state for CSRF validation
  sessionStorage.setItem("google_oauth_state", state);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return new Promise((resolve) => {
    const popup = window.open(
      authUrl.toString(),
      "google_auth",
      `width=${600},height=${700},left=${(screen.width - 600) / 2},top=${(screen.height - 700) / 2}`
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
}
