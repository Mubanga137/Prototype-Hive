import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { ensureStore, type StoreRow } from "@/lib/ensureStore";
import hiveLogo from "@/assets/hive-logo.jpeg";

type AppRole = "customer" | "vendor" | "wholesaler" | "gig_worker";

interface Profile {
  full_name: string;
  phone: string;
  role: AppRole;
  preferences?: string[];
  zmw_balance?: number;
  pulse_credits?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** The vendor's sme_stores row — only resolved when profile.role === 'vendor'. */
  currentStore: StoreRow | null;
  /** True until the entire user→profile→store chain has resolved. */
  loading: boolean;
  /** Re-fetch the store row (call after autosave or launch). */
  refreshStore: () => Promise<void>;
  /** Re-fetch the profile (call after pulse_credits / balance changes). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  currentStore: null,
  loading: true,
  refreshStore: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Full-screen splash shown while the auth → profile → store chain resolves. */
const WorkspaceSplash = () => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-5">
      <img
        src={hiveLogo}
        alt="The Hive"
        className="w-16 h-16 rounded-full object-cover border-2 border-primary/40 shadow-lg"
      />
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <p className="text-sm font-medium text-foreground tracking-wide">
          Loading Workspace…
        </p>
      </div>
      <div className="h-1 w-40 rounded-full bg-secondary overflow-hidden">
        <div className="h-full w-1/3 bg-primary animate-[slide_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
    <style>{`
      @keyframes slide {
        0%   { transform: translateX(-120%); }
        100% { transform: translateX(420%); }
      }
    `}</style>
  </div>
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentStore, setCurrentStore] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch profile by user id. Returns the row or null. */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, role, preferences, zmw_balance, pulse_credits")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Profile | null) ?? null;
  };

  /** Resolve the full chain user → profile → store and commit to state. */
  const resolveSession = useCallback(async (sess: Session | null) => {
    setSession(sess);
    setUser(sess?.user ?? null);

    if (!sess?.user) {
      setProfile(null);
      setCurrentStore(null);
      setLoading(false);
      return;
    }

    const prof = await fetchProfile(sess.user.id);
    setProfile(prof);

    // Only vendors get a store row. Other roles never block on store resolution.
    if (prof?.role === "vendor") {
      const store = await ensureStore(sess.user);
      setCurrentStore(store);
    } else {
      setCurrentStore(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Listener first (per Supabase guidance), then initial getSession.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Defer the chained fetches off the auth callback to avoid deadlocks.
      setTimeout(() => { void resolveSession(sess); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      void resolveSession(sess);
    });

    return () => subscription.unsubscribe();
  }, [resolveSession]);

  const refreshStore = useCallback(async () => {
    if (!user || profile?.role !== "vendor") return;
    const store = await ensureStore(user);
    setCurrentStore(store);
  }, [user, profile?.role]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchProfile(user.id);
    setProfile(prof);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentStore(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        currentStore,
        loading,
        refreshStore,
        refreshProfile,
        signOut,
      }}
    >
      {loading ? <WorkspaceSplash /> : children}
    </AuthContext.Provider>
  );
};
