/**
 * Road snapping using OSRM map matching API.
 * Snaps GPS coordinates to actual roads, preventing off-road movement.
 */

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface OSRMMatchResponse {
  code: string;
  matchings?: Array<{
    geometry: {
      coordinates: Array<[number, number]>;
    };
    confidence: number;
  }>;
  tracepoints?: Array<{
    location?: [number, number];
    matchings?: Array<{ index: number }>;
  } | null>;
}

interface SnappedLocation {
  latitude: number;
  longitude: number;
  confidence: number;
  isSnapped: boolean;
}

const OSRM_API_URL = "https://router.project-osrm.org/match/v1/driving";
const MAX_BATCH_SIZE = 5; // Batch up to 5 points for better accuracy
const BATCH_TIMEOUT_MS = 2000; // Wait up to 2 seconds before sending batch

/**
 * Call OSRM map matching API with batched coordinates.
 * Returns snapped positions on actual roads.
 */
async function callOSRMMapMatching(points: LocationPoint[]): Promise<SnappedLocation[]> {
  if (points.length === 0) {
    return [];
  }

  // Format coordinates for OSRM: lon1,lat1;lon2,lat2;...
  const coordinates = points.map((p) => `${p.longitude},${p.latitude}`).join(";");

  // Add timestamps for better matching
  const timestamps = points.map((p) => Math.floor(p.timestamp / 1000)).join(";");

  const url = `${OSRM_API_URL}/${coordinates}?timestamps=${timestamps}&overview=simplified&geometries=geojson`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[roadSnapping] OSRM API error: ${response.status}`);
      return points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        confidence: 0,
        isSnapped: false,
      }));
    }

    const data: OSRMMatchResponse = await response.json();

    if (data.code !== "Ok" || !data.matchings || data.matchings.length === 0) {
      console.warn("[roadSnapping] OSRM returned no matches, falling back to raw coordinates");
      return points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        confidence: 0,
        isSnapped: false,
      }));
    }

    // Extract snapped points from the first matching
    const matching = data.matchings[0];
    const snappedCoordinates = matching.geometry.coordinates;
    const confidence = matching.confidence;

    // Map tracepoints to snapped coordinates
    if (data.tracepoints) {
      const result: SnappedLocation[] = [];

      data.tracepoints.forEach((tracepoint, index) => {
        if (tracepoint && tracepoint.location) {
          result.push({
            latitude: tracepoint.location[1],
            longitude: tracepoint.location[0],
            confidence: confidence,
            isSnapped: true,
          });
        } else {
          // Fallback to original if no snapped point
          const point = points[index];
          result.push({
            latitude: point.latitude,
            longitude: point.longitude,
            confidence: 0,
            isSnapped: false,
          });
        }
      });

      return result;
    }

    // Fallback: use coordinates from geometry
    return snappedCoordinates.map((coord, index) => ({
      latitude: coord[1],
      longitude: coord[0],
      confidence: confidence,
      isSnapped: true,
    }));
  } catch (error) {
    console.error("[roadSnapping] Map matching request failed:", error);
    // Fallback to raw coordinates on error
    return points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      confidence: 0,
      isSnapped: false,
    }));
  }
}

/**
 * Road Snapper class for batching and throttling map matching requests.
 * Batches up to 5 GPS points for better accuracy and reduces API calls.
 */
export class RoadSnapper {
  private batch: LocationPoint[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private lastSnappedPoint: SnappedLocation | null = null;
  private isProcessing = false;

  /**
   * Add a GPS point to the batch.
   * Triggers API call when batch is full or timeout expires.
   */
  async addPoint(point: LocationPoint): Promise<SnappedLocation | null> {
    this.batch.push(point);

    // If batch is full, process immediately
    if (this.batch.length >= MAX_BATCH_SIZE) {
      return this.processBatch();
    }

    // If batch is not full, schedule processing
    if (this.batchTimer === null) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, BATCH_TIMEOUT_MS);
    }

    // Return last snapped point while waiting for new batch
    return this.lastSnappedPoint;
  }

  /**
   * Process the current batch of points through map matching.
   */
  private async processBatch(): Promise<SnappedLocation | null> {
    if (this.batch.length === 0) {
      return this.lastSnappedPoint || null;
    }

    // Clear the batch timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.isProcessing) {
      return this.lastSnappedPoint;
    }

    this.isProcessing = true;
    const pointsToBatch = [...this.batch];
    this.batch = [];

    try {
      const snappedPoints = await callOSRMMapMatching(pointsToBatch);

      // Use the last snapped point
      if (snappedPoints.length > 0) {
        this.lastSnappedPoint = snappedPoints[snappedPoints.length - 1];
        return this.lastSnappedPoint;
      }
    } finally {
      this.isProcessing = false;
    }

    return this.lastSnappedPoint || null;
  }

  /**
   * Get the last snapped location without waiting.
   */
  getLastSnapped(): SnappedLocation | null {
    return this.lastSnappedPoint;
  }

  /**
   * Force process the current batch immediately.
   */
  async flush(): Promise<SnappedLocation | null> {
    return this.processBatch();
  }

  /**
   * Clear the batch and reset state.
   */
  reset(): void {
    this.batch = [];
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.lastSnappedPoint = null;
    this.isProcessing = false;
  }
}

/**
 * Utility function to snap a single point immediately (without batching).
 * Use for critical updates that can't wait for batching.
 */
export async function snapSinglePoint(point: LocationPoint): Promise<SnappedLocation> {
  const snappedPoints = await callOSRMMapMatching([point]);
  return snappedPoints[0] || {
    latitude: point.latitude,
    longitude: point.longitude,
    confidence: 0,
    isSnapped: false,
  };
}
