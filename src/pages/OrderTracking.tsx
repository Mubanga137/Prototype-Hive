import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { motion } from "framer-motion";
import { Phone, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import GPSOffModal from "@/components/modals/GPSOffModal";
import { createGoldenPulseMarker, updateGoldenPulseMarker, injectGoldenPingAnimation } from "@/utils/createGoldenPulseMarker";
import { animateMarkerToPosition } from "@/utils/smoothMarkerAnimation";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Runner = Database["public"]["Tables"]["runners"]["Row"];
type HiveNode = Database["public"]["Tables"]["hive_nodes"]["Row"];

interface OrderWithDetails extends Order {
  node?: HiveNode | null;
  runner?: Runner | null;
}

const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showGPSModal, setShowGPSModal] = useState(false);

  const mapInstanceRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const channelRef = useRef<any>(null);
  const isFollowingRef = useRef(true);
  const [isFollowing, setIsFollowing] = useState(true);

  // Location permission hook for customer's current location
  const { coordinates, isLoading: locationLoading, isPermissionDenied, requestLocation } = useLocationPermission();

  // Fetch order details on mount
  useEffect(() => {
    if (!order_id) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            runner_id,
            node_id,
            status,
            created_at
          `
          )
          .eq("id", parseInt(order_id))
          .single();

        if (error) throw error;
        if (!data) {
          toast.error("Order not found");
          setLoading(false);
          return;
        }

        // Fetch node (delivery location)
        const { data: nodeData } = await supabase
          .from("hive_nodes")
          .select("*")
          .eq("id", data.node_id)
          .single();

        // Fetch runner details
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

        // Set initial rider location
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

  // Subscribe to runner location updates
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

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.runner_id]);

  // Request customer location on component mount
  useEffect(() => {
    injectGoldenPingAnimation();
    requestLocation();
  }, [requestLocation]);

  // Update or create self marker when coordinates change
  useEffect(() => {
    if (!coordinates || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (!selfMarkerRef.current) {
      selfMarkerRef.current = createGoldenPulseMarker(coordinates.latitude, coordinates.longitude, map);
      // Fly to self location
      map.flyTo([coordinates.latitude, coordinates.longitude], 16, { duration: 1 });
    } else {
      selfMarkerRef.current = updateGoldenPulseMarker(selfMarkerRef.current, coordinates.latitude, coordinates.longitude, map);
    }
  }, [coordinates]);

  // Show GPS modal if permission denied
  useEffect(() => {
    if (isPermissionDenied) {
      setShowGPSModal(true);
    }
  }, [isPermissionDenied]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !riderLocation) return;
    isFollowingRef.current = true;
    setIsFollowing(true);
    map.flyTo([riderLocation.lat, riderLocation.long], 15, { animate: true, duration: 0.8 });
  };

  // Initialize and manage map
  useEffect(() => {
    if (!order?.node || !riderLocation) return;

    const deliveryLat = order.node.lat;
    const deliveryLong = order.node.long;

    if (!deliveryLat || !deliveryLong) return;

    // Create map if it doesn't exist
    if (!mapInstanceRef.current) {
      const container = document.getElementById("map-container");
      if (!container) return;

      const map = L.map(container, {
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add OSM tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Disable follow mode on user interaction
      map.on("dragstart", () => {
        isFollowingRef.current = false;
        setIsFollowing(false);
      });

      map.on("zoomstart", () => {
        isFollowingRef.current = false;
        setIsFollowing(false);
      });

      // Create delivery marker (Gold)
      const deliveryIcon = L.divIcon({
        className: "",
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#B37C1C;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(179,124,28,0.5);"><span style="font-size:18px;">🏠</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([deliveryLat, deliveryLong], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup("Delivery Location");
    }

    const map = mapInstanceRef.current;

    // Update/create rider marker (Navy/Blue vehicle)
    const riderIcon = L.divIcon({
      className: "",
      html: `<div style="width:40px;height:40px;border-radius:50%;background:#1a1a2e;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(26,26,46,0.5);"><span style="font-size:18px;">🛵</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker(
        [riderLocation.lat, riderLocation.long],
        { icon: riderIcon }
      )
        .addTo(map)
        .bindPopup("Rider Location");
    } else {
      animateMarkerToPosition(riderMarkerRef.current, riderLocation.lat, riderLocation.long, {
        duration: 800,
      });
    }

    // Remove old routing control
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    // Add routing with OSRM
    const routingControl = (L as any).Routing.control({
      waypoints: [
        L.latLng(riderLocation.lat, riderLocation.long),
        L.latLng(deliveryLat, deliveryLong),
      ],
      router: (L as any).Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
      lineOptions: {
        styles: [
          {
            color: "#B37C1C", // Gold
            weight: 4,
            opacity: 0.8,
          },
        ],
      },
      createMarker: () => null, // Don't create default markers
      addWaypoints: false,
      routeWhileDragging: true,
      showAlternatives: false,
      waypointMode: "snap",
      containerClassName: "hidden", // Hide the turn-by-turn box
    }).addTo(map);

    routingControlRef.current = routingControl;

    // Hook into routesfound event for ETA and distance
    routingControl.on("routesfound", (e: any) => {
      if (e.routes && e.routes.length > 0) {
        const route = e.routes[0];
        const totalTime = route.summary.totalTime;
        const totalDistance = route.summary.totalDistance;

        // Convert time to minutes
        const minutes = Math.ceil(totalTime / 60);
        setEta(`⏱️ Arriving in ${minutes} min${minutes !== 1 ? "s" : ""}`);

        // Convert distance to km
        const km = (totalDistance / 1000).toFixed(1);
        setDistance(`Distance: ${km} km`);
      }
    });

    // Only fit bounds on first load (not on follow mode updates)
    if (isFollowingRef.current) {
      const group = new L.FeatureGroup([
        L.latLng(riderLocation.lat, riderLocation.long),
        L.latLng(deliveryLat, deliveryLong),
      ]);
      map.fitBounds(group.getBounds(), { padding: [100, 100] });
    } else if (isFollowingRef.current) {
      map.setView([riderLocation.lat, riderLocation.long], 15, { animate: true, duration: 0.3 });
    }

    return () => {
      // Cleanup on unmount or dependency changes
      if (routingControlRef.current && map) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [order?.node, riderLocation]);

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

  const runnerPhone = order.runner?.id ? `+26${order.runner.id}` : null; // Placeholder format

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
      {/* GPS Off Modal */}
      <GPSOffModal
        isOpen={showGPSModal}
        onClose={() => setShowGPSModal(false)}
      />

      {/* Full-screen map with recenter button */}
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <div
          id="map-container"
          className="w-full h-screen"
          style={{ position: "relative", zIndex: 1 }}
        />
        {/* Recenter button */}
        <button
          onClick={handleRecenter}
          className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all z-50 ${
            isFollowing
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
          title={isFollowing ? "Following enabled" : "Click to recenter"}
        >
          <MapPin size={20} />
        </button>
      </div>

      {/* Floating HUD Card at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
      >
        <div className="max-w-md mx-auto backdrop-blur-md rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl">
          {/* Header */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Live Tracking
            </p>
            <p className="text-sm font-bold text-foreground mt-1">
              Order #{String(order.id).padStart(6, "0")}
            </p>
          </div>

          {/* ETA and Distance Row */}
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Delivering To
            </p>
            <p className="text-sm font-semibold text-foreground">
              {order.node.node_name || "Delivery Node"}
            </p>
            {order.node.location_description && (
              <p className="text-xs text-muted-foreground mt-1">
                {order.node.location_description}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Hide the routing machine's default itinerary box */}
      <style>{`
        .leaflet-routing-container {
          display: none !important;
        }
        .leaflet-routing-alternatives {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default OrderTracking;
