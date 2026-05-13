import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createModernUserMarker } from '@/utils/modernUserMarker';
import { MapPin } from 'lucide-react';

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
  locationStatus?: 'locating' | 'tracking' | 'error' | 'idle';
}

const BountyMap = ({
  workerPosition,
  bounties,
  selectedOrderId,
  onSelectOrder,
  workerAccuracy = 50,
  locationStatus = 'idle',
}: BountyMapProps) => {
  const mapRef = useRef<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: workerPosition?.[1] ?? 28.3228,
    latitude: workerPosition?.[0] ?? -15.3875,
    zoom: 15,
  });

  useEffect(() => {
    if (workerPosition && isFollowing) {
      setViewState({
        longitude: workerPosition[1],
        latitude: workerPosition[0],
        zoom: 15,
      });
    }
  }, [workerPosition, isFollowing]);

  const handleRecenter = () => {
    setIsFollowing(true);
    if (workerPosition) {
      setViewState({
        longitude: workerPosition[1],
        latitude: workerPosition[0],
        zoom: 15,
      });
    }
  };

  const handleMapDrag = () => {
    setIsFollowing(false);
  };

  const handleMapZoom = () => {
    setIsFollowing(false);
  };

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 260,
        zIndex: 1,
        position: 'relative',
        touchAction: 'none',
      }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onDrag={handleMapDrag}
        onZoom={handleMapZoom}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          touchAction: 'none',
        }}
        mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4"
        scrollZoom={true}
        dragPan={true}
        touchPitch={true}
      >
        {/* Worker position */}
        {workerPosition && (
          <Marker
            longitude={workerPosition[1]}
            latitude={workerPosition[0]}
            anchor="center"
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Outer white ring */}
              <div
                style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '3px solid #1976D2',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                }}
              />
              {/* Inner blue dot */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#1976D2',
                  boxShadow: '0 0 16px rgba(25, 118, 210, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.3)',
                }}
              />
            </div>
            <Popup offset={[0, -28]}>
              <div style={{ fontSize: '12px' }}>Your location</div>
            </Popup>
          </Marker>
        )}

        {/* Bounty markers */}
        {bounties.map((bounty) => (
          <Marker
            key={bounty.id}
            longitude={bounty.lng}
            latitude={bounty.lat}
            anchor="center"
            onClick={() => onSelectOrder(bounty.id)}
          >
            <div
              onClick={() => onSelectOrder(bounty.id)}
              style={{
                cursor: 'pointer',
                width: selectedOrderId === bounty.id ? '40px' : '32px',
                height: selectedOrderId === bounty.id ? '40px' : '32px',
                borderRadius: '50%',
                background: selectedOrderId === bounty.id ? '#B37C1C' : '#FFB84D',
                border: '3px solid #FFF8EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow:
                  selectedOrderId === bounty.id
                    ? '0 4px 15px rgba(179,124,28,0.7)'
                    : '0 2px 10px rgba(179,124,28,0.5)',
                transform: selectedOrderId === bounty.id ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              ⚡
            </div>
            <Popup offset={[0, -16]}>
              <div style={{ fontSize: '12px' }}>
                <strong>Order #{bounty.id}</strong>
                <br />
                ZMW {bounty.total_price || 0}
                <br />
                <span style={{ color: '#B37C1C', fontWeight: '600' }}>⚡ Tap to preview</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </Map>

      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        className={`absolute bottom-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-50 ${
          isFollowing
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
        }`}
        title={isFollowing ? 'Following enabled' : 'Click to recenter'}
      >
        <MapPin size={20} />
      </button>
    </div>
  );
};

export default BountyMap;
