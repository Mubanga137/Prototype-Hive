import { useRef, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import { haversineDistance, estimateTime } from "@/utils/haversineDistance";

export interface RouteData {
  distance: number; // km
  duration: number; // minutes
  leg1Distance: number; // Worker to Pickup
  leg2Distance: number; // Pickup to Customer
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
  profile: "driving" | "foot"; // OSRM profile
  map: L.Map;
  onRouteFound?: (data: RouteData) => void;
  onError?: (error: string) => void;
}

const OSRM_API = "https://router.project-osrm.org";

export function useOSRMTwoLegRouting() {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const routeControlRef = useRef<any>(null);
  const polylineLayersRef = useRef<L.Polyline[]>([]);

  const clearExistingRoute = (map: L.Map) => {
    // Remove any existing route control
    if (routeControlRef.current) {
      try {
        routeControlRef.current.remove();
      } catch (e) {
        console.warn("Error removing route control:", e);
      }
      routeControlRef.current = null;
    }

    // Remove polylines
    polylineLayersRef.current.forEach((line) => {
      try {
        map.removeLayer(line);
      } catch (e) {
        console.warn("Error removing polyline:", e);
      }
    });
    polylineLayersRef.current = [];
  };

  const fetchOSRMRoute = async (
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    profile: "driving" | "foot"
  ) => {
    const profilePath = profile === "foot" ? "foot" : "driving";
    const url = `${OSRM_API}/route/v1/${profilePath}/${startLng},${startLat};${endLng},${endLat}?overview=full`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("No route found from OSRM");
      }

      const route = data.routes[0];
      return {
        distance: route.distance / 1000, // Convert to km
        duration: Math.ceil(route.duration / 60), // Convert to minutes
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "OSRM request failed";
      throw new Error(`OSRM routing error: ${message}`);
    }
  };

  const drawRoute = async (params: TwoLegRouteParams) => {
    const {
      workerLat,
      workerLng,
      pickupLat,
      pickupLng,
      customerLat,
      customerLng,
      profile,
      map,
      onRouteFound,
      onError,
    } = params;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch leg 1: Worker → Pickup
      const leg1 = await fetchOSRMRoute(
        workerLng,
        workerLat,
        pickupLng,
        pickupLat,
        profile
      );

      // Fetch leg 2: Pickup → Customer
      const leg2 = await fetchOSRMRoute(
        pickupLng,
        pickupLat,
        customerLng,
        customerLat,
        profile
      );

      // Clear existing route
      clearExistingRoute(map);

      // Fetch full geometry for both legs for polyline rendering
      const leg1Response = await fetch(
        `${OSRM_API}/route/v1/${profile === "foot" ? "foot" : "driving"}/${workerLng},${workerLat};${pickupLng},${pickupLat}?overview=full&geometries=geojson`
      );
      const leg1Data = await leg1Response.json();

      const leg2Response = await fetch(
        `${OSRM_API}/route/v1/${profile === "foot" ? "foot" : "driving"}/${pickupLng},${pickupLat};${customerLng},${customerLat}?overview=full&geometries=geojson`
      );
      const leg2Data = await leg2Response.json();

      // Draw Leg 1 (Navy Blue) - Worker to Pickup
      if (leg1Data.routes[0].geometry.coordinates) {
        const leg1Coords = leg1Data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        const leg1Polyline = L.polyline(leg1Coords, {
          color: "#0F1A35", // Navy Blue
          weight: 5,
          opacity: 0.8,
          dashArray: "5, 5",
        }).addTo(map);
        polylineLayersRef.current.push(leg1Polyline);
      }

      // Draw Leg 2 (Gold) - Pickup to Customer
      if (leg2Data.routes[0].geometry.coordinates) {
        const leg2Coords = leg2Data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        const leg2Polyline = L.polyline(leg2Coords, {
          color: "#B37C1C", // Gold
          weight: 5,
          opacity: 0.9,
        }).addTo(map);
        polylineLayersRef.current.push(leg2Polyline);
      }

      // Calculate bounds to fit the entire journey
      const allCoords: L.LatLngExpression[] = [
        [workerLat, workerLng],
        [pickupLat, pickupLng],
        [customerLat, customerLng],
      ];
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [100, 100] });

      const totalDistance = leg1.distance + leg2.distance;
      const totalDuration = leg1.duration + leg2.duration;

      const routeData: RouteData = {
        distance: totalDistance,
        duration: totalDuration,
        leg1Distance: leg1.distance,
        leg2Distance: leg2.distance,
        leg1Duration: leg1.duration,
        leg2Duration: leg2.duration,
      };

      setRouteData(routeData);
      onRouteFound?.(routeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      onError?.(message);
      console.error("[useOSRMTwoLegRouting] Error:", message);

      // Fallback to Haversine
      const leg1Dist = haversineDistance(
        params.workerLat,
        params.workerLng,
        params.pickupLat,
        params.pickupLng
      );
      const leg2Dist = haversineDistance(
        params.pickupLat,
        params.pickupLng,
        params.customerLat,
        params.customerLng
      );

      const fallbackData: RouteData = {
        distance: leg1Dist + leg2Dist,
        duration: estimateTime(leg1Dist + leg2Dist),
        leg1Distance: leg1Dist,
        leg2Distance: leg2Dist,
        leg1Duration: estimateTime(leg1Dist),
        leg2Duration: estimateTime(leg2Dist),
      };

      setRouteData(fallbackData);
      onRouteFound?.(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  const clearRoute = (map: L.Map) => {
    clearExistingRoute(map);
    setRouteData(null);
    setError(null);
  };

  return {
    drawRoute,
    clearRoute,
    routeData,
    isLoading,
    error,
  };
}
