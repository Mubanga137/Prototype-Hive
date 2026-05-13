import { useState } from 'react';
import { haversineDistance, estimateTime } from '@/utils/haversineDistance';

export interface RouteData {
  distance: number;
  duration: number;
  leg1Distance: number;
  leg2Distance: number;
  leg1Duration: number;
  leg2Duration: number;
  geometry?: GeoJSON.Geometry;
}

export interface TwoLegRouteParams {
  workerLat: number;
  workerLng: number;
  pickupLat: number;
  pickupLng: number;
  customerLat: number;
  customerLng: number;
  profile: 'driving' | 'foot';
  onRouteFound?: (data: RouteData) => void;
  onError?: (error: string) => void;
}

const OSRM_API = 'https://router.project-osrm.org';

export function useOSRMTwoLegRouting() {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOSRMRoute = async (
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    profile: 'driving' | 'foot'
  ) => {
    const profilePath = profile === 'foot' ? 'foot' : 'driving';
    const url = `${OSRM_API}/route/v1/${profilePath}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found from OSRM');
      }

      const route = data.routes[0];
      return {
        distance: route.distance / 1000,
        duration: Math.ceil(route.duration / 60),
        geometry: route.geometry,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OSRM request failed';
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
      onRouteFound,
      onError,
    } = params;

    setIsLoading(true);
    setError(null);

    try {
      const leg1 = await fetchOSRMRoute(
        workerLng,
        workerLat,
        pickupLng,
        pickupLat,
        profile
      );

      const leg2 = await fetchOSRMRoute(
        pickupLng,
        pickupLat,
        customerLng,
        customerLat,
        profile
      );

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
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onError?.(message);
      console.error('[useOSRMTwoLegRouting] Error:', message);

      const leg1Dist = haversineDistance(
        workerLat,
        workerLng,
        pickupLat,
        pickupLng
      );
      const leg2Dist = haversineDistance(
        pickupLat,
        pickupLng,
        customerLat,
        customerLng
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

  const clearRoute = () => {
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
