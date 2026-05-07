import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";

interface DestinationMapProps {
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  deliveryAddress?: string | null;
  orderId?: number | null;
}

const goldMarkerIcon = new L.Icon({
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 48'%3E%3Cpath fill='%23D4A574' d='M16 0C7.16 0 0 7.16 0 16c0 9.6 16 32 16 32s16-22.4 16-32c0-8.84-7.16-16-16-16z'/%3E%3Ccircle cx='16' cy='14' r='5' fill='%23fff'/%3E%3C/svg%3E",
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
});

const DestinationMap = ({
  dropoffLat,
  dropoffLng,
  deliveryAddress,
  orderId,
}: DestinationMapProps) => {
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
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{
          height: "100%",
          width: "100%",
          zIndex: 10,
        }}
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />
        <Marker position={[lat, lng]} icon={goldMarkerIcon}>
          <Popup>
            <div className="text-xs max-w-xs">
              {orderId && <p className="font-semibold">Order #{orderId}</p>}
              {deliveryAddress && <p className="text-gray-700 mb-1">{deliveryAddress}</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default DestinationMap;
