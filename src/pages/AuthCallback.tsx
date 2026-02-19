import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a Google OAuth code callback (from the popup)
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && window.opener) {
      // This is the popup receiving the Google auth code
      // Post it back to the parent window
      window.opener.postMessage(
        { type: "google_auth_code", code, state },
        window.location.origin
      );
      // Close this popup after a brief delay
      setTimeout(() => window.close(), 500);
      return;
    }

    // Otherwise, handle normal Supabase auth callback
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
