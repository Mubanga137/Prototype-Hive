import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase, forceSignOut } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global lock to prevent concurrent role verification calls
let isVerifyingRole = false;
let verifyRoleTimeout: NodeJS.Timeout | null = null;

/**
 * Hook to verify and fix role mismatches
 *
 * If a user is logged in but their profile.role doesn't match their auth metadata role,
 * this hook attempts to sync them.
 *
 * Also handles refresh token errors gracefully.
 *
 * Uses debouncing and locking to prevent concurrent auth calls.
 */
export const useRoleVerification = () => {
  const { user, profile, refreshProfile } = useAuth();
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    if (!user || !profile) {
      hasShownErrorRef.current = false;
      return;
    }

    // Debounce verification to prevent rapid repeated calls
    if (verifyRoleTimeout) {
      clearTimeout(verifyRoleTimeout);
    }

    verifyRoleTimeout = setTimeout(() => {
      const verifyRole = async () => {
        // Skip if already verifying to prevent concurrent lock issues
        if (isVerifyingRole) {
          console.debug("[useRoleVerification] Already verifying, skipping...");
          return;
        }

        isVerifyingRole = true;
        try {
          // Get the auth user's metadata with timeout
          const authPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Auth lock timeout")), 5000)
          );

          let data;
          let authError;
          try {
            data = await Promise.race([authPromise, timeoutPromise]) as any;
          } catch (err: any) {
            authError = err;
          }

          // If we get a lock error, just skip this verification
          if (authError?.message?.includes("Lock") || authError?.message?.includes("timeout")) {
            console.debug("[useRoleVerification] Lock timeout, will retry later");
            return;
          }

          // If we get a refresh token error, handle it
          if (authError) {
            if (
              authError.message?.includes("Refresh Token") ||
              authError.message?.includes("Invalid token")
            ) {
              console.warn("[useRoleVerification] Refresh token error, signing out...");
              await forceSignOut();
              toast.error("Your session has expired. Please log in again.");
              return;
            }
            console.debug("[useRoleVerification] Auth error (non-critical):", authError.message);
            return;
          }

          if (!data?.user) return;

          const authRole = (data.user as any).user_metadata?.role;

          // If auth metadata has a role but profile doesn't match, fix it
          if (authRole && authRole !== profile.role) {
            console.warn(
              `[useRoleVerification] Role mismatch: auth has '${authRole}' but profile has '${profile.role}'. Syncing...`
            );

            // Update the profile to match auth
            const { error } = await supabase
              .from("profiles")
              .update({ role: authRole })
              .eq("user_id", user.id);

            if (error) {
              // Check if it's a token error
              if (
                error.message?.includes("Refresh Token") ||
                error.message?.includes("Invalid token")
              ) {
                console.warn("[useRoleVerification] Token error during update, signing out...");
                await forceSignOut();
                toast.error("Your session has expired. Please log in again.");
                return;
              }

              console.error("[useRoleVerification] Failed to sync role:", error.message);
              toast.error("Failed to verify account role. Please try logging out and back in.");
              return;
            }

            // Refresh profile to get updated role
            await refreshProfile();
            toast.success("Account role verified and synchronized.");
          }
        } catch (error: any) {
          // Catch any unexpected errors, but don't spam the user
          if (
            error?.message?.includes("Refresh Token") ||
            error?.message?.includes("Invalid token")
          ) {
            console.warn("[useRoleVerification] Unexpected token error:", error.message);
            await forceSignOut();
            toast.error("Your session has expired. Please log in again.");
            return;
          }

          if (error?.message?.includes("Lock")) {
            console.debug("[useRoleVerification] Lock conflict, will retry later");
            return;
          }

          // Only show error once to avoid spam
          if (!hasShownErrorRef.current && !error?.message?.includes("fetch")) {
            console.error("[useRoleVerification] Unexpected error:", error);
            hasShownErrorRef.current = true;
          }
        } finally {
          isVerifyingRole = false;
        }
      };

      void verifyRole();
    }, 1000); // Debounce for 1 second

    return () => {
      if (verifyRoleTimeout) {
        clearTimeout(verifyRoleTimeout);
      }
    };
  }, [user, profile, refreshProfile]);
};

export default useRoleVerification;
