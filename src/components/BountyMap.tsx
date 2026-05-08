import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createModernUserMarker, updateModernUserMarker } from "@/utils/modernUserMarker";
import { createAccuracyCircle, updateAccuracyCircle, removeAccuracyCircle } from "@/utils/accuracyCircle";
import { MapPin } from "lucide-react";

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
  const isFollowingRef = useRef(false);
  const initializedRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const center: [number, number] = workerPosition || [0, 0];

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      zoomControl: true,
      touchAction: "none",
      preferCanvas: false,
    }).setView([0, 0], 15, { animate: false });
    mapInstanceRef.current = map;
    initializedRef.current = true;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 200);

    // Disable follow mode on user interaction
    map.on("dragstart", () => {
      isFollowingRef.current = false;
      setIsFollowing(false);
      clearInactivityTimer();
    });

    map.on("zoomstart", () => {
      isFollowingRef.current = false;
      setIsFollowing(false);
      clearInactivityTimer();
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      selfMarkerRef.current = null;
      accuracyCircleRef.current = null;
      bountyMarkersRef.current.clear();
    };
  }, []);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !workerPosition) return;
    isFollowingRef.current = true;
    setIsFollowing(true);
    mapInstanceRef.current.flyTo(workerPosition, 15, { animate: true, duration: 0.8 });
    clearInactivityTimer();
  };

  // Update worker position with modern user marker and accuracy circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !workerPosition) return;

    // Create or update user marker with Google Maps style
    if (!selfMarkerRef.current) {
      selfMarkerRef.current = createModernUserMarker(workerPosition[0], workerPosition[1], map);
    } else {
      selfMarkerRef.current = updateModernUserMarker(selfMarkerRef.current, workerPosition[0], workerPosition[1], map);
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

    // Only follow user position if follow mode is enabled
    if (isFollowingRef.current) {
      map.setView(workerPosition, 15, { animate: true, duration: 0.3 });
    }
  }, [workerPosition, workerAccuracy, locationStatus]);

  // Update bounty markers with distinct styling for gig discovery
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const createBountyIcon = (isSelected: boolean) => {
      return L.divIcon({
        className: "",
        html: `<div style="
          width:${isSelected ? 40 : 32}px;
          height:${isSelected ? 40 : 32}px;
          border-radius:50%;
          background:${isSelected ? '#B37C1C' : '#FFB84D'};
          border:3px solid #FFF8EE;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:${isSelected ? '0 4px 15px rgba(179,124,28,0.7)' : '0 2px 10px rgba(179,124,28,0.5)'};
          font-size:18px;
          transition:all 0.3s ease;
          transform:${isSelected ? 'scale(1.2)' : 'scale(1)'};
        ">⚡</div>`,
        iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
        iconAnchor: [isSelected ? 20 : 16, isSelected ? 20 : 16],
      });
    };

    bountyMarkersRef.current.forEach((m) => map.removeLayer(m));
    bountyMarkersRef.current.clear();

    bounties.forEach((b) => {
      const isSelected = b.id === selectedOrderId;
      const marker = L.marker([b.lat, b.lng], { icon: createBountyIcon(isSelected) })
        .addTo(map)
        .bindPopup(`<div style="font-size:12px;"><strong>Order #${b.id}</strong><br/>ZMW ${b.total_price || 0}<br/><span style="color:#B37C1C;font-weight:600;">⚡ Tap to preview</span></div>`);
      marker.on("click", () => onSelectOrder(b.id));
      bountyMarkersRef.current.set(b.id, marker);
    });
  }, [bounties, selectedOrderId, onSelectOrder]);

  // Highlight selected marker
  useEffect(() => {
    if (selectedOrderId && bountyMarkersRef.current.has(selectedOrderId)) {
      const marker = bountyMarkersRef.current.get(selectedOrderId)!;
      marker.openPopup();
    }
  }, [selectedOrderId]);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        minHeight: 260,
        zIndex: 1,
        position: "relative",
        touchAction: "none",
      }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{
          position: "relative",
          touchAction: "none",
        }}
      />
      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        className={`absolute bottom-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-50 ${
          isFollowing
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
        }`}
        title={isFollowing ? "Following enabled" : "Click to recenter"}
      >
        <MapPin size={20} />
      </button>
    </div>
  );
};

export default BountyMap;
