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

// Helper to store OAuth tokens — runs outside the auth callback to avoid deadlocks
const storeProviderTokens = (session: Session | null) => {
  if (!session) return;
  
  // Use setTimeout to avoid blocking the onAuthStateChange callback
  setTimeout(async () => {
    try {
      // Try getting provider token from a fresh session
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const providerToken = freshSession?.provider_token;
      const providerRefreshToken = freshSession?.provider_refresh_token;
      
      console.log("[AuthContext] provider_token present:", !!providerToken);

      if (providerToken) {
        const { error } = await supabase.functions.invoke("store-oauth-tokens", {
          body: {
            access_token: providerToken,
            refresh_token: providerRefreshToken || null,
            expires_at: freshSession?.expires_at
              ? new Date(freshSession.expires_at * 1000).toISOString()
              : null,
          },
        });
        if (error) {
          console.error("[AuthContext] Failed to store OAuth tokens:", error);
        } else {
          console.log("[AuthContext] OAuth tokens stored successfully");
        }
      } else {
        console.warn("[AuthContext] No provider_token available. Google API features may not work until re-auth.");
      }
    } catch (err) {
      console.error("[AuthContext] Error storing tokens:", err);
    }
  }, 0);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST (before getSession) per Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state updates only — no awaiting inside this callback
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          console.log("[AuthContext] SIGNED_IN event fired");
          storeProviderTokens(session);
        }
      }
    );

    // Initial session check
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
