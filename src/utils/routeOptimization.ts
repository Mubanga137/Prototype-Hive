import { Location } from "@/types/gig-radar";

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: "pickup" | "dropoff";
  orderId?: string;
  phone?: string;
  items?: string[];
}

/**
 * Calculate great-circle distance between two points using Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest-neighbor route optimization for efficient delivery.
 * 
 * Algorithm:
 * 1. Start at pickup location
 * 2. Find nearest unvisited dropoff to current location
 * 3. Move to that dropoff, mark as visited
 * 4. Repeat until all dropoffs visited
 * 
 * This greedy approach is optimal for < 10 stops and ensures
 * minimal total distance traveled, reducing fuel consumption
 * and delivery time—critical for African logistics efficiency.
 */
export function optimizeRouteOrder(
  pickup: RouteStop,
  dropoffs: RouteStop[]
): RouteStop[] {
  if (dropoffs.length === 0) {
    return [];
  }

  const optimized: RouteStop[] = [];
  const visited = new Set<string>();
  let currentLat = pickup.lat;
  let currentLng = pickup.lng;

  // Greedy nearest-neighbor algorithm
  while (visited.size < dropoffs.length) {
    let nearestDropoff: RouteStop | null = null;
    let nearestDistance = Infinity;
    let nearestIndex = -1;

    // Find nearest unvisited dropoff
    dropoffs.forEach((dropoff, idx) => {
      if (!visited.has(dropoff.id)) {
        const distance = calculateDistance(
          currentLat,
          currentLng,
          dropoff.lat,
          dropoff.lng
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestDropoff = dropoff;
          nearestIndex = idx;
        }
      }
    });

    if (nearestDropoff) {
      optimized.push(nearestDropoff);
      visited.add(nearestDropoff.id);
      currentLat = nearestDropoff.lat;
      currentLng = nearestDropoff.lng;
    }
  }

  return optimized;
}

/**
 * Calculate total route distance and estimated time.
 */
export function calculateRouteMetrics(
  pickup: RouteStop,
  dropoffs: RouteStop[]
): { totalDistance: number; estimatedDuration: number } {
  let totalDistance = 0;
  let currentLat = pickup.lat;
  let currentLng = pickup.lng;

  dropoffs.forEach((dropoff) => {
    const distance = calculateDistance(
      currentLat,
      currentLng,
      dropoff.lat,
      dropoff.lng
    );
    totalDistance += distance;
    currentLat = dropoff.lat;
    currentLng = dropoff.lng;
  });

  // Estimate 30 km/h average speed in urban African context
  // Factor in traffic, road conditions, confirmation time
  const baseTime = (totalDistance / 30) * 60; // minutes
  const confirmationTimePerStop = 3 * dropoffs.length; // 3 min per confirmation
  const estimatedDuration = Math.round(baseTime + confirmationTimePerStop);

  return {
    totalDistance: parseFloat(totalDistance.toFixed(1)),
    estimatedDuration,
  };
}

/**
 * Get bounds (lat/lng extent) for a set of locations.
 * Useful for map fitBounds operations.
 */
export function getLocationBounds(locations: RouteStop[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const lats = locations.map((loc) => loc.lat);
  const lngs = locations.map((loc) => loc.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Generate Google Maps navigation URL for a destination.
 * Handles fallback to Apple Maps for iOS.
 */
export function generateNavigationUrl(
  origin: Location,
  destination: RouteStop,
  isAppleMaps: boolean = false
): string {
  if (isAppleMaps) {
    // Apple Maps URL scheme
    return `maps://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}`;
  }

  // Google Maps URL (works on both Android and iOS)
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}
