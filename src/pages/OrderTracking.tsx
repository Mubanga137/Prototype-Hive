import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import GPSOffModal from "@/components/modals/GPSOffModal";
import MapComponent from "@/components/Map/MapComponent";
import WorkerMarker from "@/components/Map/WorkerMarker";
import DestinationMarker from "@/components/Map/DestinationMarker";
import { MapRef, Source, Layer } from "react-map-gl";
import { mapboxRoutingService } from "@/services/mapboxRoutingService";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Runner = Database["public"]["Tables"]["runners"]["Row"];
type HiveNode = Database["public"]["Tables"]["hive_nodes"]["Row"];

interface OrderWithDetails extends Order {
  node?: HiveNode | null;
  runner?: Runner | null;
}


const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const mapRef = useRef<MapRef>(null);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);

  const { coordinates, isLoading: locationLoading, isPermissionDenied, requestLocation } = useLocationPermission();

  useEffect(() => {
    if (!order_id) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`id, runner_id, node_id, status, created_at`)
          .eq("id", parseInt(order_id))
          .single();

        if (error) throw error;
        if (!data) {
          toast.error("Order not found");
          setLoading(false);
          return;
        }

        const { data: nodeData } = await supabase
          .from("hive_nodes")
          .select("*")
          .eq("id", data.node_id)
          .single();

        let runnerData = null;
        if (data.runner_id) {
          const { data: rData } = await supabase
            .from("runners")
            .select("*")
            .eq("id", data.runner_id)
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
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        toast.error("Failed to load order details");
        setLoading(false);
      }
    };

    fetchOrder();
  }, [order_id]);

  useEffect(() => {
    if (!order?.runner_id) return;

    const channel = supabase
      .channel(`runner-tracking-${order.runner_id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "runners",
          filter: `id=eq.${order.runner_id}`,
        },
        (payload: any) => {
          const { current_lat, current_long } = payload.new;
          if (current_lat && current_long) {
            setRiderLocation({
              lat: current_lat,
              long: current_long,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.runner_id]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (isPermissionDenied) {
      setShowGPSModal(true);
    }
  }, [isPermissionDenied]);

  // Fetch Mapbox route when riderLocation or order changes
  useEffect(() => {
    if (!order?.node || !riderLocation) {
      setRouteGeometry(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const routeMetrics = await mapboxRoutingService.getRoute(
          riderLocation.long,
          riderLocation.lat,
          order.node!.long,
          order.node!.lat
        );

        if (routeMetrics) {
          setEta(`⏱️ Arriving in ${routeMetrics.eta}`);
          setDistance(`📏 Distance: ${routeMetrics.distance}`);
          setRouteGeometry(routeMetrics.coordinates);
        }
      } catch (err) {
        console.warn("[OrderTracking] Mapbox route error:", err);
      }
    };

    fetchRoute();
  }, [order?.node, riderLocation]);

  const handleRecenter = () => {
    if (mapRef.current && riderLocation) {
      mapRef.current.flyTo({
        center: [riderLocation.long, riderLocation.lat],
        zoom: 15,
        duration: 800,
      });
    }
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

      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <MapComponent
          ref={mapRef}
          initialLat={riderLocation?.lat || order.node.lat || -15.4167}
          initialLng={riderLocation?.long || order.node.long || 28.2833}
          initialZoom={14}
        >
          {riderLocation && <WorkerMarker lng={riderLocation.long} lat={riderLocation.lat} label="🛵 Rider" />}
          {order.node && <DestinationMarker lng={order.node.long} lat={order.node.lat} label="🏠 Destination" />}

          {routeGeometry && (
            <Source id="route-source" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeGeometry }, properties: {} }}>
              <Layer id="route-layer" type="line" paint={{ "line-color": "#B37C1C", "line-width": 5, "line-opacity": 0.8 }} />
            </Source>
          )}
        </MapComponent>

        {/* Recenter button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRecenter}
          className="absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-50 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          title="Recenter on rider"
        >
          <MapPin size={20} />
        </motion.button>
      </div>

      {/* Floating HUD Card at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      >
        <div className="max-w-md mx-auto backdrop-blur-md rounded-2xl border border-white/20 bg-white/80 p-5 shadow-2xl">
          {/* Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Tracking</p>
            <p className="text-sm font-bold text-foreground mt-1">Order #{String(order.id).padStart(6, "0")}</p>
          </div>

          {/* ETA and Distance Row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {eta && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                <Clock size={14} className="text-yellow-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">{eta}</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                <MapPin size={14} className="text-yellow-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">{distance}</span>
              </div>
            )}
          </div>

          {/* Call Runner Button */}
          {runnerPhone && (
            <a
              href={`tel:${runnerPhone}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: "#B37C1C",
                color: "#FFFBF2",
                boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)",
              }}
            >
              <Phone size={16} />
              💬 Call Runner
            </a>
          )}

          {/* Delivery Location */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Delivering To</p>
            <p className="text-sm font-semibold text-foreground">{order.node.node_name || "Delivery Node"}</p>
            {order.node.location_description && (
              <p className="text-xs text-gray-600 mt-1">{order.node.location_description}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderTracking;
