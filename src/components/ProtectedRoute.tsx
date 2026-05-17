import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowGuests?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, allowGuests = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // If guests are allowed, skip all checks
    if (allowGuests) {
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
  }, [user, profile, loading, allowedRoles, allowGuests, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!allowGuests && !user) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
