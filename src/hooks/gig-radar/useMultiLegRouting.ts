import { useRef, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import { BatchedOrder } from "@/utils/orderClustering";

export interface MultiLegRouteData {
  totalDistance: number; // km
  totalDuration: number; // minutes
  legs: Array<{
    distance: number;
    duration: number;
  }>;
  waypoints: L.LatLngExpression[];
}

const OSRM_API = "https://router.project-osrm.org";

export function useMultiLegRouting() {
  const [routeData, setRouteData] = useState<MultiLegRouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polylineLayersRef = useRef<L.Polyline[]>([]);

  const clearExistingRoute = (map: L.Map) => {
    polylineLayersRef.current.forEach((line) => {
      try {
        map.removeLayer(line);
      } catch (e) {
        console.warn("Error removing polyline:", e);
      }
    });
    polylineLayersRef.current = [];
  };

  const drawMultiLegRoute = async (
    batch: BatchedOrder,
    riderLat: number,
    riderLng: number,
    map: L.Map,
    onRouteFound?: (data: MultiLegRouteData) => void,
    onError?: (error: string) => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build waypoint sequence: [Rider] → [SME] → [Dropoff 1] → [Dropoff 2] → ...
      const waypoints: Array<[number, number]> = [[riderLng, riderLat]];

      if (batch.pickupLoc) {
        waypoints.push([batch.pickupLoc.lng, batch.pickupLoc.lat]);
      }

      batch.dropoffs.forEach((dropoff) => {
        waypoints.push([dropoff.loc.lng, dropoff.loc.lat]);
      });

      if (waypoints.length < 2) {
        throw new Error("Insufficient waypoints for routing");
      }

      // Call OSRM with full geometry
      const waypointStr = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
      const url = `${OSRM_API}/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("No route found from OSRM");
      }

      const route = data.routes[0];

      // Clear existing
      clearExistingRoute(map);

      // Draw main polyline (Navy→Gold gradient)
      if (route.geometry.coordinates) {
        const coords = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [
          lat,
          lng,
        ] as [number, number]);

        // Rider→SME in Navy
        const smeIdx = batch.pickupLoc ? 1 : 0;
        if (smeIdx > 0 && coords.length > smeIdx) {
          const leg1Coords = coords.slice(0, smeIdx + 1);
          const leg1 = L.polyline(leg1Coords, {
            color: "#0F1A35", // Navy
            weight: 5,
            opacity: 0.8,
            dashArray: "5, 5",
          }).addTo(map);
          polylineLayersRef.current.push(leg1);
        }

        // SME→Dropoffs in Gold
        if (smeIdx < coords.length - 1) {
          const leg2Coords = coords.slice(smeIdx);
          const leg2 = L.polyline(leg2Coords, {
            color: "#B37C1C", // Gold
            weight: 5,
            opacity: 0.9,
          }).addTo(map);
          polylineLayersRef.current.push(leg2);
        }
      }

      // Add markers
      // Blue pickup marker
      if (batch.pickupLoc) {
        const pickupMarker = L.marker([batch.pickupLoc.lat, batch.pickupLoc.lng], {
          icon: L.icon({
            iconUrl:
              "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzBGMUEzNSIvPjwvc3ZnPg==",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map);
      }

      // Numbered gold dropoff markers
      batch.dropoffs.forEach((dropoff, idx) => {
        const markerHtml = `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #B37C1C;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${idx + 1}</div>
        `;

        const marker = L.marker([dropoff.loc.lat, dropoff.loc.lng], {
          icon: L.divIcon({
            html: markerHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        })
          .bindPopup(`<div style="font-size:12px;"><strong>${dropoff.customer}</strong><br/>${dropoff.phone}</div>`)
          .addTo(map);
      });

      // Calculate route stats
      const totalDist = route.distance / 1000; // km
      const totalDur = Math.ceil(route.duration / 60); // minutes

      const legs = [
        { distance: totalDist * 0.3, duration: Math.ceil(totalDur * 0.3) }, // Estimate: 30% to pickup
        { distance: totalDist * 0.7, duration: Math.ceil(totalDur * 0.7) }, // 70% for dropoffs
      ];

      const routeData: MultiLegRouteData = {
        totalDistance: totalDist,
        totalDuration: totalDur,
        legs,
        waypoints: waypoints.map(([lng, lat]) => [lat, lng] as L.LatLngExpression),
      };

      setRouteData(routeData);
      onRouteFound?.(routeData);

      // Fit bounds
      const allCoords = waypoints.map(([lng, lat]) => [lat, lng]);
      const bounds = L.latLngBounds(allCoords as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [100, 100] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      onError?.(message);
      console.error("[useMultiLegRouting]", message);
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
    drawMultiLegRoute,
    clearRoute,
    routeData,
    isLoading,
    error,
  };
}
