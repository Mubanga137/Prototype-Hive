import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to verify and fix role mismatches
 * 
 * If a user is logged in but their profile.role doesn't match their auth metadata role,
 * this hook attempts to sync them.
 */
export const useRoleVerification = () => {
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;

    const verifyRole = async () => {
      // Get the auth user's metadata
      const { data } = await supabase.auth.getUser();
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
          console.error("[useRoleVerification] Failed to sync role:", error.message);
          toast.error("Failed to verify account role. Please try logging out and back in.");
          return;
        }

        // Refresh profile to get updated role
        await refreshProfile();
        toast.success("Account role verified and synchronized.");
      }
    };

    verifyRole();
  }, [user, profile, refreshProfile]);
};

export default useRoleVerification;
