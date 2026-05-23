import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Copy, MessageCircle, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
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
  const deliveryTokens = activeOrders.length; // Simplified: one token per active order

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

  const copyOtp = (otp: string, orderId: number) => {
    navigator.clipboard.writeText(otp);
    toast.success("PIN copied to clipboard!");
  };

  const getStatusConfig = (status: string | null) => {
    const configs: Record<
      string,
      { label: string; color: string; stepIndex: number }
    > = {
      pending_payment: { label: "Payment Pending", color: "#B37C1C", stepIndex: 0 },
      pending_vendor: { label: "Awaiting Confirmation", color: "#B37C1C", stepIndex: 0 },
      locked: { label: "Locked", color: "#B37C1C", stepIndex: 0 },
      processing: { label: "Processing", color: "#B37C1C", stepIndex: 1 },
      ready_for_handoff: { label: "Ready for Hand-off", color: "#0F1A35", stepIndex: 2 },
      delivered: { label: "Delivered", color: "#22c55e", stepIndex: 3 },
      cancelled: { label: "Cancelled", color: "#ef4444", stepIndex: -1 },
    };
    return configs[status || "pending_payment"] || configs.pending_payment;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFFBF2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#0F1A35] text-lg font-semibold mb-4">
            Please sign in to view your orders
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-[#B37C1C] text-white rounded-lg font-semibold hover:bg-[#9b6816] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF2]">
      {/* LEDGER HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0F1A35] text-white sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Hello */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#B37C1C] flex items-center justify-center text-white font-bold">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-xs opacity-80">Welcome back</p>
                <p className="font-semibold text-sm">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "Buyer"}
                </p>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs opacity-80">Active Orders</p>
                <p className="text-xl font-bold text-[#B37C1C]">{activeCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Delivery Tokens</p>
                <p className="text-xl font-bold text-[#B37C1C]">{deliveryTokens}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FILTER TOGGLE */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 border-b border-gray-200">
        <div className="flex gap-2">
          <motion.button
            onClick={() => setFilterTab("active")}
            className={`relative px-4 py-2 text-sm font-semibold transition-colors ${
              filterTab === "active"
                ? "text-[#0F1A35]"
                : "text-gray-600 hover:text-gray-800"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            📦 Active Orders
            {filterTab === "active" && (
              <motion.div
                layoutId="filter-underline"
                className="absolute bottom-0 left-0 right-0 h-1 bg-[#B37C1C] rounded-full"
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
              />
            )}
          </motion.button>

          <motion.button
            onClick={() => setFilterTab("history")}
            className={`relative px-4 py-2 text-sm font-semibold transition-colors ${
              filterTab === "history"
                ? "text-[#0F1A35]"
                : "text-gray-600 hover:text-gray-800"
            }`}
            whileHover={{ scale: 1.02 }}
          >
            📜 Order History
            {filterTab === "history" && (
              <motion.div
                layoutId="filter-underline"
                className="absolute bottom-0 left-0 right-0 h-1 bg-[#B37C1C] rounded-full"
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
              />
            )}
          </motion.button>
        </div>
      </div>

      {/* ORDERS CONTENT */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#B37C1C]" />
          </div>
        ) : displayOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-600"
          >
            <p className="text-lg font-semibold text-[#0F1A35] mb-2">
              {filterTab === "active"
                ? "No active orders yet"
                : "No order history"}
            </p>
            <p className="text-sm mb-6">
              {filterTab === "active"
                ? "Start shopping to see your orders here!"
                : "Your completed orders will appear here."}
            </p>
            <a
              href="/customer-dash"
              className="inline-block px-6 py-3 bg-[#B37C1C] text-white rounded-lg font-semibold hover:bg-[#9b6816] transition-colors"
            >
              Continue Shopping
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
                  onCopyOtp={() => copyOtp(order.otp_code, order.id)}
                  statusConfig={getStatusConfig(order.status)}
                  index={idx}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
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
  const canCancel = ["pending_payment", "pending_vendor", "locked"].includes(
    order.status || ""
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* CARD HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="font-bold text-[#0F1A35] text-lg">
            Order #{order.id}
          </h3>
          <button
            onClick={onCopyOtp}
            className="ml-auto md:ml-0 p-1.5 text-gray-400 hover:text-[#B37C1C] transition-colors flex-shrink-0"
            title="Copy order ID"
          >
            <Copy size={16} />
          </button>
        </div>
        <div className="text-right ml-auto">
          <p className="text-xs text-gray-500">Vendor</p>
          <p className="text-sm font-semibold text-[#0F1A35] line-clamp-1">
            {order.brand_name}
          </p>
        </div>
      </div>

      {/* PRODUCT ROW */}
      <div className="flex gap-4 px-6 py-4 border-b border-gray-100">
        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
          {order.image_url ? (
            <img
              src={order.image_url}
              alt={order.product_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              📦
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0F1A35] line-clamp-1">
            {order.product_name}
          </p>
          <p className="text-lg font-bold text-[#B37C1C] mt-1">
            ZMW {order.total_price.toLocaleString()}
          </p>
        </div>
      </div>

      {/* STATUS STEPPER */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <StatusStep
            label="Locked"
            active={statusConfig.stepIndex >= 0}
            index={0}
          />
          <div className="flex-1 h-1 mx-2 rounded-full bg-gray-200" />
          <StatusStep
            label="Processing"
            active={statusConfig.stepIndex >= 1}
            index={1}
          />
          <div className="flex-1 h-1 mx-2 rounded-full bg-gray-200" />
          <StatusStep
            label="Ready"
            active={statusConfig.stepIndex >= 2}
            index={2}
          />
        </div>
        <p className="text-center text-xs text-gray-600 mt-3 font-medium">
          {statusConfig.label}
        </p>
      </div>

      {/* SECURE OTP VAULT */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="border-2 border-dashed border-[#B37C1C] rounded-lg p-6 bg-[#FFFBF2]">
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4">
              🔒 Secure PIN
            </p>

            {/* PIN DISPLAY */}
            <div className="relative inline-block">
              <p
                className={`font-mono text-3xl font-bold tracking-[0.3em] select-none transition-all duration-300 ${
                  isRevealed ? "text-[#0F1A35]" : "text-gray-400 blur-lg"
                }`}
              >
                {isRevealed
                  ? order.otp_code
                    .split("")
                    .join(" ")
                  : "•••• •••• •••• ••••"}
              </p>
            </div>

            {/* REVEAL BUTTON */}
            <button
              onClick={onToggleReveal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[#B37C1C] text-[#B37C1C] font-semibold text-xs hover:bg-[#B37C1C]/5 transition-colors"
            >
              {isRevealed ? (
                <>
                  <EyeOff size={14} /> Hide PIN
                </>
              ) : (
                <>
                  <Eye size={14} /> Tap to Reveal
                </>
              )}
            </button>
          </div>

          {/* WARNING */}
          <div className="bg-white rounded border-l-4 border-red-500 p-3">
            <p className="text-xs text-red-700 italic font-medium">
              ⚠️ <strong>Crucial:</strong> Supply this 4-Digit Secure Handoff PIN
              to the courier <strong>ONLY AFTER</strong> physically inspecting
              your items.
            </p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row gap-3 px-6 py-4">
        <a
          href={`https://wa.me/?text=Order%20%23${order.id}%20-%20Need%20support`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-[#0F1A35] text-[#0F1A35] font-semibold hover:bg-[#0F1A35]/5 transition-colors text-sm"
        >
          <MessageCircle size={16} /> Hive Digital Secretary
        </a>

        <button
          disabled={!canCancel}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
            canCancel
              ? "border-red-500 text-red-600 hover:bg-red-500/5 cursor-pointer"
              : "border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
          }`}
        >
          <X size={16} /> Request Cancellation
        </button>
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
  <div className="flex flex-col items-center">
    <motion.div
      initial={false}
      animate={{
        backgroundColor: active ? "#B37C1C" : "#e5e7eb",
        borderColor: active ? "#B37C1C" : "#d1d5db",
      }}
      className="w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2"
    >
      <span className={`text-xs font-bold ${active ? "text-white" : "text-gray-500"}`}>
        {index + 1}
      </span>
    </motion.div>
    <span className="text-xs text-gray-600 text-center whitespace-nowrap">{label}</span>
  </div>
);

export default MyOrders;
