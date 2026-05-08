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
    }).setView([-15.3875, 28.3228], 13, { animate: false });
    mapInstanceRef.current = map;
    initializedRef.current = true;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    // Re-invalidate after a bit more time to ensure proper sizing
    setTimeout(() => {
      map.invalidateSize();
    }, 800);

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
      // Center map on first GPS location
      map.setView(workerPosition, 15, { animate: false });
      isFollowingRef.current = true;
      setIsFollowing(true);
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
    if (isFollowingRef.current && selfMarkerRef.current) {
      map.setView(workerPosition, 15, { animate: true, duration: 0.3 });
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
      style={{
        borderRadius: 16,
        overflow: "hidden",
        minHeight: 260,
        zIndex: 1,
        position: "relative",
        touchAction: "none",
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{
          position: "relative",
          touchAction: "none",
          flex: 1,
          minHeight: 260,
          backgroundColor: "#f5f5f5",
        }}
      />

      {/* Show helper when no location yet */}
      {!workerPosition && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            zIndex: 40,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Waiting for GPS location...</p>
            <p style={{ fontSize: "12px", color: "#999" }}>Make sure location permission is enabled</p>
          </div>
        </div>
      )}

      {/* Recenter button */}
      {workerPosition && (
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
      )}
    </div>
  );
};

export default BountyMap;
