// Subscribes the signed-in SME owner to new-order notifications and
// surfaces them as a toast inside the retailer studio.
// Mount once at the studio shell level (e.g. inside DashboardLayout or
// directly in RetailerStudioDashboard).

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useOrderNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    // Resolve which stores belong to this SME (owner)
    const setup = async () => {
      const { data: stores } = await supabase
        .from("sme_stores")
        .select("id")
        .eq("owner_user_id", user.id);
      if (cancelled) return;
      const storeIds = (stores ?? []).map((s: any) => s.id);
      if (storeIds.length === 0) return;

      const channel = supabase
        .channel("sme-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sme_notifications",
            filter: `store_id=in.(${storeIds.join(",")})`,
          },
          (payload) => {
            const n = payload.new as { title?: string; body?: string };
            toast.success(n.title || "New order", {
              description: n.body,
              duration: 6000,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setup();
    return () => {
      cancelled = true;
      cleanupPromise.then((fn) => fn?.());
    };
  }, [user?.id]);
};
