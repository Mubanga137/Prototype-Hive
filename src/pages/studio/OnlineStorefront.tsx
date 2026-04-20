// Legacy "Online Storefront" tab — now thin wrapper that routes to the
// canonical Storefront Builder. Kept as a stable redirect so any existing
// links/bookmarks keep working without throwing the old "Store not found".
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2 } from "lucide-react";

const OnlineStorefront = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/retailer-studio/storefront", { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={26} className="animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Opening Storefront Builder…</p>
      </div>
    </DashboardLayout>
  );
};

export default OnlineStorefront;
