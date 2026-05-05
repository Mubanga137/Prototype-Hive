import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, MapPin, Loader2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import L from "leaflet";
import LRM from "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderData {
  id: number;
  runner_id: number | null;
  delivery_lat: number | null;
  delivery_long: number | null;
  status: string | null;
  total_price: number | null;
  customer_name?: string | null;
}

interface RiderProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  current_lat: number | null;
  current_long: number | null;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
}

const OrderTrackingRadar = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const channelRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch order data on mount
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        if (!orderId) {
          setError("Order ID not found");
          setLoading(false);
          return;
        }

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, runner_id, delivery_lat, delivery_long, status, total_price, customer_name")
          .eq("id", parseInt(orderId))
          .maybeSingle();

        if (orderError || !orderData) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        setOrder(orderData as OrderData);

        // Fetch runner/rider profile if runner_id exists
        if (orderData.runner_id) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, phone, current_lat, current_long")
            .eq("id", orderData.runner_id.toString())
            .maybeSingle();

          if (profileData) {
            setRider(profileData as RiderProfile);
            if (profileData.current_lat && profileData.current_long) {
              setRiderLocation([profileData.current_lat, profileData.current_long]);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order data");
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  // Set up realtime subscription for rider location updates
  useEffect(() => {
    if (!rider?.id) return;

    const channel = supabase
      .channel(`rider-location-${rider.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${rider.id}`,
        },
        (payload: any) => {
          const { current_lat, current_long } = payload.new;
          if (current_lat && current_long) {
            setRiderLocation([current_lat, current_long]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rider?.id]);

  // Initialize and update map
  useEffect(() => {
    if (!mapRef.current || !order?.delivery_lat || !order?.delivery_long || !riderLocation) {
      return;
    }

    // Initialize map on first render
    if (!mapInstanceRef.current) {
      const center: [number, number] = riderLocation || [
        order.delivery_lat || -15.4167,
        order.delivery_long || 28.2833,
      ];

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
        tap: true,
      }).setView(center, 14);

      mapInstanceRef.current = map;

      // Fix touch-action for mobile
      mapRef.current.style.touchAction = "auto";

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      setTimeout(() => map.invalidateSize(), 200);
    }

    const map = mapInstanceRef.current;

    // Destination marker (Gold)
    if (!destinationMarkerRef.current && order.delivery_lat && order.delivery_long) {
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#B37C1C;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(179,124,28,0.2), 0 4px 16px rgba(0,0,0,0.2);"><span style="font-size:18px;">📍</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      destinationMarkerRef.current = L.marker([order.delivery_lat, order.delivery_long], {
        icon: destIcon,
      })
        .addTo(map)
        .bindPopup(`<strong>Delivery Location</strong><br/>Order #${order.id}`);
    }

    // Rider marker (Navy/Blue)
    if (riderLocation) {
      const riderIcon = L.divIcon({
        className: "",
        html: `<div style="width:44px;height:44px;border-radius:50%;background:#1a3a52;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(26,58,82,0.2), 0 4px 16px rgba(0,0,0,0.3);"><span style="font-size:20px;">🏍️</span></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng(riderLocation);
      } else {
        riderMarkerRef.current = L.marker(riderLocation, { icon: riderIcon })
          .addTo(map)
          .bindPopup(`<strong>${rider?.full_name || "Your Rider"}</strong><br/>En route to delivery`);
      }
    }

    // Set up routing with OSRM
    if (riderLocation && order.delivery_lat && order.delivery_long) {
      // Remove existing routing control
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }

      // Create new routing control
      const routingControl = LRM.Routing.control({
        waypoints: [
          L.latLng(riderLocation[0], riderLocation[1]),
          L.latLng(order.delivery_lat, order.delivery_long),
        ],
        router: LRM.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
        lineOptions: {
          styles: [
            {
              color: "#B37C1C",
              weight: 4,
              opacity: 0.8,
              className: "route-line",
            },
          ],
        },
        createMarker: () => null, // Don't create markers (we have custom ones)
        addWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
        altLineOptions: {
          styles: [
            {
              color: "#B37C1C",
              weight: 2,
              opacity: 0.4,
              dashArray: "5, 5",
            },
          ],
        },
      }).addTo(map);

      routingControlRef.current = routingControl;

      // Hide the ugly OSRM turn-by-turn instructions
      const instructionsContainer = document.querySelector(".leaflet-routing-container");
      if (instructionsContainer) {
        (instructionsContainer as HTMLElement).style.display = "none";
      }

      // Extract route info when route is found
      routingControl.on("routesfound", (e: any) => {
        if (e.routes && e.routes.length > 0) {
          const route = e.routes[0];
          const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
          const durationMins = Math.ceil(route.summary.totalTime / 60);
          setRouteInfo({
            distance: parseFloat(distanceKm),
            duration: durationMins,
          });
        }
      });

      routingControl.on("routingerror", (e: any) => {
        console.error("Routing error:", e);
      });
    }

    // Fit bounds to show both rider and destination
    if (riderLocation && order.delivery_lat && order.delivery_long) {
      const bounds = L.latLngBounds(
        [riderLocation[0], riderLocation[1]],
        [order.delivery_lat, order.delivery_long]
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }

    return () => {
      // Cleanup done in separate effects
    };
  }, [riderLocation, order, rider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (routingControlRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: "hsl(39,100%,97%)" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} style={{ color: "hsl(38,73%,40%)" }} />
        </motion.div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: "hsl(39,100%,97%)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 p-6 rounded-2xl"
          style={{ background: "white", borderColor: "hsl(38,40%,85%)", border: "1px solid" }}
        >
          <AlertCircle size={48} style={{ color: "hsl(0,100%,50%)" }} />
          <p className="text-lg font-semibold" style={{ color: "hsl(220,55%,13%)" }}>
            {error || "Order not found"}
          </p>
          <button
            onClick={() => navigate("/customer-dash")}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "hsl(38,73%,40%)", color: "hsl(39,100%,97%)" }}
          >
            Back to Orders
          </button>
        </motion.div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "hsl(39,100%,97%)",
    processing: "hsl(220,55%,13%)",
    in_transit: "hsl(0,100%,50%)",
    out_for_delivery: "hsl(200,100%,50%)",
    delivered: "hsl(120,100%,50%)",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    in_transit: "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ background: "hsl(39,100%,97%)" }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b p-4 md:p-6 sticky top-0 z-20"
        style={{
          background: "rgba(255,251,242,0.95)",
          borderColor: "hsl(38,40%,85%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(38,73%,40%)" }}>
              Order #{order.id}
            </p>
            <h1 className="text-2xl md:text-3xl font-display font-bold" style={{ color: "hsl(220,55%,13%)" }}>
              Real-Time Tracking
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: statusColors[order.status || "pending"] || "hsl(39,100%,97%)",
                color: order.status === "delivered" ? "white" : order.status === "in_transit" ? "white" : "hsl(220,55%,13%)",
              }}
            >
              {statusLabel[order.status || "pending"] || order.status}
            </span>
          </div>
        </div>
      </motion.header>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{
            position: "relative",
            zIndex: 1,
            touchAction: "auto",
          }}
        />

        {/* Glassmorphic HUD Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 max-w-sm rounded-2xl border p-5"
          style={{
            background: "rgba(255,251,242,0.92)",
            borderColor: "hsl(38,73%,40%,0.2)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          {/* ETA & Distance Section */}
          {routeInfo ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "hsl(38,73%,40%,0.08)" }}
                >
                  <Clock size={20} style={{ color: "hsl(38,73%,40%)" }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                      Live ETA
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(38,73%,40%)" }}>
                      ⏱️ {routeInfo.duration} mins
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "hsl(38,73%,40%,0.08)" }}
                >
                  <TrendingUp size={20} style={{ color: "hsl(38,73%,40%)" }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                      Distance
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "hsl(38,73%,40%)" }}>
                      {routeInfo.distance} km
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="h-px" style={{ background: "hsl(38,40%,85%)" }} />

              {/* Rider Info */}
              {rider && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                    Your Rider
                  </p>
                  <p className="text-sm font-bold" style={{ color: "hsl(220,55%,13%)" }}>
                    {rider.full_name || "Gig Worker"}
                  </p>

                  {/* Call Button */}
                  {rider.phone && (
                    <a
                      href={`tel:${rider.phone}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all hover:shadow-lg"
                      style={{
                        background: "hsl(38,73%,40%)",
                        color: "hsl(39,100%,97%)",
                      }}
                    >
                      <Phone size={16} /> Call Runner
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={20} style={{ color: "hsl(38,73%,40%)" }} />
              </motion.div>
              <p className="text-sm font-semibold" style={{ color: "hsl(220,55%,13%)" }}>
                Calculating route...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTrackingRadar;
