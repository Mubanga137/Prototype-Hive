import { useEffect, useRef } from "react";
import L from "leaflet";
import { createGoldenPulseMarker, updateGoldenPulseMarker, injectGoldenPingAnimation } from "@/utils/createGoldenPulseMarker";

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
}

const BountyMap = ({ workerPosition, bounties, selectedOrderId, onSelectOrder }: BountyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const bountyMarkersRef = useRef<Map<number, L.Marker>>(new Map());

  const center: [number, number] = workerPosition || [-15.4167, 28.2833];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Inject the golden ping animation once
    injectGoldenPingAnimation();

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      zoomControl: true,
      touchAction: "none",
    }).setView(center, 14, { animate: false });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Fix: invalidate size after mount to prevent grey tiles
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      workerMarkerRef.current = null;
      selfMarkerRef.current = null;
      bountyMarkersRef.current.clear();
    };
  }, []);

  // Update worker position with golden pulse marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !workerPosition) return;

    // Update or create golden pulse self marker
    if (!selfMarkerRef.current) {
      selfMarkerRef.current = createGoldenPulseMarker(workerPosition[0], workerPosition[1], map);
    } else {
      selfMarkerRef.current = updateGoldenPulseMarker(selfMarkerRef.current, workerPosition[0], workerPosition[1], map);
    }

    map.flyTo(workerPosition, 14, { animate: true, duration: 0.3 });
  }, [workerPosition]);

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
