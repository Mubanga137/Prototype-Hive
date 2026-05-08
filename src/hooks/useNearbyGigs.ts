import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { filterGigsByProximity } from "@/utils/gigUtils";

export interface NearbyGig {
  id: number;
  title: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  payout: number;
  distance_estimate: string;
  distance_meters: number;
  status: string;
  created_at: string;
}

interface UseNearbyGigsProps {
  agentLat: number | null;
  agentLng: number | null;
  radiusMeters?: number;
  refreshIntervalMs?: number;
}

export function useNearbyGigs({
  agentLat,
  agentLng,
  radiusMeters = 5000,
  refreshIntervalMs = 15000, // Refresh every 15 seconds
}: UseNearbyGigsProps) {
  const [gigs, setGigs] = useState<NearbyGig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGigs = async () => {
    if (!agentLat || !agentLng) {
      setGigs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all pending gigs (real database call when available)
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          total_price as payout,
          status,
          created_at,
          delivery_address
          `
        )
        .is("runner_id", null)
        .eq("status", "pending")
        .limit(100);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // For now, generate mock gigs with nearby locations
      // TODO: Replace with real pickup_lat, pickup_lng, dropoff_lat, dropoff_lng from DB
      const mockGigs: NearbyGig[] = (data || []).map((order: any) => ({
        id: order.id,
        title: `Delivery #${order.id}`,
        pickup_lat: agentLat + (Math.sin(order.id * 1.7) * 0.015),
        pickup_lng: agentLng + (Math.cos(order.id * 2.3) * 0.015),
        dropoff_lat: agentLat + (Math.sin(order.id * 2.1) * 0.025),
        dropoff_lng: agentLng + (Math.cos(order.id * 1.9) * 0.025),
        payout: order.payout || 0,
        distance_estimate: "0.0 km",
        distance_meters: 0,
        status: order.status,
        created_at: order.created_at,
      }));

      // Filter by proximity
      const nearby = filterGigsByProximity(
        mockGigs,
        agentLat,
        agentLng,
        radiusMeters
      );

      // Update distance_estimate display
      const gigsWithFormatted = nearby.map((gig) => ({
        ...gig,
        distance_estimate: `${(gig.distance_meters / 1000).toFixed(1)} km`,
      }));

      setGigs(gigsWithFormatted);
    } catch (err) {
      console.error("[useNearbyGigs] Error fetching gigs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch gigs");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchGigs();
  }, [agentLat, agentLng]);

  // Set up periodic refresh
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchGigs();
    }, refreshIntervalMs);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [agentLat, agentLng, radiusMeters, refreshIntervalMs]);

  // Set up real-time subscription for new gigs
  useEffect(() => {
    if (!agentLat || !agentLng) return;

    subscriptionRef.current = supabase
      .channel("nearby-gigs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: 'status=eq.pending',
        },
        (payload: any) => {
          // Refetch when new pending gigs appear
          fetchGigs();
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [agentLat, agentLng]);

  return {
    gigs,
    loading,
    error,
    refetch: fetchGigs,
  };
}
