import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowGuests?: boolean;
  allowGuestTokens?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, allowGuests = false, allowGuestTokens = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check guest tokens directly from localStorage (no state race condition)
  const checkGuestTokens = () => {
    try {
      const stored = localStorage.getItem("hive_guest_active_cart");
      const tokens = stored ? JSON.parse(stored) : [];
      return Array.isArray(tokens) && tokens.length > 0;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (loading) return;

    // If guests are allowed, skip all checks
    if (allowGuests) {
      return;
    }

    // Special handling for routes that allow guest tokens
    if (allowGuestTokens && checkGuestTokens()) {
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      const routes: Record<string, string> = {
        customer: "/",
        vendor: "/retailer-studio",
        wholesaler: "/warehouse",
        gig_worker: "/gig-radar",
      };
      navigate(routes[profile.role] || "/", { replace: true });
    }
  }, [user, profile, loading, allowedRoles, allowGuests, allowGuestTokens, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Allow rendering if: user exists OR guests are allowed OR guest tokens exist and are allowed
  if (!user && !allowGuests && (!allowGuestTokens || !checkGuestTokens())) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
