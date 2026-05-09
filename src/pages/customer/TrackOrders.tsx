import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Truck, CheckCircle2, Clock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import OrderRadarMap from "@/components/OrderRadarMap";
import DestinationMap from "@/components/DestinationMap";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const statusSteps = ["pending", "processing", "in_transit", "out_for_delivery", "delivered"];
const stepLabels = ["Order Placed", "Confirmed", "Shipped", "Out for Delivery", "Delivered"];

const TrackOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<number>>(new Set());
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCustomerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          setOrders([]);
          setLoading(false);
          return;
        }

        try {
          const { data, error: queryError } = await supabase
            .from("orders")
            .select("id, total_price, status, created_at, runner_id, otp_code, delivery_address, hive_catalogue!orders_item_id_fkey(product_name)")
            .eq("buyer_id", user.id)
            .neq("status", "delivered")
            .neq("status", "cancelled")
            .order("created_at", { ascending: false })
            .limit(20);

          if (queryError) {
            console.error("[TrackOrders] Supabase query error:", queryError);
            setError(`Unable to load orders: ${queryError.message}`);
            setOrders([]);
            setLoading(false);
            return;
          }

          setOrders(data || []);
          setLoading(false);
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
          console.error("[TrackOrders] Network/fetch error:", msg);

          if (msg.includes("fetch") || msg.includes("Failed") || msg.includes("Network")) {
            setError("Unable to connect to server. Please check your internet connection and try again.");
          } else {
            setError(`Error loading orders: ${msg}`);
          }

          setOrders([]);
          setLoading(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        console.error("[TrackOrders] Unexpected error:", msg);
        setError("An unexpected error occurred");
        setOrders([]);
        setLoading(false);
      }
    };

    fetchActiveOrders();
  }, [user]);

  const getStepIndex = (status: string | null) => {
    const idx = statusSteps.indexOf(status || "pending");
    return idx >= 0 ? idx : 0;
  };

  const handleInspectItem = (orderId: number) => {
    const confirmed = window.confirm(
      "🔍 Inspect Item\n\nBy confirming, you accept that you have inspected and received the item in satisfactory condition. Your delivery code will be revealed."
    );
    if (confirmed) {
      setRevealedCodes((prev) => new Set(prev).add(orderId));
      toast.success("Item accepted! Your delivery code is now visible.");
    }
  };

  const navigateToMarketplace = () => {
    window.location.hash = "#/customer-dash";
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance || orders.length > 0) return;

    const center: [number, number] = [customerCoords?.lat || -15.4167, customerCoords?.lng || 28.2833];
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
    }).setView(center, 13);
    setMapInstance(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 200);

    if (customerCoords) {
      const selfIcon = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;border-radius:50%;background:#D4A574;border:3px solid #FFFBF2;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px rgba(212,165,116,0.25), 0 0 0 12px rgba(212,165,116,0.15);animation:pulse 2s infinite;"><span style="font-size:14px;">📍</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([customerCoords.lat, customerCoords.lng], { icon: selfIcon }).addTo(map).bindPopup("Your location");
      map.flyTo([customerCoords.lat, customerCoords.lng], 14, { animate: true, duration: 1.2 });
    }

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, [customerCoords, mapInstance, orders.length]);

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: "#FFFBF2" }}>
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2" style={{ color: "#0F1A35" }}>
            <MapPin size={28} style={{ color: "#D4A574" }} /> Track My Orders
          </h2>
          <p className="text-sm md:text-base mt-2" style={{ color: "#666" }}>Real-time tracking for your active orders</p>
        </motion.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-300" style={{ borderTopColor: "#D4A574" }} />
            <p className="mt-4 text-sm" style={{ color: "#666" }}>Loading your orders...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-lg font-semibold mb-2" style={{ color: "#0F1A35" }}>Unable to Load Orders</p>
            <p className="text-sm mb-6 max-w-sm text-center" style={{ color: "#666" }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ backgroundColor: "#D4A574", color: "#FFFBF2" }}
            >
              🔄 Try Again
            </button>
          </motion.div>
        ) : orders.length === 0 ? (
          <div className="w-full space-y-6">
            <div
              ref={mapRef}
              className="w-full h-[70vh] rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#f0f0f0" }}
            />
            <style>{`
              @keyframes pulse-ring {
                0% { box-shadow: 0 0 0 0 rgba(212, 165, 116, 0.7), 0 0 0 8px rgba(212, 165, 116, 0.25), 0 0 0 12px rgba(212, 165, 116, 0.15); }
                50% { box-shadow: 0 0 0 8px rgba(212, 165, 116, 0.3), 0 0 0 16px rgba(212, 165, 116, 0.1), 0 0 0 20px rgba(212, 165, 116, 0.05); }
                100% { box-shadow: 0 0 0 0 rgba(212, 165, 116, 0), 0 0 0 8px rgba(212, 165, 116, 0.25), 0 0 0 12px rgba(212, 165, 116, 0.15); }
              }
              [style*="animation:pulse"] { animation: pulse-ring 2s infinite !important; }
            `}</style>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full"
            >
              <div
                className="w-full rounded-2xl px-6 py-8 backdrop-blur-xl border border-white/20 shadow-2xl"
                style={{
                  backgroundColor: "rgba(255, 251, 242, 0.85)",
                }}
              >
                <h3 className="text-2xl font-display font-bold mb-2" style={{ color: "#0F1A35" }}>
                  Your radar is clear.
                </h3>
                <p className="text-sm mb-6" style={{ color: "#666" }}>
                  Lock a deal in the Marketplace and watch it arrive right here in real-time.
                </p>
                <button
                  onClick={navigateToMarketplace}
                  className="w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #D4A574 0%, #1a1a2e 100%)",
                    color: "#FFFBF2"
                  }}
                >
                  🛒 Shop The Hive
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order, i) => {
              const currentStep = getStepIndex(order.status);
              const itemName = order.hive_catalogue?.product_name || `Order #${order.id}`;
              const isInTransit = order.status === "in_transit" || order.status === "out_for_delivery";
              const codeRevealed = revealedCodes.has(order.id);
              const otpCode = (order as any).otp_code;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="space-y-4"
                >
                  {isInTransit && (
                    <>
                      <div
                        className="w-full h-[70vh] rounded-2xl overflow-hidden shadow-lg"
                        style={{ backgroundColor: "#f0f0f0" }}
                      >
                        <DestinationMap
                          deliveryAddress={order.delivery_address}
                          orderId={order.id}
                        />
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 * i }}
                        className="p-5 rounded-xl shadow-sm"
                        style={{ backgroundColor: "#fff", borderLeft: "4px solid #D4A574" }}
                      >
                        <h3 className="text-sm font-bold mb-3" style={{ color: "#0F1A35" }}>Active Route HUD</h3>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: "#666" }}>Order ID</span>
                            <span className="text-sm font-semibold" style={{ color: "#0F1A35" }}>HV-{String(order.id).padStart(6, "0")}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: "#666" }}>ETA</span>
                            <span className="text-sm font-semibold" style={{ color: "#666" }}>Loading...</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: "#666" }}>Destination</span>
                            <span className="text-sm font-semibold" style={{ color: "#D4A574" }}>
                              {order.delivery_address ? order.delivery_address.substring(0, 25) + "..." : "Address loading..."}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}

                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#0F1A35" }}>{itemName}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#999" }}>HV-{String(order.id).padStart(6, "0")}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: "#D4A574" }}>ZMW {order.total_price || 0}</span>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ml-2 mt-1" style={{ backgroundColor: "#D4A57420", color: "#D4A574" }}>
                          <Truck size={12} /> {order.status || "pending"}
                        </div>
                      </div>
                    </div>

                    {isInTransit && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#D4A574" }}>
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Tracking
                        </p>
                        <OrderRadarMap
                          orderId={order.id}
                          runnerId={order.runner_id}
                          customerLat={customerCoords?.lat}
                          customerLng={customerCoords?.lng}
                        />
                      </div>
                    )}

                    {isInTransit && (
                      <div className="mb-5 p-4 rounded-xl border" style={{ background: "#F5F0E8", borderColor: "#D4A574" }}>
                        {!codeRevealed ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold" style={{ color: "#0F1A35" }}>Delivery Code</p>
                              <p className="text-xs mt-0.5" style={{ color: "#666" }}>Inspect your item first to reveal</p>
                            </div>
                            <button
                              onClick={() => handleInspectItem(order.id)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                              style={{ backgroundColor: "#D4A574", color: "#FFFBF2" }}
                            >
                              <Eye size={14} /> 🔍 Inspect Item
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: "#999" }}>Your Delivery Code</p>
                              <p className="text-3xl font-bold tracking-[0.3em] font-mono" style={{ color: "#D4A574" }}>
                                {otpCode || "----"}
                              </p>
                            </div>
                            <div className="text-xs flex items-center gap-1" style={{ color: "#999" }}>
                              <EyeOff size={12} /> Share with rider only
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-0">
                      {stepLabels.map((label, si) => (
                        <div key={si} className="flex-1 flex flex-col items-center relative">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${
                              si <= currentStep ? "text-white" : "border-2 border-gray-300 text-gray-400"
                            }`}
                            style={{
                              backgroundColor: si <= currentStep ? "#D4A574" : "transparent"
                            }}
                          >
                            {si <= currentStep ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                          </div>
                          <p className={`text-[9px] mt-1.5 text-center font-medium ${si <= currentStep ? "font-semibold" : ""}`}
                            style={{ color: si <= currentStep ? "#D4A574" : "#999" }}>
                            {label}
                          </p>
                          {si < stepLabels.length - 1 && (
                            <div
                              className={`absolute top-3.5 left-[calc(50%+14px)] w-[calc(100%-28px)] h-0.5`}
                              style={{
                                backgroundColor: si < currentStep ? "#D4A574" : si === currentStep ? "#D4A57466" : "#e0e0e0"
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrders;
