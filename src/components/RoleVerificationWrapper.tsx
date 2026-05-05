import { useRoleVerification } from "@/hooks/useRoleVerification";

/**
 * Wrapper component that runs role verification on app load
 * Ensures profile.role matches auth metadata role
 */
export const RoleVerificationWrapper = () => {
  useRoleVerification();
  return null; // This component only runs the hook, doesn't render anything
};

export default RoleVerificationWrapper;
