import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase, setupAuthErrorHandling, clearInvalidTokens } from "@/integrations/supabase/client";
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
  order_capacity?: number;
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

  /** Fetch profile by user id with retry logic. Returns the row or null. */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone, role, preferences, zmw_balance, order_capacity")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          lastError = error as Error;
          // Retry on network errors, but not on auth/permission errors
          if (attempt < maxRetries - 1 && error.message.includes("Failed")) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return null;
        }

        return (data as Profile | null) ?? null;
      } catch (err) {
        lastError = err as Error;
        // Retry on network errors
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    console.warn("[fetchProfile] Failed after retries:", lastError?.message);
    return null; // Gracefully return null instead of crashing
  };

  /** Resolve the full chain user → profile → store and commit to state. */
  const resolveSession = useCallback(async (sess: Session | null) => {
    try {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        setProfile(null);
        setCurrentStore(null);
        setLoading(false);
        return;
      }

      // Fetch profile with error handling
      try {
        let prof = await fetchProfile(sess.user.id);

        // CRITICAL FIX: If profile doesn't exist, try to create it from auth metadata
        if (!prof && sess.user) {
          const meta = (sess.user as any).user_metadata || {};
          const fallbackRole = meta.role || "customer";

          // Attempt to create profile from auth metadata
          const { data: created } = await supabase.from("profiles").upsert({
            user_id: sess.user.id,
            full_name: meta.full_name || meta.name || "User",
            phone: meta.phone || "",
            role: fallbackRole,
          }, {
            onConflict: "user_id",
          }).select().maybeSingle();

          if (created) {
            prof = created as Profile;
          }
        }

        setProfile(prof);

        // Only vendors get a store row. Other roles never block on store resolution.
        if (prof?.role === "vendor") {
          try {
            const store = await ensureStore(sess.user);
            setCurrentStore(store);
          } catch (storeError) {
            console.warn("[resolveSession] Error fetching store:", storeError);
            setCurrentStore(null);
          }
        } else {
          setCurrentStore(null);
        }
      } catch (profileError) {
        console.warn("[resolveSession] Error fetching profile:", profileError);
        // Continue with null profile instead of crashing
        setProfile(null);
        setCurrentStore(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("[resolveSession] Unexpected error:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Setup global auth error handling once
    setupAuthErrorHandling();

    // Clear any stale tokens on app startup
    void clearInvalidTokens();

    // Listener first (per Supabase guidance), then initial getSession.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Defer the chained fetches off the auth callback to avoid deadlocks.
      setTimeout(() => { void resolveSession(sess); }, 0);
    });

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session: sess } }) => {
        void resolveSession(sess);
      })
      .catch((error: any) => {
        console.warn("[useAuth] Error getting initial session:", error?.message);

        // If it's a refresh token error, clear tokens and reload
        if (error?.message?.includes("Refresh Token") || error?.message?.includes("Invalid token")) {
          console.warn("[useAuth] Invalid refresh token detected, clearing session...");
          void clearInvalidTokens();
        }

        // Still allow the app to load even if session fetch fails
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [resolveSession]);

  const refreshStore = useCallback(async () => {
    if (!user || profile?.role !== "vendor") return;
    try {
      const store = await ensureStore(user);
      setCurrentStore(store);
    } catch (error) {
      console.warn("[refreshStore] Error:", error);
      // Keep existing store on error
    }
  }, [user, profile?.role]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    } catch (error) {
      console.warn("[refreshProfile] Error:", error);
      // Keep existing profile on error
    }
  }, [user]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[signOut] Error signing out:", error);
    } finally {
      setProfile(null);
      setCurrentStore(null);
    }
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
