import { motion } from "framer-motion";
import { Zap, Package, TrendingUp, Navigation, Clock, MapPin } from "lucide-react";
import { BatchedOrder } from "@/utils/orderClustering";

interface BountyCardEnhancedProps {
  batch: BatchedOrder;
  isSelected?: boolean;
  onClick?: () => void;
}

export const BountyCardEnhanced = ({
  batch,
  isSelected = false,
  onClick,
}: BountyCardEnhancedProps) => {
  const formattedPrice = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
  }).format(batch.totalEstimate);

  // Calculate individual order prices (distribute total estimate proportionally)
  const pricePerOrder = batch.totalEstimate / batch.orderCount;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-80 flex-shrink-0 rounded-xl p-4 cursor-pointer transition-all border"
      style={{
        backgroundColor: "#FFFBF2",
        borderColor: "#B37C1C",
        borderWidth: "1px",
        boxShadow: isSelected ? "0 8px 24px rgba(179, 124, 28, 0.25)" : "0 4px 12px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Header: Pickup info with icon */}
      <div className="mb-3 pb-3 border-b" style={{ borderColor: "#D4A574" }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#B37C1C" }}>
              Pickup
            </p>
            <h3 className="text-sm font-bold truncate" style={{ color: "#0F1A35" }}>
              {batch.pickupSmeNam}
            </h3>
          </div>
          <motion.div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ml-2"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ backgroundColor: "rgba(179, 124, 28, 0.15)" }}
          >
            <Package size={16} style={{ color: "#B37C1C" }} />
          </motion.div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b" style={{ borderColor: "#D4A574" }}>
        <div>
          <p className="text-xs" style={{ color: "#0F1A35/60" }}>
            Deliveries
          </p>
          <p className="text-lg font-bold" style={{ color: "#B37C1C" }}>
            {batch.orderCount}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#0F1A35/60" }}>
            Distance
          </p>
          <p className="text-lg font-bold flex items-center gap-1" style={{ color: "#0F1A35" }}>
            <MapPin size={12} />
            4.5km
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#0F1A35/60" }}>
            ETA
          </p>
          <p className="text-lg font-bold flex items-center gap-1" style={{ color: "#0F1A35" }}>
            <Clock size={12} />
            35m
          </p>
        </div>
      </div>

      {/* Individual Order Prices */}
      <div className="mb-3 pb-3 border-b space-y-2" style={{ borderColor: "#D4A574" }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#0F1A35/70" }}>
          Order Breakdown
        </p>
        {batch.dropoffs.slice(0, 3).map((dropoff, idx) => (
          <motion.div
            key={dropoff.orderId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between text-xs p-2 rounded-lg"
            style={{ backgroundColor: "rgba(179, 124, 28, 0.05)" }}
          >
            <div>
              <span className="font-semibold" style={{ color: "#0F1A35" }}>
                Order #{dropoff.orderId}
              </span>
              <span className="text-xs ml-2" style={{ color: "#0F1A35/60" }}>
                {dropoff.customer}
              </span>
            </div>
            <span className="font-bold" style={{ color: "#B37C1C" }}>
              ZMW {pricePerOrder.toFixed(2)}
            </span>
          </motion.div>
        ))}
        {batch.dropoffs.length > 3 && (
          <p className="text-xs font-semibold text-center" style={{ color: "#0F1A35/60" }}>
            +{batch.dropoffs.length - 3} more orders
          </p>
        )}
      </div>

      {/* Total Payout - Prominent */}
      <div
        className="mb-3 p-3 rounded-lg border"
        style={{
          backgroundColor: "rgba(179, 124, 28, 0.1)",
          borderColor: "#B37C1C",
        }}
      >
        <p className="text-xs uppercase tracking-wide font-bold mb-1" style={{ color: "#0F1A35/70" }}>
          Your Total Payout
        </p>
        <div className="flex items-baseline gap-2">
          <p
            className="text-2xl font-bold"
            style={{
              background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {formattedPrice}
          </p>
          <span className="text-xs font-semibold" style={{ color: "#0F1A35/60" }}>
            {batch.orderCount} orders
          </span>
        </div>
      </div>

      {/* CTA Button - Full Width */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 text-white"
        style={{
          background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
          boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)",
        }}
      >
        <Zap size={16} />
        ⚡ CLAIM ROUTE
      </motion.button>
    </motion.div>
  );
};

export default BountyCardEnhanced;
