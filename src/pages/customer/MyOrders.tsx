import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Copy, MessageCircle, X, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import HoneycombBackground from "@/components/HoneycombBackground";
import hiveLogo from "@/assets/hive-logo.jpeg";

interface Order {
  id: number;
  item_id: number;
  sme_id: number;
  total_price: number;
  status: string;
  otp_code: string;
  created_at: string;
  product_name?: string;
  brand_name?: string;
  image_url?: string;
}

type FilterTab = "active" | "history";

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("active");
  const [revealedOtps, setRevealedOtps] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          item_id,
          sme_id,
          total_price,
          status,
          otp_code,
          created_at,
          hive_catalogue!orders_item_id_fkey(product_name, image_url),
          sme_stores!orders_sme_id_fkey(brand_name)
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load orders");
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((o: any) => ({
        id: o.id,
        item_id: o.item_id,
        sme_id: o.sme_id,
        total_price: o.total_price,
        status: o.status,
        otp_code: o.otp_code,
        created_at: o.created_at,
        product_name: o.hive_catalogue?.product_name || "Unknown Product",
        brand_name: o.sme_stores?.brand_name || "Unknown Vendor",
        image_url: o.hive_catalogue?.image_url || null,
      }));

      setOrders(mapped);
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  const activeOrders = orders.filter((o) =>
    ["pending_payment", "pending_vendor", "locked", "processing", "ready_for_handoff"].includes(
      o.status || ""
    )
  );
  const historyOrders = orders.filter(
    (o) =>
      !["pending_payment", "pending_vendor", "locked", "processing", "ready_for_handoff"].includes(
        o.status || ""
      )
  );

  const displayOrders = filterTab === "active" ? activeOrders : historyOrders;
  const activeCount = activeOrders.length;
  const deliveryTokens = activeOrders.length;

  const toggleOtpReveal = (orderId: number) => {
    setRevealedOtps((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp);
    toast.success("PIN copied to clipboard!");
  };

  const getStatusConfig = (status: string | null) => {
    const configs: Record<string, { label: string; color: string; stepIndex: number }> = {
      pending_payment: { label: "Payment Pending", color: "#B37C1C", stepIndex: 0 },
      pending_vendor: { label: "Awaiting Confirmation", color: "#B37C1C", stepIndex: 0 },
      locked: { label: "Locked", color: "#B37C1C", stepIndex: 0 },
      processing: { label: "Processing", color: "#B37C1C", stepIndex: 1 },
      ready_for_handoff: { label: "Ready for Hand-off", color: "#B37C1C", stepIndex: 2 },
      delivered: { label: "Delivered", color: "#22c55e", stepIndex: 3 },
      cancelled: { label: "Cancelled", color: "#ef4444", stepIndex: -1 },
    };
    return configs[status || "pending_payment"] || configs.pending_payment;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF2] via-[#F9F6F0] to-[#F5F1ED] relative overflow-hidden">
      <HoneycombBackground />

      <div className="relative z-10">
        {/* FILTER TOGGLE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-7xl mx-auto px-4 md:px-8 py-6"
        >
          <div className="flex gap-3 backdrop-blur-sm bg-white/40 p-1 rounded-xl border border-white/50 w-fit">
            <motion.button
              onClick={() => setFilterTab("active")}
              className={`relative px-6 py-2.5 text-sm font-bold transition-all ${
                filterTab === "active"
                  ? "text-[#0F1A35]"
                  : "text-[#0F1A35]/60 hover:text-[#0F1A35]"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📦 Active Orders
              {filterTab === "active" && (
                <motion.div
                  layoutId="filter-underline"
                  className="absolute inset-0 bg-gradient-to-r from-[#B37C1C]/80 to-[#D4AF37]/60 rounded-lg -z-10"
                  transition={{ type: "spring", damping: 20, stiffness: 150 }}
                />
              )}
            </motion.button>

            <motion.button
              onClick={() => setFilterTab("history")}
              className={`relative px-6 py-2.5 text-sm font-bold transition-all ${
                filterTab === "history"
                  ? "text-[#0F1A35]"
                  : "text-[#0F1A35]/60 hover:text-[#0F1A35]"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📜 Order History
              {filterTab === "history" && (
                <motion.div
                  layoutId="filter-underline"
                  className="absolute inset-0 bg-gradient-to-r from-[#B37C1C]/80 to-[#D4AF37]/60 rounded-lg -z-10"
                  transition={{ type: "spring", damping: 20, stiffness: 150 }}
                />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ORDERS CONTENT */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                <Loader2 size={48} className="text-[#B37C1C]" />
              </motion.div>
              <p className="text-[#0F1A35]/60 mt-4">Loading your orders...</p>
            </div>
          ) : displayOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="text-6xl mb-4">
                {filterTab === "active" ? "📦" : "📜"}
              </div>
              <p className="text-2xl font-bold text-[#0F1A35] mb-2">
                {filterTab === "active" ? "No active orders yet" : "No order history"}
              </p>
              <p className="text-[#0F1A35]/60 mb-8">
                {filterTab === "active"
                  ? "Start shopping to see your orders here!"
                  : "Your completed orders will appear here."}
              </p>
              <a
                href="/customer-dash"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#B37C1C] to-[#9b6816] text-white rounded-xl font-bold hover:shadow-2xl transition-all hover:scale-105"
              >
                <Zap size={18} /> Continue Shopping
              </a>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {displayOrders.map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isRevealed={revealedOtps.has(order.id)}
                    onToggleReveal={() => toggleOtpReveal(order.id)}
                    onCopyOtp={() => copyOtp(order.otp_code)}
                    statusConfig={getStatusConfig(order.status)}
                    index={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  isRevealed: boolean;
  onToggleReveal: () => void;
  onCopyOtp: () => void;
  statusConfig: { label: string; color: string; stepIndex: number };
  index: number;
}

const OrderCard = ({
  order,
  isRevealed,
  onToggleReveal,
  onCopyOtp,
  statusConfig,
  index,
}: OrderCardProps) => {
  const canCancel = ["pending_payment", "pending_vendor", "locked"].includes(order.status || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, opacity: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="group backdrop-blur-xl bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-xl border border-white/50 overflow-hidden hover:shadow-2xl transition-all duration-300"
    >
      {/* PREMIUM HEADER */}
      <div className="bg-gradient-to-r from-[#0F1A35]/5 to-[#B37C1C]/5 px-6 md:px-8 py-5 border-b border-[#B37C1C]/10 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 rounded-lg bg-[#B37C1C]/10 border border-[#B37C1C]/20">
            <Zap size={18} className="text-[#B37C1C]" />
          </div>
          <div>
            <h3 className="font-bold text-[#0F1A35] text-lg">Order #{order.id}</h3>
            <p className="text-xs text-[#0F1A35]/60 font-medium">{order.brand_name}</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCopyOtp}
          className="p-2.5 rounded-lg hover:bg-[#B37C1C]/10 text-[#B37C1C] transition-colors"
          title="Copy order ID"
        >
          <Copy size={18} />
        </motion.button>
      </div>

      {/* PRODUCT SHOWCASE */}
      <div className="px-6 md:px-8 py-6 border-b border-[#B37C1C]/10 flex gap-5">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 border-[#B37C1C]/20 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-md"
        >
          {order.image_url ? (
            <img
              src={order.image_url}
              alt={order.product_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl">📦</span>
          )}
        </motion.div>
        <div className="flex-1">
          <p className="font-bold text-[#0F1A35] line-clamp-2">{order.product_name}</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-[#B37C1C] to-[#D4AF37] bg-clip-text text-transparent mt-2">
            ZMW {order.total_price.toLocaleString()}
          </p>
        </div>
      </div>

      {/* STATUS STEPPER - Premium */}
      <div className="px-6 md:px-8 py-7 border-b border-[#B37C1C]/10">
        <div className="flex items-center justify-between mb-4">
          <StatusStep label="Locked" active={statusConfig.stepIndex >= 0} index={0} />
          <div className="flex-1 h-1.5 mx-3 rounded-full bg-gradient-to-r from-gray-200 to-transparent" />
          <StatusStep label="Processing" active={statusConfig.stepIndex >= 1} index={1} />
          <div className="flex-1 h-1.5 mx-3 rounded-full bg-gradient-to-r from-gray-200 to-transparent" />
          <StatusStep label="Ready" active={statusConfig.stepIndex >= 2} index={2} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[#0F1A35]">{statusConfig.label}</p>
        </div>
      </div>

      {/* SECURE OTP VAULT - Elite Design */}
      <div className="px-6 md:px-8 py-8 border-b border-[#B37C1C]/10">
        <div className="relative rounded-2xl border-2 border-dashed border-[#B37C1C] bg-gradient-to-br from-[#FFFBF2] to-[#F9F6F0] p-8">
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#B37C1C] rounded-tl-lg opacity-50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#B37C1C] rounded-tr-lg opacity-50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#B37C1C] rounded-bl-lg opacity-50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#B37C1C] rounded-br-lg opacity-50" />

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0F1A35]/70 mb-6 flex items-center justify-center gap-2">
              <span>🔒</span>
              <span>Secure Handoff PIN</span>
            </p>

            {/* PIN DISPLAY */}
            <motion.div
              initial={false}
              className="mb-6"
            >
              <p
                className={`font-mono text-4xl md:text-5xl font-black tracking-[0.5em] select-none transition-all duration-500 ${
                  isRevealed
                    ? "text-[#B37C1C]"
                    : "text-[#0F1A35]/20"
                }`}
              >
                {isRevealed ? order.otp_code.split("").join(" ") : "• • • •"}
              </p>
            </motion.div>

            {/* REVEAL BUTTON */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleReveal}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#B37C1C]/10 to-[#D4AF37]/10 border-2 border-[#B37C1C] text-[#B37C1C] font-bold text-sm hover:bg-gradient-to-r hover:from-[#B37C1C]/20 hover:to-[#D4AF37]/20 transition-all shadow-md"
            >
              {isRevealed ? (
                <>
                  <EyeOff size={16} /> Hide PIN
                </>
              ) : (
                <>
                  <Eye size={16} /> Tap to Reveal
                </>
              )}
            </motion.button>
          </div>

          {/* WARNING - Prominent */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-red-50 to-red-50/50 rounded-lg border-l-4 border-red-500 p-4 border-2 border-red-200"
          >
            <p className="text-xs text-red-700 font-bold leading-relaxed">
              ⚠️ <strong>CRITICAL:</strong> Supply this Secure Handoff PIN to the courier{" "}
              <strong>ONLY AFTER</strong> physically inspecting your items for damage or defects.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ACTION BUTTONS - Premium */}
      <div className="flex flex-col sm:flex-row gap-3 px-6 md:px-8 py-6">
        <motion.a
          whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(179, 124, 28, 0.2)" }}
          href={`https://wa.me/?text=Order%20%23${order.id}%20-%20Need%20support`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#0F1A35] to-[#1a2741] text-white font-bold hover:shadow-lg transition-all text-sm border border-[#0F1A35]/50"
        >
          <MessageCircle size={16} /> Hive Digital Secretary
        </motion.a>

        <motion.button
          whileHover={canCancel ? { scale: 1.02 } : {}}
          disabled={!canCancel}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all border-2 ${
            canCancel
              ? "border-red-500 text-red-600 hover:bg-red-50 hover:shadow-lg"
              : "border-gray-300 text-gray-400 opacity-40 cursor-not-allowed"
          }`}
        >
          <X size={16} /> Request Cancellation
        </motion.button>
      </div>
    </motion.div>
  );
};

interface StatusStepProps {
  label: string;
  active: boolean;
  index: number;
}

const StatusStep = ({ label, active, index }: StatusStepProps) => (
  <motion.div className="flex flex-col items-center">
    <motion.div
      initial={false}
      animate={{
        background: active
          ? "linear-gradient(135deg, #B37C1C 0%, #D4AF37 100%)"
          : "linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 100%)",
        borderColor: active ? "#B37C1C" : "#D1D5DB",
        boxShadow: active ? "0 4px 12px rgba(179, 124, 28, 0.3)" : "none",
      }}
      className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 font-bold transition-all"
    >
      <span className={active ? "text-white" : "text-gray-500"}>{index + 1}</span>
    </motion.div>
    <span className={`text-xs font-semibold text-center whitespace-nowrap ${
      active ? "text-[#B37C1C]" : "text-[#0F1A35]/60"
    }`}>
      {label}
    </span>
  </motion.div>
);

export default MyOrders;
