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

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        setBatches([]);
        return;
      }

      const smeLocations = new Map<number, LocationData>();
      const deliveryEstimates = new Map<number, LocationData>();

      for (const order of orders) {
        if (order.sme_id && !smeLocations.has(order.sme_id)) {
          const { data: sme } = await supabase
            .from("sme_stores")
            .select("latitude, longitude")
            .eq("id", order.sme_id)
            .single();

          if (sme && sme.latitude !== null && sme.longitude !== null) {
            smeLocations.set(order.sme_id, {
              lat: sme.latitude,
              lng: sme.longitude,
            });
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

      for (const batch of clustered) {
        const smeId = batch.pickupSmeId;
        const { data: smeData } = await supabase
          .from("sme_stores")
          .select("name")
          .eq("id", smeId)
          .single();

        if (smeData?.name) {
          batch.pickupSmeNam = smeData.name;
        }
      }

      setBatches(clustered);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cluster orders";
      setError(message);
      console.error("[useOrderClustering]", message);
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
