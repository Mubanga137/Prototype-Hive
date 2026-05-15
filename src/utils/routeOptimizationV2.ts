// Haversine distance formula (meters)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface LocationCoord {
  lat: number;
  lng: number;
}

interface PickupStop extends LocationCoord {
  id: string;
}

interface DropoffStop extends LocationCoord {
  id: string;
  orderId?: string;
}

/**
 * Optimizes a route using nearest-neighbor algorithm (String of Pearls)
 * Returns coordinate sequence: driver -> closest pickup -> dropoffs in order
 * Result is ready for Mapbox Directions API
 */
export function optimizeRoutePath(
  driverCoords: LocationCoord,
  pickupsArray: PickupStop[],
  dropoffsArray: DropoffStop[]
): [number, number][] {
  // Start with driver location
  const result: [number, number][] = [[driverCoords.lng, driverCoords.lat]];

  if (pickupsArray.length === 0) {
    // No pickups, just dropoffs from driver
    if (dropoffsArray.length === 0) return result;
    return optimizeDropoffSequence(driverCoords, dropoffsArray);
  }

  // Find closest pickup to driver
  let closestPickupIdx = 0;
  let minDistance = haversineDistance(
    driverCoords.lat,
    driverCoords.lng,
    pickupsArray[0].lat,
    pickupsArray[0].lng
  );

  for (let i = 1; i < pickupsArray.length; i++) {
    const dist = haversineDistance(
      driverCoords.lat,
      driverCoords.lng,
      pickupsArray[i].lat,
      pickupsArray[i].lng
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestPickupIdx = i;
    }
  }

  const selectedPickup = pickupsArray[closestPickupIdx];
  result.push([selectedPickup.lng, selectedPickup.lat]);

  // Optimize dropoffs from pickup location
  const optimizedDropoffs = optimizeDropoffSequence(selectedPickup, dropoffsArray);
  // Skip the first element since it's the pickup location we already added
  result.push(...optimizedDropoffs.slice(1));

  return result;
}

/**
 * Nearest-neighbor dropoff sequence optimization
 * Starts from given location and visits closest unvisited dropoff
 */
function optimizeDropoffSequence(
  startCoords: LocationCoord,
  dropoffs: DropoffStop[]
): [number, number][] {
  if (dropoffs.length === 0) {
    return [[startCoords.lng, startCoords.lat]];
  }

  const result: [number, number][] = [[startCoords.lng, startCoords.lat]];
  const remaining = [...dropoffs];
  let currentCoords = startCoords;

  while (remaining.length > 0) {
    let closestIdx = 0;
    let minDistance = haversineDistance(
      currentCoords.lat,
      currentCoords.lng,
      remaining[0].lat,
      remaining[0].lng
    );

    for (let i = 1; i < remaining.length; i++) {
      const dist = haversineDistance(
        currentCoords.lat,
        currentCoords.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    const closest = remaining.splice(closestIdx, 1)[0];
    result.push([closest.lng, closest.lat]);
    currentCoords = closest;
  }

  return result;
}

/**
 * Format coordinates for Mapbox Directions API
 * Input: [[lng, lat], [lng, lat], ...] 
 * Output: "lng,lat;lng,lat;..."
 */
export function formatCoordinatesForMapbox(coords: [number, number][]): string {
  return coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
}

export default {
  optimizeRoutePath,
  formatCoordinatesForMapbox,
};
