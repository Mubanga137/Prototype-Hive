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
  const [hasGuestTokens, setHasGuestTokens] = useState(false);

  // Check for guest tokens in localStorage on mount
  useEffect(() => {
    if (allowGuestTokens) {
      try {
        const stored = localStorage.getItem("hive_guest_active_cart");
        const tokens = stored ? JSON.parse(stored) : [];
        setHasGuestTokens(Array.isArray(tokens) && tokens.length > 0);
      } catch (e) {
        setHasGuestTokens(false);
      }
    }
  }, [allowGuestTokens]);

  useEffect(() => {
    if (loading) return;

    // If guests are allowed, skip all checks
    if (allowGuests) {
      return;
    }

    // Special handling for routes that allow guest tokens
    if (allowGuestTokens && hasGuestTokens) {
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
  }, [user, profile, loading, allowedRoles, allowGuests, allowGuestTokens, hasGuestTokens, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Allow rendering if: user exists OR guests are allowed OR guest tokens exist and are allowed
  if (!user && !allowGuests && (!allowGuestTokens || !hasGuestTokens)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
