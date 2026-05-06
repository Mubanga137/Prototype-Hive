import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { motion } from "framer-motion";
import { Phone, Clock, MapPin, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import GPSOffModal from "@/components/modals/GPSOffModal";
import { createGoldenPulseMarker, updateGoldenPulseMarker, injectGoldenPingAnimation } from "@/utils/createGoldenPulseMarker";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface OrderWithDetails extends Order {
  runner_profile?: Profile | null;
  otp_code?: string | null;
}

interface TimelineEvent {
  stage: "placed" | "picked_up" | "en_route" | "delivered";
  label: string;
  completed: boolean;
  timestamp?: string;
}

const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; long: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const mapInstanceRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);
  const channelRef = useRef<any>(null);

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
          .select("*")
          .eq("id", parseInt(order_id))
          .single();

        if (error) throw error;
        if (!data) {
          toast.error("Order not found");
          setLoading(false);
          return;
        }

        // Fetch runner profile if assigned
        let runnerProfile = null;
        if (data.runner_id) {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", data.runner_id)
            .single();
          runnerProfile = pData;
        }

        const orderWithDetails: OrderWithDetails = {
          ...data,
          runner_profile: runnerProfile,
        };

        setOrder(orderWithDetails);

        // Set initial rider location from runner profile
        if (runnerProfile?.current_lat && runnerProfile?.current_long) {
          setRiderLocation({
            lat: runnerProfile.current_lat,
            long: runnerProfile.current_long,
          });
        }

        // Build timeline based on order status
        buildTimeline(data.status || "pending");

        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        toast.error("Failed to load order details");
        setLoading(false);
      }
    };

    fetchOrder();
  }, [order_id]);

  // Build timeline based on order status
  const buildTimeline = (status: string) => {
    const events: TimelineEvent[] = [
      { stage: "placed", label: "Order Placed", completed: true, timestamp: new Date().toLocaleTimeString() },
      { stage: "picked_up", label: "Picked Up", completed: ["picked_up", "in_transit", "out_for_delivery", "delivered"].includes(status), timestamp: new Date().toLocaleTimeString() },
      { stage: "en_route", label: "En Route", completed: ["in_transit", "out_for_delivery", "delivered"].includes(status), timestamp: new Date().toLocaleTimeString() },
      { stage: "delivered", label: "Delivered", completed: status === "delivered", timestamp: status === "delivered" ? new Date().toLocaleTimeString() : undefined },
    ];
    setTimelineEvents(events);
  };

  // Subscribe to runner profile location updates
  useEffect(() => {
    if (!order?.runner_id) return;

    const channel = supabase
      .channel(`runner-tracking-${order.runner_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${order.runner_id}`,
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
      map.flyTo([coordinates.latitude, coordinates.longitude], 14, { duration: 0.5 });
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

  // Initialize and manage map
  useEffect(() => {
    if (!order || !riderLocation) return;

    // Extract delivery lat/long from order (stored as dropoff_lat/dropoff_lng or default)
    const deliveryLat = order.dropoff_lat || -15.4167;
    const deliveryLng = order.dropoff_lng || 28.2833;

    // Create map if it doesn't exist
    if (!mapInstanceRef.current) {
      const container = document.getElementById("map-container");
      if (!container) return;

      const map = L.map(container, {
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        zoomControl: true,
        touchAction: "auto",
      });

      mapInstanceRef.current = map;

      // Add OSM tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Fix: invalidate size after mount to prevent grey tiles
      setTimeout(() => map.invalidateSize(), 200);

      // Create delivery marker (Navy)
      const deliveryIcon = L.divIcon({
        className: "",
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#0F1A35;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(15,26,53,0.6);"><span style="font-size:18px;">🏠</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      deliveryMarkerRef.current = L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup("Delivery Destination");
    }

    const map = mapInstanceRef.current;

    // Update/create rider marker (Glowing Gold pulse dot)
    const riderIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;border-radius:50%;background:#B37C1C;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(179,124,28,0.6);"><span style="font-size:16px;">🛵</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker([riderLocation.lat, riderLocation.long], { icon: riderIcon })
        .addTo(map)
        .bindPopup("Rider Location");
    } else {
      riderMarkerRef.current.setLatLng([riderLocation.lat, riderLocation.long]);
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
        L.latLng(deliveryLat, deliveryLng),
      ],
      router: (L as any).Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
      lineOptions: {
        styles: [
          {
            color: "#0F1A35", // Navy
            weight: 4,
            opacity: 0.8,
          },
        ],
      },
      createMarker: () => null,
      addWaypoints: false,
      routeWhileDragging: true,
      showAlternatives: false,
      waypointMode: "snap",
      containerClassName: "hidden",
    }).addTo(map);

    routingControlRef.current = routingControl;

    // Hook into routesfound event for ETA and distance
    routingControl.on("routesfound", (e: any) => {
      if (e.routes && e.routes.length > 0) {
        const route = e.routes[0];
        const totalTime = route.summary.totalTime;
        const totalDistance = route.summary.totalDistance;

        const minutes = Math.ceil(totalTime / 60);
        setEta(`${minutes} min${minutes !== 1 ? "s" : ""}`);

        const km = (totalDistance / 1000).toFixed(1);
        setDistance(`${km} km`);
      }
    });

    // Fit bounds to show both points
    const group = new L.FeatureGroup([
      L.latLng(riderLocation.lat, riderLocation.long),
      L.latLng(deliveryLat, deliveryLng),
    ]);
    map.fitBounds(group.getBounds(), { padding: [100, 100] });

    return () => {
      if (routingControlRef.current && map) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [order, riderLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(39,100%,97%)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent" style={{ borderColor: "hsl(38,73%,40%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(39,100%,97%)" }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "hsl(220,55%,13%)" }}>Order not found</p>
          <p className="text-sm" style={{ color: "hsl(220,20%,46%)" }}>Unable to load tracking information</p>
        </div>
      </div>
    );
  }

  const runnerPhone = order.runner_profile?.phone || "+260";
  const otpCode = order.otp_code || "****";

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "hsl(39,100%,97%)" }}>
      {/* GPS Off Modal */}
      <GPSOffModal isOpen={showGPSModal} onClose={() => setShowGPSModal(false)} />

      {/* Map Container — 60% height */}
      <div className="relative flex-shrink-0 h-[60vh] w-full">
        <div id="map-container" className="w-full h-full" style={{ zIndex: 1 }} />

        {/* ETA HUD Overlay — positioned at bottom of map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 z-20 px-4 py-4"
        >
          <div className="max-w-md mx-auto rounded-2xl border backdrop-blur-md p-5 shadow-2xl" style={{ background: "rgba(255, 250, 242, 0.85)", borderColor: "rgba(255, 250, 242, 0.3)" }}>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {eta && (
                <div className="flex flex-col items-center justify-center p-3 rounded-lg" style={{ background: "rgba(179, 124, 28, 0.08)", borderColor: "rgba(179, 124, 28, 0.2)", border: "1px solid" }}>
                  <Clock size={16} style={{ color: "#B37C1C" }} className="mb-1" />
                  <span className="text-xs font-bold" style={{ color: "#B37C1C" }}>⏱️ {eta}</span>
                </div>
              )}
              {distance && (
                <div className="flex flex-col items-center justify-center p-3 rounded-lg" style={{ background: "rgba(179, 124, 28, 0.08)", borderColor: "rgba(179, 124, 28, 0.2)", border: "1px solid" }}>
                  <MapPin size={16} style={{ color: "#B37C1C" }} className="mb-1" />
                  <span className="text-xs font-bold" style={{ color: "#B37C1C" }}>{distance}</span>
                </div>
              )}
              <a
                href={`tel:${runnerPhone}`}
                className="flex items-center justify-center p-3 rounded-lg font-semibold text-xs transition-all hover:scale-105"
                style={{ background: "#B37C1C", color: "#FFFBF2", boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)" }}
              >
                <Phone size={14} className="mr-1" />
                📞 Call
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Timeline & OTP Vault — 40% height */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Timeline */}
          <div>
            <h3 className="text-sm font-bold mb-4" style={{ color: "hsl(220,55%,13%)" }}>Order Status</h3>
            <div className="space-y-4">
              {timelineEvents.map((event, idx) => (
                <motion.div
                  key={event.stage}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-4"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{
                        background: event.completed ? "#B37C1C" : "#FFFBF2",
                        borderColor: "#B37C1C",
                      }}
                    >
                      {event.completed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    {idx < timelineEvents.length - 1 && (
                      <div
                        className="w-0.5 h-12 mt-2"
                        style={{ background: event.completed ? "#B37C1C" : "hsl(38,40%,85%)" }}
                      />
                    )}
                  </div>

                  {/* Timeline content */}
                  <div className="pb-2">
                    <p className="text-sm font-semibold" style={{ color: event.completed ? "hsl(220,55%,13%)" : "hsl(220,20%,46%)" }}>
                      {event.stage === "placed" && "✅"}
                      {event.stage === "picked_up" && (event.completed ? "✅" : "⏳")}
                      {event.stage === "en_route" && (event.completed ? "✅" : "⏳")}
                      {event.stage === "delivered" && (event.completed ? "✅" : "⏳")}
                      {" "}
                      {event.label}
                    </p>
                    {event.timestamp && <p className="text-xs mt-1" style={{ color: "hsl(220,20%,46%)" }}>{event.timestamp}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* OTP Security Vault */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-5 border-2"
            style={{
              background: "rgba(179, 124, 28, 0.08)",
              borderColor: "#B37C1C",
            }}
          >
            <h3 className="text-sm font-bold mb-3" style={{ color: "hsl(220,55%,13%)" }}>🔐 Secure Handoff PIN</h3>
            <p className="text-xs mb-4" style={{ color: "hsl(220,20%,46%)" }}>
              Present this PIN to the courier to verify delivery
            </p>

            {/* PIN Display */}
            <div className="flex items-center gap-3 mb-4 p-4 rounded-xl" style={{ background: "rgba(255, 250, 242, 0.6)", border: "1px solid hsl(38,40%,85%)" }}>
              <div
                className={`flex-1 text-center font-mono text-2xl font-bold tracking-widest transition-all ${
                  isPinVisible ? "" : "blur-md"
                }`}
                style={{ color: "#B37C1C" }}
              >
                {isPinVisible ? otpCode : "••••"}
              </div>
              <button
                onClick={() => setIsPinVisible(!isPinVisible)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ background: "rgba(179, 124, 28, 0.15)", color: "#B37C1C" }}
              >
                {isPinVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "hsl(220,20%,46%)" }}>
              Keep this code private
            </p>
          </motion.div>
        </div>
      </div>

      {/* Hide routing machine styles */}
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
