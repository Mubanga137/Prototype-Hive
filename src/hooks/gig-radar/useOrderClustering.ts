import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clusterOrders, BatchedOrder, LocationData } from "@/utils/orderClustering";
import { toast } from "sonner";

export function useOrderClustering() {
  const [batches, setBatches] = useState<BatchedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndClusterOrders = useCallback(async (riderLoc: { lat: number; lng: number }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          sme_id,
          total_price,
          status
        `
        )
        .eq("status", "processing");

      if (ordersError) {
        const errorMessage = ordersError instanceof Error ? ordersError.message : JSON.stringify(ordersError);
        console.error("[useOrderClustering] Orders fetch error:", errorMessage);
        throw new Error(errorMessage);
      }
      if (!orders || orders.length === 0) {
        console.log("[useOrderClustering] No processing orders found");
        setBatches([]);
        return;
      }

      console.log(`[useOrderClustering] Found ${orders.length} processing orders`);

      const smeLocations = new Map<number, LocationData>();
      const deliveryEstimates = new Map<number, LocationData>();

      for (const order of orders) {
        if (order.sme_id && !smeLocations.has(order.sme_id)) {
          // Use delivery estimate offset from rider as SME pickup location proxy
          // In production, SME locations would come from a separate stores table with actual coordinates
          smeLocations.set(order.sme_id, {
            lat: riderLoc.lat + (Math.random() - 0.5) * 0.01,
            lng: riderLoc.lng + (Math.random() - 0.5) * 0.01,
          });
        }

        deliveryEstimates.set(order.id, {
          lat: riderLoc.lat + (Math.random() - 0.5) * 0.05,
          lng: riderLoc.lng + (Math.random() - 0.5) * 0.05,
        });
      }

      const clustered = clusterOrders(orders, smeLocations, deliveryEstimates);
      console.log(`[useOrderClustering] Clustered into ${clustered.length} batches`);

      // Hydrate SME names - use brand_name from sme_stores
      for (const batch of clustered) {
        const smeId = batch.pickupSmeId;
        const { data: smeData, error: smeNameError } = await supabase
          .from("sme_stores")
          .select("brand_name")
          .eq("id", smeId)
          .maybeSingle();

        if (!smeNameError && smeData?.brand_name) {
          batch.pickupSmeNam = smeData.brand_name;
        }
      }

      console.log("[useOrderClustering] Successfully clustered and hydrated batches");
      setBatches(clustered);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cluster orders";
      setError(message);
      console.error("[useOrderClustering] Error:", err);
      toast.error(`Clustering failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    batches,
    isLoading,
    error,
    fetchAndClusterOrders,
  };
}
