import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase, forceSignOut } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to verify and fix role mismatches
 *
 * If a user is logged in but their profile.role doesn't match their auth metadata role,
 * this hook attempts to sync them.
 *
 * Also handles refresh token errors gracefully.
 */
export const useRoleVerification = () => {
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    const verifyRole = async () => {
      try {
        // Get the auth user's metadata
        const { data, error: authError } = await supabase.auth.getUser();

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
          console.warn("[useRoleVerification] Auth error:", authError.message);
          return;
        }

        if (!data.user) return;

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
        // Catch any unexpected errors
        if (
          error?.message?.includes("Refresh Token") ||
          error?.message?.includes("Invalid token")
        ) {
          console.warn("[useRoleVerification] Unexpected token error:", error.message);
          await forceSignOut();
          toast.error("Your session has expired. Please log in again.");
          return;
        }

        console.error("[useRoleVerification] Unexpected error:", error);
      }
    };

    verifyRole();
  }, [user, profile, refreshProfile]);
};

export default useRoleVerification;
