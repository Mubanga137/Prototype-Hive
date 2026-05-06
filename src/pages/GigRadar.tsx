import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Package, Bike, Zap, CheckCircle, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRunnerLocation } from "@/hooks/useRunnerLocation";
import { toast } from "sonner";
import BountyMap, { type BountyOrder } from "@/components/BountyMap";
import GigSidenav from "@/components/gig/GigSidenav";
import OtpVerifyDrawer from "@/components/gig/OtpVerifyDrawer";
import { GPSTransmitterStatus } from "@/components/gig/GPSTransmitterStatus";
import { useMixedFleetRole, canAcceptJob, calculatePayout } from "@/hooks/useMixedFleetRole";

interface OrderItem {
  id: number;
  status: string | null;
  total_price: number | null;
  created_at: string;
  buyer_id: string | null;
  runner_id: number | null;
  item_id: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
}

const GigRadar = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { role, isRider, isRunner, isNode } = useMixedFleetRole();
  const [availableOrders, setAvailableOrders] = useState<OrderItem[]>([]);
  const [myActiveOrders, setMyActiveOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [workerPosition, setWorkerPosition] = useState<[number, number] | null>(null);
  const [otpDrawerOrder, setOtpDrawerOrder] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "on_delivery" | "navigating">("idle");
  const selectedRef = useRef<HTMLDivElement | null>(null);

  // ── GPS Heartbeat Hook: Manages location tracking & Supabase updates ──
  const { location, isTransmitting, hasPermission, permissionError } = useRunnerLocation(
    user,
    isOnline
  );

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    setLoading(true);
    const { data: available } = await supabase
      .from("orders")
      .select("*")
      .is("runner_id", null)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(20);

    setAvailableOrders((available as OrderItem[]) || []);

    if (user) {
      const { data: mine } = await supabase
        .from("orders")
        .select("*")
        .eq("runner_id", parseInt(user.id.slice(0, 8), 16) % 100000)
        .in("status", ["in_transit", "out_for_delivery"])
        .order("created_at", { ascending: false })
        .limit(10);
      setMyActiveOrders((mine as OrderItem[]) || []);
    }
    setLoading(false);
  };

  const handleAcceptOrder = async (orderId: number) => {
    if (!user || !profile) {
      toast.error("Please log in first.");
      return;
    }

    // Check if worker can accept job based on role & capacity
    // pulse_credits not yet in DB schema, use default 50 for now
    const pulseCredits = (profile as any)?.pulse_credits ?? 50;
    const { canAccept, reason } = canAcceptJob(role, pulseCredits);

    if (!canAccept) {
      toast.error(reason || "Cannot accept this job.");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "in_transit", runner_id: parseInt(user.id.slice(0, 8), 16) % 100000 } as any)
      .eq("id", orderId);

    if (error) {
      toast.error(error.message);
      return;
    }

    // If runner/node: deduct -1 from pulse_credits (once column is added to DB)
    if (!isRider) {
      const newCapacity = Math.max(0, pulseCredits - 1);
      // TODO: Uncomment when pulse_credits column is added to profiles table
      // await supabase
      //   .from("profiles")
      //   .update({ pulse_credits: newCapacity } as any)
      //   .eq("user_id", user.id);
      // await refreshProfile();
    }

    toast.success("Order accepted! You're on it 🚴");
    fetchOrders();
  };

  const handleToggleOnline = async (val: boolean) => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }

    try {
      // Update is_online boolean in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ is_online: val })
        .eq("user_id", user.id);

      if (error) {
        toast.error(`Failed to update status: ${error.message}`);
        return;
      }

      setIsOnline(val);
      if (val) {
        toast.success("🟢 You are now online");
      } else {
        toast.success("🔴 You are offline");
      }
    } catch (err) {
      console.error("[GigRadar] Toggle online error:", err);
      toast.error("Could not update online status");
    }
  };

  const openNavigation = (order: OrderItem) => {
    if (!workerPosition) {
      toast.error("Waiting for your GPS location...");
      return;
    }
    const destLat = order.dropoff_lat || -15.4167 + (Math.sin(order.id * 1.7) * 0.01);
    const destLng = order.dropoff_lng || 28.2833 + (Math.cos(order.id * 2.1) * 0.01);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${workerPosition[0]},${workerPosition[1]}&destination=${destLat},${destLng}`;
    window.open(url, "_blank");
    setLiveStatus("navigating");
  };

  // Update worker position in local state when GPS location changes
  useEffect(() => {
    if (location) {
      setWorkerPosition([location.latitude, location.longitude]);
    }
  }, [location]);

  // Get initial position even when offline
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setWorkerPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  // Fetch available orders when user loads
  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Derive live status based on active orders
  useEffect(() => {
    if (myActiveOrders.length > 0) setLiveStatus("on_delivery");
    else setLiveStatus("idle");
  }, [myActiveOrders]);

  // Scroll to selected card
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedOrderId]);

  const bounties: BountyOrder[] = availableOrders.map((o) => ({
    id: o.id,
    lat: -15.4167 + (Math.sin(o.id * 3.7) * 0.02),
    lng: 28.2833 + (Math.cos(o.id * 2.3) * 0.02),
    total_price: o.total_price,
    status: o.status,
  }));

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(39,100%,97%)" }}>
      <GigSidenav
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        activeOrderCount={myActiveOrders.length}
        liveStatus={liveStatus}
        workerRole={role === "rider" ? "rider" : role === "node_operator" ? "hub_owner" : "runner"}
        isTransmitting={isTransmitting}
        hasPermission={hasPermission}
      />

      <main className="w-full flex-1 flex flex-col min-w-0 relative z-10 lg:flex-1">
        {/* Map — top section */}
        <div className="w-full px-3 md:px-4 pt-14 lg:pt-4 pb-3 md:pb-4">
          {/* GPS Transmitter Status */}
          <GPSTransmitterStatus
            isTransmitting={isTransmitting}
            hasPermission={hasPermission}
            permissionError={permissionError}
            isOnline={isOnline}
          />

          <div className="w-full rounded-2xl overflow-hidden border-2" style={{ borderColor: "hsl(38,73%,40%,0.2)" }}>
            <div className="w-full h-[40vh] md:h-[45vh] relative">
              <BountyMap
                workerPosition={workerPosition}
                bounties={bounties}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
              />
            </div>
          </div>
        </div>

        {/* Active orders — my deliveries */}
        {myActiveOrders.length > 0 && (
          <div className="w-full px-3 md:px-4 mb-3">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "hsl(220,55%,13%)" }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> My Active Deliveries
            </h3>
            <div className="space-y-2 w-full">
              {myActiveOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "white", borderColor: "hsl(38,40%,85%)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(38,73%,40%,0.1)" }}>
                      <Package size={16} style={{ color: "hsl(38,73%,40%)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "hsl(220,55%,13%)" }}>Order #{order.id}</p>
                      <p className="text-xs" style={{ color: "hsl(220,20%,46%)" }}>ZMW {order.total_price || 0} • {order.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openNavigation(order)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "hsl(38,73%,40%)", color: "hsl(39,100%,97%)" }}
                    >
                      <Navigation size={12} /> 🗺️ Navigate
                    </button>
                    <button
                      onClick={() => setOtpDrawerOrder(order.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all"
                      style={{ borderColor: "hsl(38,73%,40%,0.3)", color: "hsl(38,73%,40%)" }}
                    >
                      🔒 Verify Handoff
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom section — available gigs list */}
        <div className="w-full flex-1 px-3 md:px-4 pb-4 overflow-y-auto min-h-0">
          <div className="w-full rounded-xl border p-4" style={{ background: "white", borderColor: "hsl(38,40%,85%)" }}>
            <h3 className="text-base font-bold mb-1" style={{ color: "hsl(220,55%,13%)" }}>Available Gigs</h3>
            <p className="text-xs mb-4" style={{ color: "hsl(220,20%,46%)" }}>Tap a marker above or claim below</p>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent mx-auto" style={{ borderColor: "hsl(38,73%,40%)", borderTopColor: "transparent" }} />
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="text-center py-8">
                <Bike size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm" style={{ color: "hsl(220,20%,46%)" }}>No active gigs right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    ref={selectedOrderId === order.id ? selectedRef : undefined}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer"
                    style={{
                      borderColor: selectedOrderId === order.id ? "hsl(38,73%,40%)" : "hsl(38,40%,85%)",
                      background: selectedOrderId === order.id ? "hsl(38,73%,40%,0.06)" : "transparent",
                      boxShadow: selectedOrderId === order.id ? "0 0 0 2px hsl(38,73%,40%,0.15)" : "none",
                    }}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(38,73%,40%,0.1)" }}>
                        <Package size={16} style={{ color: "hsl(38,73%,40%)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "hsl(220,55%,13%)" }}>Order #{order.id}</p>
                        <p className="text-xs" style={{ color: "hsl(220,20%,46%)" }}>ZMW {order.total_price || 0} • {order.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAcceptOrder(order.id); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "hsl(38,73%,40%)", color: "hsl(39,100%,97%)" }}
                      >
                        <Zap size={12} /> ⚡ Claim
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* OTP Verification Drawer */}
      <OtpVerifyDrawer
        open={otpDrawerOrder !== null}
        onClose={() => setOtpDrawerOrder(null)}
        orderId={otpDrawerOrder || 0}
        onVerified={fetchOrders}
      />
    </div>
  );
};

export default GigRadar;
