import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { exchangeGoogleCode } from "@/lib/google-auth";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Case 1: This is a popup receiving a Google auth code — post back to parent
    if (code && window.opener) {
      window.opener.postMessage(
        { type: "google_auth_code", code, state },
        window.location.origin
      );
      setTimeout(() => window.close(), 500);
      return;
    }

    // Case 2: Full-page redirect from Google consent (token acquisition)
    if (code && state && !window.opener) {
      const handleTokenExchange = async () => {
        try {
          const success = await exchangeGoogleCode(code, state);
          if (success) {
            console.log("[AuthCallback] Google tokens exchanged, redirecting to dashboard");
          } else {
            console.warn("[AuthCallback] Token exchange failed");
          }
        } catch (err) {
          console.error("[AuthCallback] Token exchange error:", err);
        }
        navigate("/dashboard", { replace: true });
      };
      handleTokenExchange();
      return;
    }

    // Case 3: Normal Supabase auth callback
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.error("Auth callback error:", error);
          navigate("/", { replace: true });
          return;
        }
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        navigate("/", { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handleCallback();
      }
    });

    handleCallback();

    const timeout = setTimeout(() => navigate("/", { replace: true }), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-secondary-bg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
