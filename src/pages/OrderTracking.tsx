import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion } from 'framer-motion';
import { Phone, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import GPSOffModal from '@/components/modals/GPSOffModal';

type Order = Database['public']['Tables']['orders']['Row'];
type Runner = Database['public']['Tables']['runners']['Row'];
type HiveNode = Database['public']['Tables']['hive_nodes']['Row'];

interface OrderWithDetails extends Order {
  node?: HiveNode | null;
  runner?: Runner | null;
}

interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: 28.3228,
    latitude: -15.3875,
    zoom: 14,
  });
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);

  const mapRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const isFollowingRef = useRef(true);

  const { coordinates, isLoading: locationLoading, isPermissionDenied, requestLocation } = useLocationPermission();

  // Fetch order details on mount
  useEffect(() => {
    if (!order_id) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(
            `
            id,
            runner_id,
            node_id,
            status,
            created_at
          `
          )
          .eq('id', parseInt(order_id))
          .single();

        if (error) throw error;
        if (!data) {
          toast.error('Order not found');
          setLoading(false);
          return;
        }

        const { data: nodeData } = await supabase
          .from('hive_nodes')
          .select('*')
          .eq('id', data.node_id)
          .single();

        let runnerData = null;
        if (data.runner_id) {
          const { data: rData } = await supabase
            .from('runners')
            .select('*')
            .eq('id', data.runner_id)
            .single();
          runnerData = rData;
        }

        const orderWithDetails: OrderWithDetails = {
          ...data,
          node: nodeData,
          runner: runnerData,
        };

        setOrder(orderWithDetails);

        if (runnerData?.current_lat && runnerData?.current_long) {
          setRiderLocation({
            lat: runnerData.current_lat,
            long: runnerData.current_long,
          });
          setViewState((prev) => ({
            ...prev,
            latitude: runnerData.current_lat,
            longitude: runnerData.current_long,
          }));
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        toast.error('Failed to load order details');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [order_id]);

  // Subscribe to runner location updates
  useEffect(() => {
    if (!order?.runner_id) return;

    const channel = supabase
      .channel(`runner-tracking-${order.runner_id}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'runners',
          filter: `id=eq.${order.runner_id}`,
        },
        (payload: any) => {
          const { current_lat, current_long } = payload.new;
          if (current_lat && current_long) {
            setRiderLocation({
              lat: current_lat,
              long: current_long,
            });
            if (isFollowingRef.current) {
              setViewState((prev) => ({
                ...prev,
                latitude: current_lat,
                longitude: current_long,
              }));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.runner_id]);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (isPermissionDenied) {
      setShowGPSModal(true);
    }
  }, [isPermissionDenied]);

  // Fetch route when rider or delivery location changes
  useEffect(() => {
    if (!riderLocation || !order?.node) return;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${riderLocation.long},${riderLocation.lat};${order.node!.long},${order.node!.lat}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Route fetch failed');

        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('No route found');
        }

        const route = data.routes[0];
        setRouteGeometry(route.geometry);

        const totalTime = Math.ceil(route.duration / 60);
        const totalDistance = (route.distance / 1000).toFixed(1);

        setEta(`⏱️ Arriving in ${totalTime} min${totalTime !== 1 ? 's' : ''}`);
        setDistance(`Distance: ${totalDistance} km`);
      } catch (err) {
        console.error('[OrderTracking] Route fetch error:', err);
      }
    };

    fetchRoute();
  }, [riderLocation, order?.node]);

  const handleRecenter = () => {
    if (!riderLocation) return;
    isFollowingRef.current = true;
    setIsFollowing(true);
    setViewState({
      longitude: riderLocation.long,
      latitude: riderLocation.lat,
      zoom: 15,
    });
  };

  const handleMapDrag = () => {
    isFollowingRef.current = false;
    setIsFollowing(false);
  };

  const handleMapZoom = () => {
    isFollowingRef.current = false;
    setIsFollowing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order || !order.node) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-foreground font-semibold mb-2">Order not found</p>
          <p className="text-muted-foreground">Unable to load tracking information</p>
        </div>
      </div>
    );
  }

  const runnerPhone = order.runner?.id ? `+26${order.runner.id}` : null;

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
      <GPSOffModal isOpen={showGPSModal} onClose={() => setShowGPSModal(false)} />

      <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onDrag={handleMapDrag}
          onZoom={handleMapZoom}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
          mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4"
          touchPitch={true}
          dragPan={true}
          doubleClickZoom={true}
        >
          <NavigationControl position="top-right" />

          {/* Route geometry layer */}
          {routeGeometry && (
            <Source id="route-source" type="geojson" data={{ type: 'Feature', geometry: routeGeometry, properties: {} }}>
              <Layer
                id="route-layer"
                type="line"
                paint={{
                  'line-color': '#B37C1C',
                  'line-width': 4,
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}

          {/* Rider marker */}
          {riderLocation && (
            <Marker longitude={riderLocation.long} latitude={riderLocation.lat} anchor="center">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#1a1a2e',
                  border: '3px solid #FFFBF2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 12px rgba(26,26,46,0.5)',
                }}
              >
                🛵
              </div>
            </Marker>
          )}

          {/* Delivery location marker */}
          {order.node && (
            <Marker longitude={order.node.long} latitude={order.node.lat} anchor="center">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#B37C1C',
                  border: '3px solid #FFFBF2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 12px rgba(179,124,28,0.5)',
                }}
              >
                🏠
              </div>
            </Marker>
          )}

          {/* Customer location marker */}
          {coordinates && (
            <Marker longitude={coordinates.longitude} latitude={coordinates.latitude} anchor="center">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#D4A574',
                  border: '3px solid #FFFBF2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  boxShadow: '0 0 0 8px rgba(212,165,116,0.25), 0 0 0 12px rgba(212,165,116,0.15)',
                  animation: 'pulse 2s infinite',
                }}
              >
                📍
              </div>
            </Marker>
          )}
        </Map>

        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-50 ${
            isFollowing ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
          title={isFollowing ? 'Following enabled' : 'Click to recenter'}
        >
          <MapPin size={20} />
        </button>
      </div>

      {/* Floating HUD Card */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
        <div className="max-w-md mx-auto backdrop-blur-md rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl">
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Tracking</p>
            <p className="text-sm font-bold text-foreground mt-1">
              Order #{String(order.id).padStart(6, '0')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {eta && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20">
                <Clock size={14} className="text-gold flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">{eta}</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20">
                <MapPin size={14} className="text-gold flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">{distance}</span>
              </div>
            )}
          </div>

          {runnerPhone && (
            <a
              href={`tel:${runnerPhone}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: '#B37C1C',
                color: '#FFFBF2',
                boxShadow: '0 4px 12px rgba(179, 124, 28, 0.3)',
              }}
            >
              <Phone size={16} />
              💬 Call Runner
            </a>
          )}

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Delivering To</p>
            <p className="text-sm font-semibold text-foreground">{order.node.node_name || 'Delivery Node'}</p>
            {order.node.location_description && (
              <p className="text-xs text-muted-foreground mt-1">{order.node.location_description}</p>
            )}
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(212, 165, 116, 0.7), 0 0 0 8px rgba(212, 165, 116, 0.25), 0 0 0 12px rgba(212, 165, 116, 0.15);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(212, 165, 116, 0.3), 0 0 0 16px rgba(212, 165, 116, 0.1), 0 0 0 20px rgba(212, 165, 116, 0.05);
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTracking;
