import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Debug: log what's in the session on sign-in
        if (event === "SIGNED_IN") {
          console.log("[AuthContext] SIGNED_IN event fired");
          console.log("[AuthContext] provider_token present:", !!session?.provider_token);
          console.log("[AuthContext] provider_refresh_token present:", !!session?.provider_refresh_token);
          
          // Try from onAuthStateChange session first
          let providerToken = session?.provider_token;
          let providerRefreshToken = session?.provider_refresh_token;
          
          // If not available, try getSession() as fallback
          if (!providerToken) {
            console.log("[AuthContext] No provider_token in event session, trying getSession()...");
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            console.log("[AuthContext] getSession provider_token present:", !!freshSession?.provider_token);
            providerToken = freshSession?.provider_token;
            providerRefreshToken = freshSession?.provider_refresh_token;
          }
          
          if (providerToken) {
            const tokenBody = {
              access_token: providerToken,
              refresh_token: providerRefreshToken || null,
              expires_at: session?.expires_at
                ? new Date(session.expires_at * 1000).toISOString()
                : null,
            };
            supabase.functions.invoke("store-oauth-tokens", {
              body: tokenBody,
            }).then(({ error }) => {
              if (error) {
                console.error("[AuthContext] Failed to store OAuth tokens:", error);
              } else {
                console.log("[AuthContext] OAuth tokens stored successfully");
              }
            }).catch((err) => {
              console.error("[AuthContext] Failed to store OAuth tokens:", err);
            });
          } else {
            console.warn("[AuthContext] No provider_token available after sign-in. Google API features will not work until re-auth.");
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear local session state first
    setUser(null);
    setSession(null);
    
    // Then clear Supabase session (don't await to avoid hanging)
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    
    // Force clear any stored auth tokens
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
