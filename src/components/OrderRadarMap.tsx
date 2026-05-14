import { useEffect, useRef, useState } from "react";
import { MapRef } from "react-map-gl";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import MapComponent from "./Map/MapComponent";
import CustomMarker from "./Map/CustomMarker";

interface OrderRadarMapProps {
  orderId: number;
  runnerId?: number | null;
  riderId?: number | null;
  customerLat?: number;
  customerLng?: number;
}

const OrderRadarMap = ({ orderId, runnerId, riderId, customerLat, customerLng }: OrderRadarMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const channelRef = useRef<any>(null);
  const isFollowingRef = useRef(true);
  const [isFollowing, setIsFollowing] = useState(true);

  const tableName = runnerId ? "runners" : riderId ? "riders" : null;
  const workerId = runnerId || riderId;

  const handleRecenter = () => {
    if (mapRef.current && workerLocation) {
      isFollowingRef.current = true;
      setIsFollowing(true);
      mapRef.current.flyTo({
        center: [workerLocation.lng, workerLocation.lat],
        zoom: 15,
        duration: 800,
      });
    }
  };

  useEffect(() => {
    if (!tableName || !workerId) return;

    // Fetch initial location
    (async () => {
      const { data } = await supabase
        .from(tableName as any)
        .select("latitude, longitude")
        .eq("id", workerId)
        .maybeSingle();

      if (data && (data as any).latitude && (data as any).longitude) {
        setWorkerLocation({
          lat: (data as any).latitude,
          lng: (data as any).longitude,
        });
      }
    })();

    // Subscribe to realtime updates
    channelRef.current = supabase
      .channel(`rider-track-${orderId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: tableName, filter: `id=eq.${workerId}` },
        (payload: any) => {
          const { latitude, longitude } = payload.new;
          if (latitude && longitude && isFinite(latitude) && isFinite(longitude)) {
            setWorkerLocation({ lat: latitude, lng: longitude });

            // Only pan to position if follow mode is enabled
            if (isFollowingRef.current && mapRef.current) {
              mapRef.current.easeTo({
                center: [longitude, latitude],
                duration: 300,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [orderId, tableName, workerId]);

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "2px solid hsl(38,73%,40%,0.2)",
        position: "relative",
        zIndex: 1,
        touchAction: "none",
      }}
    >
      <div className="w-full h-64 md:h-80 relative">
        <MapComponent
          ref={mapRef}
          initialLat={customerLat || -15.4167}
          initialLng={customerLng || 28.2833}
          initialZoom={14}
        >
          {customerLat && customerLng && <CustomMarker lng={customerLng} lat={customerLat} label="📍 You" />}
          {workerLocation && <CustomMarker lng={workerLocation.lng} lat={workerLocation.lat} isPulsing={true} label="🚴 Rider" />}
        </MapComponent>
      </div>

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

export default OrderRadarMap;
