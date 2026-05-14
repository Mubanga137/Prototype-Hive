import { useRef, useState } from "react";
import { BatchedOrder } from "@/utils/orderClustering";

export interface MultiLegRouteData {
  totalDistance: number;
  totalDuration: number;
  legs: Array<{
    distance: number;
    duration: number;
  }>;
  waypoints: Array<[number, number]>;
}

const OSRM_API = "https://router.project-osrm.org";

export function useMultiLegRouting() {
  const [routeData, setRouteData] = useState<MultiLegRouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawMultiLegRoute = async (
    batch: BatchedOrder,
    riderLat: number,
    riderLng: number,
    onRouteFound?: (data: MultiLegRouteData) => void,
    onError?: (error: string) => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const waypoints: Array<[number, number]> = [[riderLng, riderLat]];

      if (batch.pickupLoc) {
        waypoints.push([batch.pickupLoc.lng, batch.pickupLoc.lat]);
      }

      batch.destinationLocs.forEach((dest) => {
        waypoints.push([dest.lng, dest.lat]);
      });

      const waypointStr = waypoints.map((w) => w[0] + "," + w[1]).join(";");
      const url = `${OSRM_API}/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("OSRM request failed");

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error("No route found");
      }

      const route = data.routes[0];
      const legs = data.routes[0].legs || [];

      const routeData: MultiLegRouteData = {
        totalDistance: route.distance / 1000,
        totalDuration: route.duration / 60,
        legs: legs.map((leg: any) => ({
          distance: leg.distance / 1000,
          duration: leg.duration / 60,
        })),
        waypoints,
      };

      setRouteData(routeData);
      onRouteFound?.(routeData);
      setIsLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }
  };

  const clearRoute = () => {
    setRouteData(null);
  };

  return { routeData, isLoading, error, drawMultiLegRoute, clearRoute };
}
