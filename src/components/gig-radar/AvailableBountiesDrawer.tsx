import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(batches.length > 1);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const newScroll = scrollContainerRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({ left: newScroll, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: "#D4A574" }}>
        <h2 className="text-base font-bold flex items-center gap-2 mb-1" style={{ color: "#0F1A35" }}>
          <span className="text-lg">📍</span>
          (Use the gold location pin)
        </h2>
        <h3 className="text-xl font-bold" style={{ color: "#0F1A35" }}>
          Available Bounties
        </h3>
        <p className="text-xs mt-1" style={{ color: "#0F1A35/60" }}>
          {batches.length} bounty batch{batches.length !== 1 ? "es" : ""} near you
        </p>
      </div>

      {/* Scrollable Cards Container */}
      <div className="flex-1 flex flex-col min-h-0">
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
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Navigation Arrows */}
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => scroll("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: "#FFFBF2",
                  border: "1px solid #D4A574",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft size={20} style={{ color: "#B37C1C" }} />
              </motion.button>
            )}

            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => scroll("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: "#FFFBF2",
                  border: "1px solid #D4A574",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={20} style={{ color: "#B37C1C" }} />
              </motion.button>
            )}

            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-4 flex gap-4 snap-x snap-mandatory scrollbar-hide"
              style={{
                scrollBehavior: "smooth",
              }}
            >
              {batches.map((batch) => (
                <div key={batch.batchId} className="snap-start">
                  <div
                    onClick={() => onClaimBatch(batch)}
                  >
                    <BountyCardEnhanced batch={batch} />
                  </div>
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
