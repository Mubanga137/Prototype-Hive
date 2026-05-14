import { useRef } from "react";
import { motion } from "framer-motion";
import { BountyCardEnhanced } from "./BountyCardEnhanced";
import { BatchedOrder } from "@/utils/orderClustering";

interface AvailableBountiesDrawerProps {
  batches: BatchedOrder[];
  onClaimBatch: (batch: BatchedOrder) => void;
  isLoading?: boolean;
}

export const AvailableBountiesDrawer = ({
  batches,
  onClaimBatch,
  isLoading = false,
}: AvailableBountiesDrawerProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-2 border-b" style={{ borderColor: "#D4A574" }}>
        <h3 className="text-lg font-bold" style={{ color: "#0F1A35" }}>
          Available Bounties
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "#0F1A35/60" }}>
          {batches.length} bounty batch{batches.length !== 1 ? "es" : ""} near you
        </p>
      </div>

      {/* Scrollable Cards Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: "#B37C1C",
                borderRightColor: "#B37C1C",
              }}
            />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-bold text-sm mb-1" style={{ color: "#0F1A35" }}>
              No bounties nearby
            </p>
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              Check back soon for new delivery opportunities
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4"
              style={{
                scrollBehavior: "smooth",
              }}
            >
              {batches.map((batch) => (
                <div
                  key={batch.batchId}
                  onClick={() => onClaimBatch(batch)}
                  className="cursor-pointer"
                >
                  <BountyCardEnhanced batch={batch} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AvailableBountiesDrawer;
