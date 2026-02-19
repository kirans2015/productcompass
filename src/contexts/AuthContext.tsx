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
    // Set up listener FIRST (before getSession) per Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state updates only — no awaiting inside this callback
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          console.log("[AuthContext] SIGNED_IN event fired");
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
    // Delete oauth tokens so next sign-in re-triggers consent
    if (user?.id) {
      supabase.from("oauth_tokens").delete().eq("user_id", user.id).then(() => {});
    }

    setUser(null);
    setSession(null);

    supabase.auth.signOut({ scope: 'local' }).catch(() => {});

    // Clear local flags
    localStorage.removeItem("pm-compass-indexed");
    localStorage.removeItem("pm-compass-recent-searches");

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
