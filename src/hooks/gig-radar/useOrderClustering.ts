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
          customer_name,
          customer_phone,
          delivery_address,
          total_price,
          otp_code,
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
          const { data: sme, error: smeError } = await supabase
            .from("sme_stores")
            .select("latitude, longitude")
            .eq("id", order.sme_id)
            .single();

          if (smeError) {
            console.warn(`[useOrderClustering] SME ${order.sme_id} not found:`, smeError);
          } else if (sme && sme.latitude !== null && sme.longitude !== null) {
            smeLocations.set(order.sme_id, {
              lat: sme.latitude,
              lng: sme.longitude,
            });
          } else {
            console.warn(`[useOrderClustering] SME ${order.sme_id} has no location data`);
          }
        }

        try {
          const { data: geoData } = await supabase
            .rpc("geocode_address", { address: order.delivery_address })
            .single();

          if (geoData && geoData.lat && geoData.lng) {
            deliveryEstimates.set(order.id, {
              lat: geoData.lat,
              lng: geoData.lng,
            });
          } else {
            throw new Error("No geo data");
          }
        } catch {
          deliveryEstimates.set(order.id, {
            lat: riderLoc.lat + (Math.random() - 0.5) * 0.05,
            lng: riderLoc.lng + (Math.random() - 0.5) * 0.05,
          });
        }
      }

      const clustered = clusterOrders(orders, smeLocations, deliveryEstimates);
      console.log(`[useOrderClustering] Clustered into ${clustered.length} batches`);

      for (const batch of clustered) {
        const smeId = batch.pickupSmeId;
        const { data: smeData, error: smeNameError } = await supabase
          .from("sme_stores")
          .select("name")
          .eq("id", smeId)
          .single();

        if (smeNameError) {
          console.warn(`[useOrderClustering] Could not fetch SME name for ${smeId}:`, smeNameError);
        } else if (smeData?.name) {
          batch.pickupSmeName = smeData.name;
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
