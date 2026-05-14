import { useRef, useState } from "react";
import { haversineDistance, estimateTime } from "@/utils/haversineDistance";

export interface RouteData {
  distance: number;
  duration: number;
  leg1Distance: number;
  leg2Distance: number;
  leg1Duration: number;
  leg2Duration: number;
}

export interface TwoLegRouteParams {
  workerLat: number;
  workerLng: number;
  pickupLat: number;
  pickupLng: number;
  customerLat: number;
  customerLng: number;
  profile: "driving" | "foot";
  onRouteFound?: (data: RouteData) => void;
  onError?: (error: string) => void;
}

const OSRM_API = "https://router.project-osrm.org";

export function useOSRMTwoLegRouting() {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawRoute = async (params: TwoLegRouteParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        workerLat,
        workerLng,
        pickupLat,
        pickupLng,
        customerLat,
        customerLng,
        profile,
        onRouteFound,
        onError,
      } = params;

      const leg1Url = `${OSRM_API}/route/v1/${profile}/${workerLng},${workerLat};${pickupLng},${pickupLat}`;
      const leg1Response = await fetch(leg1Url);
      const leg1Data = await leg1Response.json();

      if (!leg1Data.routes || leg1Data.routes.length === 0) {
        const fallback = {
          distance: haversineDistance(workerLat, workerLng, pickupLat, pickupLng),
          duration: estimateTime(haversineDistance(workerLat, workerLng, pickupLat, pickupLng), profile),
          leg1Distance: haversineDistance(workerLat, workerLng, pickupLat, pickupLng),
          leg2Distance: haversineDistance(pickupLat, pickupLng, customerLat, customerLng),
          leg1Duration: estimateTime(haversineDistance(workerLat, workerLng, pickupLat, pickupLng), profile),
          leg2Duration: estimateTime(haversineDistance(pickupLat, pickupLng, customerLat, customerLng), profile),
        };
        onRouteFound?.(fallback);
        setRouteData(fallback);
        setIsLoading(false);
        return;
      }

      const leg2Url = `${OSRM_API}/route/v1/${profile}/${pickupLng},${pickupLat};${customerLng},${customerLat}`;
      const leg2Response = await fetch(leg2Url);
      const leg2Data = await leg2Response.json();

      if (!leg2Data.routes || leg2Data.routes.length === 0) {
        throw new Error("No route found for leg 2");
      }

      const leg1Route = leg1Data.routes[0];
      const leg2Route = leg2Data.routes[0];

      const routeData: RouteData = {
        distance: (leg1Route.distance + leg2Route.distance) / 1000,
        duration: (leg1Route.duration + leg2Route.duration) / 60,
        leg1Distance: leg1Route.distance / 1000,
        leg2Distance: leg2Route.distance / 1000,
        leg1Duration: leg1Route.duration / 60,
        leg2Duration: leg2Route.duration / 60,
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

  return { routeData, isLoading, error, drawRoute, clearRoute };
}
