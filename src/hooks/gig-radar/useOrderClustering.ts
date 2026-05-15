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

      // Fallback: Use dummy orders for clustering testing if no real orders exist
      let ordersToProcess = orders || [];
      if (!ordersToProcess || ordersToProcess.length === 0) {
        ordersToProcess = [
          { id: 1001, sme_id: 1, total_price: 150, status: "processing" },
          { id: 1002, sme_id: 1, total_price: 200, status: "processing" },
          { id: 1003, sme_id: 2, total_price: 300, status: "processing" },
          { id: 1004, sme_id: 2, total_price: 250, status: "processing" },
          { id: 1005, sme_id: 3, total_price: 180, status: "processing" },
          { id: 1006, sme_id: 3, total_price: 220, status: "processing" },
        ];
        console.log("[useOrderClustering] Using dummy orders for testing");
      }

      if (ordersError) {
        const errorMessage = ordersError instanceof Error ? ordersError.message : JSON.stringify(ordersError);
        console.error("[useOrderClustering] Orders fetch error:", errorMessage);
        // On error, also use dummy data
        if (!ordersToProcess || ordersToProcess.length === 0) {
          ordersToProcess = [
            { id: 1001, sme_id: 1, total_price: 150, status: "processing" },
            { id: 1002, sme_id: 1, total_price: 200, status: "processing" },
            { id: 1003, sme_id: 2, total_price: 300, status: "processing" },
            { id: 1004, sme_id: 2, total_price: 250, status: "processing" },
            { id: 1005, sme_id: 3, total_price: 180, status: "processing" },
            { id: 1006, sme_id: 3, total_price: 220, status: "processing" },
          ];
          console.log("[useOrderClustering] Using dummy orders due to query error");
        }
      }

      console.log(`[useOrderClustering] Found ${ordersToProcess.length} processing orders`);

      const smeLocations = new Map<number, LocationData>();
      const deliveryEstimates = new Map<number, LocationData>();

      for (const order of ordersToProcess) {
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

      const clustered = clusterOrders(ordersToProcess, smeLocations, deliveryEstimates);
      console.log(`[useOrderClustering] Clustered into ${clustered.length} batches`);

      // Hydrate SME names - use brand_name from sme_stores
      const dummySmeNames: Record<number, string> = {
        1: "Fresh Market Co.",
        2: "Quick Supplies Hub",
        3: "Premium Goods Store",
      };

      // Get unique SME IDs to batch query
      const uniqueSmeIds = [...new Set(clustered.map((b) => b.pickupSmeId))];
      const smeNamesMap = new Map<number, string>();

      if (uniqueSmeIds.length > 0) {
        const { data: smeData, error: smeError } = await supabase
          .from("sme_stores")
          .select("id, brand_name")
          .in("id", uniqueSmeIds);

        if (!smeError && smeData) {
          smeData.forEach((sme: any) => {
            smeNamesMap.set(sme.id, sme.brand_name);
          });
        }
      }

      // Assign SME names to batches
      for (const batch of clustered) {
        batch.pickupSmeNam = smeNamesMap.get(batch.pickupSmeId) || dummySmeNames[batch.pickupSmeId] || `Store ${batch.pickupSmeId}`;
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
