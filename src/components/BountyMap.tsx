import { useEffect, useRef, useState } from "react";
import { MapRef } from "react-map-gl";
import { MapPin } from "lucide-react";
import MapComponent from "./Map/MapComponent";
import CustomMarker from "./Map/CustomMarker";

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
  locationStatus = "idle",
}: BountyMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const isFollowingRef = useRef(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const center: [number, number] = workerPosition || [-15.3875, 28.3228];

  const handleRecenter = () => {
    if (mapRef.current && workerPosition) {
      isFollowingRef.current = true;
      setIsFollowing(true);
      mapRef.current.flyTo({
        center: [workerPosition[1], workerPosition[0]],
        zoom: 15,
        duration: 800,
      });
    }
  };

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
      <MapComponent
        ref={mapRef}
        initialLat={center[0]}
        initialLng={center[1]}
        initialZoom={15}
      >
        {workerPosition && (
          <CustomMarker
            lat={workerPosition[0]}
            lng={workerPosition[1]}
            isPulsing={locationStatus === "tracking"}
            label={locationStatus === "tracking" ? "📍 You" : "You"}
          />
        )}

        {bounties.map((bounty) => (
          <div
            key={bounty.id}
            onClick={() => onSelectOrder(bounty.id)}
            className="cursor-pointer"
          >
            <CustomMarker
              lat={bounty.lat}
              lng={bounty.lng}
              isPulsing={bounty.id === selectedOrderId}
              label={`⚡ ZMW ${bounty.total_price || 0}`}
            />
          </div>
        ))}
      </MapComponent>

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
