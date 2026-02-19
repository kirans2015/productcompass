import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/**
 * Sign in with Google via Lovable Cloud auth (creates Supabase session).
 * After session is established, redirects to Google consent for API tokens
 * (Drive, Calendar) as a full-page redirect — no popup.
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  redirected?: boolean;
  error?: Error;
}> {
  try {
    // Mark that we need to acquire Google API tokens after auth completes
    sessionStorage.setItem("google_tokens_pending", "true");

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
      sessionStorage.removeItem("google_tokens_pending");
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    sessionStorage.removeItem("google_tokens_pending");
    console.error("[google-auth] Error:", err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Redirects the user to Google consent to get an authorization code.
 * The callback page (AuthCallback) handles the exchange.
 * Uses full-page redirect instead of a popup.
 */
export async function startGoogleTokenRedirect(): Promise<void> {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const state = crypto.randomUUID();

  sessionStorage.setItem("google_oauth_state", state);

  const { data, error } = await supabase.functions.invoke("get-google-auth-url", {
    body: { redirect_uri: redirectUri, state },
  });

  if (error || !data?.url) {
    console.error("[google-auth] Failed to get auth URL:", error || data);
    throw new Error("Failed to get Google auth URL");
  }

  // Full-page redirect — feels like one continuous flow
  window.location.href = data.url;
}

/**
 * Called from AuthCallback after receiving the Google auth code via redirect.
 * Exchanges the code for tokens on the backend.
 */
export async function exchangeGoogleCode(code: string, state: string): Promise<boolean> {
  const savedState = sessionStorage.getItem("google_oauth_state");
  sessionStorage.removeItem("google_oauth_state");

  if (state !== savedState) {
    console.error("[google-auth] State mismatch");
    return false;
  }

  const redirectUri = `${window.location.origin}/auth/callback`;

  try {
    const { error } = await supabase.functions.invoke("google-oauth-exchange", {
      body: { code, redirect_uri: redirectUri },
    });

    if (error) {
      console.error("[google-auth] Token exchange failed:", error);
      return false;
    }

    console.log("[google-auth] Google API tokens stored successfully");
    return true;
  } catch (err) {
    console.error("[google-auth] Token exchange error:", err);
    return false;
  }
}

/**
 * Opens a Google OAuth consent popup (fallback for re-auth from Settings/Dashboard).
 */
export async function acquireGoogleTokensPopup(): Promise<boolean> {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const state = crypto.randomUUID();
  sessionStorage.setItem("google_oauth_state", state);

  try {
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

      const handler = async (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== "google_auth_code") return;

        window.removeEventListener("message", handler);
        clearInterval(pollTimer);

        const result = await exchangeGoogleCode(e.data.code, e.data.state);
        resolve(result);
      };

      window.addEventListener("message", handler);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener("message", handler);
          resolve(false);
        }
      }, 500);
    });
  } catch (err) {
    console.error("[google-auth] Error acquiring tokens:", err);
    return false;
  }
}
