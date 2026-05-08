// Haversine distance calculation (same as useHighAccuracyLocation)
const EARTH_RADIUS = 6371000; // meters

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

// Filter gigs by proximity (3-5 km radius)
export function filterGigsByProximity(
  gigs: Array<{ id: number; pickup_lat: number; pickup_lng: number }>,
  agentLat: number,
  agentLng: number,
  radiusMeters: number = 5000
): Array<{ id: number; pickup_lat: number; pickup_lng: number; distance_meters: number }> {
  return gigs
    .map((gig) => ({
      ...gig,
      distance_meters: calculateDistance(
        agentLat,
        agentLng,
        gig.pickup_lat,
        gig.pickup_lng
      ),
    }))
    .filter((gig) => gig.distance_meters <= radiusMeters)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}

// Calculate bearing (direction) to a gig
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = degreesToRadians(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(degreesToRadians(lat2));
  const x =
    Math.cos(degreesToRadians(lat1)) * Math.sin(degreesToRadians(lat2)) -
    Math.sin(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.cos(dLng);
  const bearing = Math.atan2(y, x);
  return (degreesToRadians(bearing) + 360) % 360;
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Estimate time to pickup based on distance
export function estimateMinutesToPickup(distanceMeters: number): number {
  // Assume ~25 km/h average speed in urban area
  const speedMps = 25 / 3.6; // m/s
  return Math.ceil(distanceMeters / speedMps / 60);
}
