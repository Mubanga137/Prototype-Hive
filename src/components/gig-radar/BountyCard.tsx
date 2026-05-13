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
      className={`relative rounded-lg p-3 cursor-pointer transition-all border ${
        isSelected
          ? "ring-2 ring-offset-2"
          : ""
      }`}
      style={{
        background: isSelected
          ? "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)"
          : "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
        borderColor: "#0F1A35",
        color: "#FFFBF2",
        ringColor: "#FFFBF2",
      }}
    >
      {/* Header: Pickup info */}
      <div className="mb-2 pb-2 border-b" style={{ borderColor: "rgba(255, 251, 242, 0.2)" }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: "#FFFBF2/70" }}>
              Pickup
            </p>
            <h3 className="text-sm font-bold truncate" style={{ color: "#FFFBF2" }}>
              {batch.pickupSmeNam}
            </h3>
          </div>
          <motion.div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ml-2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ backgroundColor: "rgba(255, 251, 242, 0.2)" }}
          >
            <Zap size={14} style={{ color: "#FFFBF2" }} />
          </motion.div>
        </div>
      </div>

      {/* Order info: count + total */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Package size={14} style={{ color: "#FFFBF2" }} />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "#FFFBF2/70" }}>
              Orders
            </p>
            <p className="text-base font-bold" style={{ color: "#FFFBF2" }}>
              {batch.orderCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} style={{ color: "#FFFBF2" }} />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "#FFFBF2/70" }}>
              Est. Earn
            </p>
            <p className="text-base font-bold truncate" style={{ color: "#FFFBF2" }}>
              {formattedPrice}
            </p>
          </div>
        </div>
      </div>

      {/* Dropoff list (compact) */}
      <div className="space-y-0.5 mb-2 pb-2 border-t" style={{ borderColor: "rgba(255, 251, 242, 0.2)" }}>
        {batch.dropoffs.slice(0, 2).map((dropoff, idx) => (
          <motion.div
            key={dropoff.orderId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="text-xs flex items-center gap-2"
            style={{ color: "#FFFBF2/80" }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
              style={{ backgroundColor: "rgba(255, 251, 242, 0.3)", color: "#FFFBF2" }}
            >
              {idx + 1}
            </span>
            <span className="truncate">
              {dropoff.customer} • {dropoff.phone.slice(-4)}
            </span>
          </motion.div>
        ))}
        {batch.dropoffs.length > 2 && (
          <p className="text-xs font-semibold" style={{ color: "#FFFBF2/70" }}>
            +{batch.dropoffs.length - 2} more
          </p>
        )}
      </div>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5"
        style={{
          background: "rgba(255, 251, 242, 0.15)",
          color: "#FFFBF2",
          border: "1px solid rgba(255, 251, 242, 0.3)",
        }}
      >
        <Zap size={12} />
        {isSelected ? "View Route" : "View"}
      </motion.button>
    </motion.div>
  );
};
