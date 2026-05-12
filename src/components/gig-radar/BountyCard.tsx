import { motion } from "framer-motion";
import { Zap, Package, TrendingUp } from "lucide-react";
import { BatchedOrder } from "@/utils/orderClustering";

interface BountyCardProps {
  batch: BatchedOrder;
  isSelected?: boolean;
  onClick?: () => void;
}

export const BountyCard = ({
  batch,
  isSelected = false,
  onClick,
}: BountyCardProps) => {
  const formattedPrice = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
  }).format(batch.totalEstimate);

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl p-4 cursor-pointer transition-all border-2 ${
        isSelected
          ? "ring-2 ring-offset-2"
          : ""
      }`}
      style={{
        backgroundColor: isSelected ? "rgba(179, 124, 28, 0.15)" : "#FFFBF2",
        borderColor: isSelected ? "#B37C1C" : "#D4A574",
        ringColor: "#B37C1C",
      }}
    >
      {/* Header: Pickup info */}
      <div className="mb-3 pb-3 border-b-2" style={{ borderColor: "#E8DCC8" }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#0F1A35/60" }}>
              📍 Pickup
            </p>
            <h3 className="text-sm font-bold truncate" style={{ color: "#0F1A35" }}>
              {batch.pickupSmeNam}
            </h3>
          </div>
          <motion.div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ml-2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" }}
          >
            <Zap size={16} className="text-white" />
          </motion.div>
        </div>
      </div>

      {/* Order info: count + total */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Package size={16} style={{ color: "#B37C1C" }} />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              Orders
            </p>
            <p className="text-lg font-bold" style={{ color: "#0F1A35" }}>
              {batch.orderCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: "#B37C1C" }} />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              Est. Earn
            </p>
            <p className="text-lg font-bold truncate" style={{ color: "#0F1A35" }}>
              {formattedPrice}
            </p>
          </div>
        </div>
      </div>

      {/* Dropoff list (compact) */}
      <div className="space-y-1 mb-3 pb-3 border-t-2" style={{ borderColor: "#E8DCC8" }}>
        {batch.dropoffs.map((dropoff, idx) => (
          <motion.div
            key={dropoff.orderId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="text-xs flex items-center gap-2"
            style={{ color: "#0F1A35/70" }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
              style={{ background: "#B37C1C", color: "white" }}
            >
              {idx + 1}
            </span>
            <span className="truncate">
              {dropoff.customer} • {dropoff.phone.slice(-4)}
            </span>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
        style={{
          background: isSelected
            ? "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)"
            : "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)",
          color: "white",
          opacity: isSelected ? 1 : 0.85,
        }}
      >
        <Zap size={14} />
        {isSelected ? "View Route" : "View Details"}
      </motion.button>
    </motion.div>
  );
};
