import { useEffect, useRef, useState } from "react";
import { MapRef } from "react-map-gl";
import { MapPin } from "lucide-react";
import MapComponent from "./Map/MapComponent";
import CustomMarker from "./Map/CustomMarker";

interface DestinationMapProps {
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  deliveryAddress?: string | null;
  orderId?: number | null;
}

const DestinationMap = ({ dropoffLat, dropoffLng, deliveryAddress, orderId }: DestinationMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const lat = dropoffLat ?? -15.3875;
  const lng = dropoffLng ?? 28.3228;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center">
        <p style={{ color: "#666" }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ zIndex: 10 }}>
      <MapComponent
        ref={mapRef}
        initialLat={lat}
        initialLng={lng}
        initialZoom={16}
      >
        <CustomMarker lng={lng} lat={lat} label={`📍 Order #${orderId}`} />
      </MapComponent>

      {deliveryAddress && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg max-w-xs z-40">
          <p className="text-xs font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={14} />
            Delivery Address
          </p>
          <p className="text-xs text-gray-700 mt-1">{deliveryAddress}</p>
        </div>
      )}
    </div>
  );
};

export default DestinationMap;
