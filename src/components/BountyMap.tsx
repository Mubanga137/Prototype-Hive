import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createGoldenPulseMarker, updateGoldenPulseMarker, injectGoldenPingAnimation } from "@/utils/createGoldenPulseMarker";
import { createAccuracyCircle, updateAccuracyCircle, removeAccuracyCircle } from "@/utils/accuracyCircle";

export interface BountyOrder {
  id: number;
  lat: number;
  lng: number;
  total_price: number | null;
  status: string | null;
}

interface BountyMapProps {
  workerPosition: [number, number] | null;
  bounties: BountyOrder[];
  selectedOrderId: number | null;
  onSelectOrder: (id: number) => void;
  workerAccuracy?: number;
  locationStatus?: "locating" | "tracking" | "error" | "idle";
}

const BountyMap = ({
  workerPosition,
  bounties,
  selectedOrderId,
  onSelectOrder,
  workerAccuracy = 50,
  locationStatus = "idle"
}: BountyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const bountyMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const isFollowingRef = useRef(true);
  const [isMapDragging, setIsMapDragging] = useState(false);

  const center: [number, number] = workerPosition || [-15.4167, 28.2833];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    injectGoldenPingAnimation();

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      zoomControl: true,
      touchAction: "none",
    }).setView(center, 16, { animate: false });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 200);

    // Detect manual map dragging to disable follow mode
    map.on("dragstart", () => {
      isFollowingRef.current = false;
      setIsMapDragging(true);
    });

    // Re-enable follow mode after dragging stops
    map.on("dragend", () => {
      setIsMapDragging(false);
      // Resume following after a short delay
      setTimeout(() => {
        isFollowingRef.current = true;
      }, 300);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      selfMarkerRef.current = null;
      accuracyCircleRef.current = null;
      bountyMarkersRef.current.clear();
    };
  }, []);

  // Update worker position with golden pulse marker and accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !workerPosition) return;

    // Create or update user marker
    if (!selfMarkerRef.current) {
      selfMarkerRef.current = createGoldenPulseMarker(workerPosition[0], workerPosition[1], map);
    } else {
      selfMarkerRef.current = updateGoldenPulseMarker(selfMarkerRef.current, workerPosition[0], workerPosition[1], map);
    }

    // Update accuracy circle (only if we have valid accuracy data and are tracking)
    if (locationStatus === "tracking" && workerAccuracy > 0) {
      accuracyCircleRef.current = updateAccuracyCircle(
        accuracyCircleRef.current,
        workerPosition[0],
        workerPosition[1],
        workerAccuracy,
        map
      );
    } else {
      removeAccuracyCircle(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }

    // Follow user position if in follow mode
    if (isFollowingRef.current) {
      map.flyTo(workerPosition, 16, { animate: true, duration: 0.5 });
    }
  }, [workerPosition, workerAccuracy, locationStatus]);

  // Update bounty markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bountyIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;border-radius:50%;background:#B37C1C;border:2px solid #FFF8EE;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(179,124,28,0.5);font-size:16px;">⚡</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    bountyMarkersRef.current.forEach((m) => map.removeLayer(m));
    bountyMarkersRef.current.clear();

    bounties.forEach((b) => {
      const marker = L.marker([b.lat, b.lng], { icon: bountyIcon })
        .addTo(map)
        .bindPopup(`<div style="font-size:12px;"><strong>Order #${b.id}</strong><br/>ZMW ${b.total_price || 0}<br/><span style="color:#B37C1C;font-weight:600;">⚡ Tap to claim</span></div>`);
      marker.on("click", () => onSelectOrder(b.id));
      bountyMarkersRef.current.set(b.id, marker);
    });
  }, [bounties, onSelectOrder]);

  // Highlight selected marker
  useEffect(() => {
    if (selectedOrderId && bountyMarkersRef.current.has(selectedOrderId)) {
      const marker = bountyMarkersRef.current.get(selectedOrderId)!;
      marker.openPopup();
    }
  }, [selectedOrderId]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        minHeight: 260,
        zIndex: 1,
        position: "relative",
        touchAction: "none",
      }}
    />
  );
};

export default BountyMap;
