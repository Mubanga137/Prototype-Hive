import { useEffect, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface DestinationMapProps {
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  deliveryAddress?: string | null;
  orderId?: number | null;
}

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
        <p style={{ color: '#666' }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ zIndex: 10 }}>
      <Map
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 16,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4"
        dragging={true}
        touchPitch={true}
        dragPan={true}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div
            style={{
              width: '32px',
              height: '48px',
              background: '#D4A574',
              borderRadius: '50% 50% 50% 0',
              border: '2px solid #FFF8EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(212, 165, 116, 0.3)',
              transform: 'rotate(-45deg)',
            }}
          >
            📍
          </div>
          <Popup
            offset={[0, -48]}
            maxWidth={220}
            className="rounded-lg"
            style={{
              backgroundColor: '#FFFBF2',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div className="text-xs max-w-xs p-2">
              {orderId && <p className="font-semibold">Order #{orderId}</p>}
              {deliveryAddress && <p className="text-gray-700 mb-1">{deliveryAddress}</p>}
            </div>
          </Popup>
        </Marker>
      </Map>
    </div>
  );
};

export default DestinationMap;
