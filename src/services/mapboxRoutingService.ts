const MAPBOX_TOKEN = 'pk.eyJ1IjoidGhlLWhpdmUiLCJhIjoiY21wNXdidmV5MDFlYzJwc2wydzZ1NXoyYSJ9.ImuunrlyiRHMEfwO8TaQnQ';
const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteResponse {
  routes: Array<{
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
    legs: Array<{
      distance: number;
      duration: number;
    }>;
    distance: number;
    duration: number;
  }>;
  code: string;
}

export interface RouteMetrics {
  distance: string;
  eta: string;
  coordinates: [number, number][];
}

async function getRoute(
  riderLng: number,
  riderLat: number,
  dropoffLng: number,
  dropoffLat: number
): Promise<RouteMetrics | null> {
  try {
    const url = `${MAPBOX_DIRECTIONS_API}/${riderLng},${riderLat};${dropoffLng},${dropoffLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: RouteResponse = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    const distanceKm = (distanceMeters / 1000).toFixed(1);
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const eta = `${durationMinutes} min`;

    return {
      distance: `${distanceKm} km`,
      eta,
      coordinates: route.geometry.coordinates,
    };
  } catch (error) {
    console.error('Failed to fetch route from Mapbox:', error);
    return null;
  }
}

export const mapboxRoutingService = {
  getRoute,
};
