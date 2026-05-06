import { supabase } from "./client";

/**
 * Handle Supabase auth errors gracefully.
 * When refresh token is invalid or missing, clear the session
 * and allow the user to re-authenticate.
 */
export const setupAuthErrorInterceptor = () => {
  // Listen for auth errors
  supabase.auth.onAuthStateChange(async (event, session) => {
    // If there's no session but we expected one, user needs to re-login
    if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
      // Clear any stale data
      localStorage.removeItem("sb-auth-token");
    }
  });

  // Wrap common Supabase calls to catch refresh token errors
  const originalFrom = supabase.from.bind(supabase);
  
  supabase.from = function(table: string) {
    const query = originalFrom(table);
    
    // Wrap the main query methods
    const wrapPromise = async <T>(promise: Promise<T>): Promise<T> => {
      try {
        return await promise;
      } catch (error: any) {
        // Handle refresh token errors
        if (
          error?.message?.includes("Refresh Token") ||
          error?.message?.includes("Invalid token") ||
          error?.status === 401
        ) {
          console.warn("[Supabase] Refresh token invalid, clearing session...");
          
          // Clear the invalid session
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (signoutError) {
            console.error("[Supabase] Error during signout:", signoutError);
          }

          // Clear localStorage
          localStorage.removeItem("sb-auth-token");
          localStorage.removeItem("sb-refresh-token");
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login?session_expired=true";
          }

          // Re-throw with a user-friendly message
          const err = new Error("Your session has expired. Please log in again.");
          (err as any).code = "SESSION_EXPIRED";
          throw err;
        }

        throw error;
      }
    };

    return {
      ...query,
      select: function(columns: string) {
        const innerQuery = query.select(columns);
        return {
          ...innerQuery,
          then: function(onFulfilled: any, onRejected: any) {
            return wrapPromise(innerQuery as any).then(onFulfilled, onRejected);
          },
          eq: function(column: string, value: any) {
            const eqQuery = innerQuery.eq(column, value);
            return {
              ...eqQuery,
              then: function(onFulfilled: any, onRejected: any) {
                return wrapPromise(eqQuery as any).then(onFulfilled, onRejected);
              },
              single: function() {
                return wrapPromise((eqQuery.single() as any));
              },
              maybeSingle: function() {
                return wrapPromise((eqQuery.maybeSingle() as any));
              },
            } as any;
          },
          maybeSingle: function() {
            return wrapPromise((innerQuery.maybeSingle() as any));
          },
          single: function() {
            return wrapPromise((innerQuery.single() as any));
          },
        } as any;
      },
      update: function(values: any) {
        const updateQuery = query.update(values);
        return {
          ...updateQuery,
          eq: function(column: string, value: any) {
            const eqQuery = updateQuery.eq(column, value);
            return {
              ...eqQuery,
              then: function(onFulfilled: any, onRejected: any) {
                return wrapPromise(eqQuery as any).then(onFulfilled, onRejected);
              },
            } as any;
          },
        } as any;
      },
    } as any;
  };
};

/**
 * Clear stale auth tokens from localStorage.
 * Call this on app startup to clean up any invalid sessions.
 */
export const clearStaleTokens = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        const value = localStorage.getItem(key);
        // Only remove if it looks like an invalid/empty token
        if (!value || value === "null" || value === "undefined") {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn("[clearStaleTokens] Error:", error);
  }
};

/**
 * Handle the specific case of missing refresh tokens.
 * This function should be called when the app detects a 401 error.
 */
export const handleMissingRefreshToken = async () => {
  console.warn("[handleMissingRefreshToken] Clearing invalid session...");

  try {
    // Attempt to sign out
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("[handleMissingRefreshToken] Signout error:", error);
  }

  // Clear all auth-related storage
  try {
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("sb-refresh-token");
    
    // Clear all Supabase-related keys
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("[handleMissingRefreshToken] Storage error:", error);
  }

  // Redirect to login
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login?reason=session_expired";
  }
};
