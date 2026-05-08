import { useEffect, useState } from "react";

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  eta: string;
}

interface OSRM_Route {
  distance: number;
  duration: number;
}

const OSRM_API = "https://router.project-osrm.org/route/v1/driving";

export function useGigRouting(
  agentLat: number | null,
  agentLng: number | null,
  targetLat: number | null,
  targetLng: number | null,
  enabled: boolean = true
) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      agentLat === null ||
      agentLng === null ||
      targetLat === null ||
      targetLng === null
    ) {
      setRoute(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${OSRM_API}/${agentLng},${agentLat};${targetLng},${targetLat}?overview=false`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }

        const route: OSRM_Route = data.routes[0];
        const durationMinutes = Math.ceil(route.duration / 60);
        
        // Calculate ETA (current time + duration)
        const now = new Date();
        const etaTime = new Date(now.getTime() + route.duration * 1000);
        const etaStr = etaTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        setRoute({
          distance: route.distance,
          duration: route.duration,
          eta: `${durationMinutes}min (${etaStr})`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch route";
        setError(message);
        console.error("[useGigRouting]", message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [agentLat, agentLng, targetLat, targetLng, enabled]);

  return { route, loading, error };
}

// Format distance for display
export function formatRouteDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Generate Google Maps navigation URL
export function getGoogleMapsDirectionUrl(
  agentLat: number,
  agentLng: number,
  destLat: number,
  destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${agentLat},${agentLng}&destination=${destLat},${destLng}`;
}
