import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session — provider_token is only available right after OAuth callback
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.error("Auth callback error:", error);
          navigate("/", { replace: true });
          return;
        }

        // Store provider tokens if available (only present immediately after OAuth sign-in)
        if (session.provider_token) {
          try {
            await supabase.functions.invoke("store-oauth-tokens", {
              body: {
                access_token: session.provider_token,
                refresh_token: session.provider_refresh_token || null,
                expires_at: session.expires_at
                  ? new Date(session.expires_at * 1000).toISOString()
                  : null,
              },
            });
            console.log("OAuth tokens stored successfully");
          } catch (err) {
            console.error("Failed to store OAuth tokens:", err);
          }
        }

        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        navigate("/", { replace: true });
      }
    };

    // Listen for auth state to be ready, then handle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handleCallback();
      }
    });

    // Also try immediately in case session is already set
    handleCallback();

    const timeout = setTimeout(() => navigate("/", { replace: true }), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

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
