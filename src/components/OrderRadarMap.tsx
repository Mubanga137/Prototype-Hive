import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';

interface OrderRadarMapProps {
  orderId: number;
  runnerId?: number | null;
  riderId?: number | null;
  customerLat?: number;
  customerLng?: number;
}

const OrderRadarMap = ({
  orderId,
  runnerId,
  riderId,
  customerLat = -15.4167,
  customerLng = 28.2833,
}: OrderRadarMapProps) => {
  const mapRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [workerPos, setWorkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: customerLng,
    latitude: customerLat,
    zoom: 14,
  });

  const tableName = runnerId ? 'runners' : riderId ? 'riders' : null;
  const workerId = runnerId || riderId;

  useEffect(() => {
    if (!tableName || !workerId) return;

    const fetchInitialPosition = async () => {
      try {
        const { data } = await supabase
          .from(tableName as any)
          .select('latitude, longitude')
          .eq('id', workerId)
          .maybeSingle();

        if (data?.latitude && data?.longitude) {
          setWorkerPos({
            lat: data.latitude,
            lng: data.longitude,
          });
          if (isFollowing && mapRef.current) {
            setViewState({
              longitude: data.longitude,
              latitude: data.latitude,
              zoom: 15,
            });
          }
        }
      } catch (err) {
        console.error('[OrderRadarMap] Fetch error:', err);
      }
    };

    fetchInitialPosition();

    const channel = supabase
      .channel(`rider-track-${orderId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${workerId}`,
        },
        (payload: any) => {
          const { latitude, longitude } = payload.new;
          if (latitude && longitude && isFinite(latitude) && isFinite(longitude)) {
            setWorkerPos({ lat: latitude, lng: longitude });
            if (isFollowing) {
              setViewState((prev) => ({
                ...prev,
                latitude,
                longitude,
              }));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [orderId, tableName, workerId, isFollowing]);

  const handleMapDrag = () => {
    setIsFollowing(false);
  };

  const handleMapZoom = () => {
    setIsFollowing(false);
  };

  const handleRecenter = () => {
    setIsFollowing(true);
    if (workerPos) {
      setViewState({
        longitude: workerPos.lng,
        latitude: workerPos.lat,
        zoom: 15,
      });
    }
  };

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '2px solid hsl(38,73%,40%,0.2)',
        position: 'relative',
        zIndex: 1,
        touchAction: 'none',
      }}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onDrag={handleMapDrag}
        onZoom={handleMapZoom}
        style={{ width: '100%', height: '16rem', position: 'relative' }}
        mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4"
        touchPitch={true}
        dragPan={true}
        doubleClickZoom={true}
      >
        {/* Customer location */}
        <Marker longitude={customerLng} latitude={customerLat} anchor="center">
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#1a1a2e',
              border: '3px solid #FFF8EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            📍
          </div>
          <Popup offset={[0, -14]}>
            <div style={{ fontSize: '12px' }}>Your location</div>
          </Popup>
        </Marker>

        {/* Worker/rider location */}
        {workerPos && (
          <Marker longitude={workerPos.lng} latitude={workerPos.lat} anchor="center">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#B37C1C',
                border: '3px solid #FFF8EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: '0 2px 12px rgba(179,124,28,0.45)',
              }}
            >
              🚴
            </div>
            <Popup offset={[0, -18]}>
              <div style={{ fontSize: '12px' }}>Your rider is here</div>
            </Popup>
          </Marker>
        )}
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

export default OrderRadarMap;
