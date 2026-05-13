import { useState } from 'react';
import { BatchedOrder } from '@/utils/orderClustering';

export interface MultiLegRouteData {
  totalDistance: number;
  totalDuration: number;
  legs: Array<{
    distance: number;
    duration: number;
  }>;
  waypoints: Array<[number, number]>;
  geometry?: GeoJSON.Geometry;
}

const OSRM_API = 'https://router.project-osrm.org';

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

      batch.dropoffs.forEach((dropoff) => {
        waypoints.push([dropoff.loc.lng, dropoff.loc.lat]);
      });

      if (waypoints.length < 2) {
        throw new Error('Insufficient waypoints for routing');
      }

      const waypointStr = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
      const url = `${OSRM_API}/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found from OSRM');
      }

      const route = data.routes[0];
      const totalDist = route.distance / 1000;
      const totalDur = Math.ceil(route.duration / 60);

      const legs = [
        { distance: totalDist * 0.3, duration: Math.ceil(totalDur * 0.3) },
        { distance: totalDist * 0.7, duration: Math.ceil(totalDur * 0.7) },
      ];

      const routeData: MultiLegRouteData = {
        totalDistance: totalDist,
        totalDuration: totalDur,
        legs,
        waypoints: waypoints.map(([lng, lat]) => [lat, lng]),
        geometry: route.geometry,
      };

      setRouteData(routeData);
      onRouteFound?.(routeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onError?.(message);
      console.error('[useMultiLegRouting]', message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearRoute = () => {
    setRouteData(null);
    setError(null);
  };

  return {
    drawMultiLegRoute,
    clearRoute,
    routeData,
    isLoading,
    error,
  };
}
