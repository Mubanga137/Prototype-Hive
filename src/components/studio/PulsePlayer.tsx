import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";

/* ── Types ── */
export interface HotspotProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface Hotspot {
  id: string;
  x: number; // 0-100 %
  y: number; // 0-100 %
  product: HotspotProduct;
}

interface PulsePlayerProps {
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  hotspots: Hotspot[];
  /** Edit mode lets the user tap to place hotspots */
  editable?: boolean;
  onAddHotspot?: (x: number, y: number) => void;
  onLockDeal?: (product: HotspotProduct) => void;
  storeName?: string;
  storeLogoUrl?: string;
  /** When true, the LOCK DEAL CTA is disabled and relabeled "Vendor Unavailable". */
  outOfCapacity?: boolean;
}

const PulsePlayer: React.FC<PulsePlayerProps> = ({
  mediaUrl,
  mediaType,
  hotspots,
  editable = false,
  onAddHotspot,
  onLockDeal,
  storeName,
  storeLogoUrl,
  outOfCapacity = false,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<HotspotProduct | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Hotspot placement (edit mode) ── */
  const handleMediaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editable || !onAddHotspot) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onAddHotspot(x, y);
    },
    [editable, onAddHotspot]
  );

  /* ── Hotspot tap (experience mode) ── */
  const openDrawer = (product: HotspotProduct) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[420px] mx-auto overflow-hidden rounded-[4px] border-[3px] border-[#0F1A35] shadow-[6px_6px_0px_#0F1A35]"
      style={{ aspectRatio: "9/16", background: "#0F1A35" }}
    >
      {/* ── Media layer ── */}
      <div
        onClick={handleMediaClick}
        className={`absolute inset-0 ${editable ? "cursor-crosshair" : "cursor-default"}`}
      >
        {mediaUrl ? (
          mediaType === "video" ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img src={mediaUrl} alt="Pulse media" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "#B37C1C" }}>
            <ShoppingBag size={48} strokeWidth={1.5} />
            <p className="text-sm font-bold tracking-wide">Upload media to begin</p>
          </div>
        )}
      </div>

      {/* ── SME Identity Overlay (top-left) ── */}
      {mediaUrl && storeName && (
        <div className="absolute top-3 left-3 z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full border-2 backdrop-blur-md"
            style={{
              background: "rgba(255, 251, 242, 0.85)",
              borderColor: "#B37C1C",
            }}
          >
            {storeLogoUrl ? (
              <img
                src={storeLogoUrl}
                alt={storeName}
                className="w-5 h-5 rounded-full object-cover border border-[#B37C1C]"
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: "#B37C1C", color: "#FFFBF2" }}
              >
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-black text-[#0F1A35]">{storeName}</span>
          </motion.div>
        </div>
      )}

      {/* ── THE HIVE Logo (top-right) ── */}
      {mediaUrl && (
        <div className="absolute top-3 right-3 z-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide border-2 backdrop-blur-md"
            style={{
              background: "rgba(255, 251, 242, 0.85)",
              color: "#B37C1C",
              borderColor: "#B37C1C",
            }}
          >
            THE HIVE
          </motion.div>
        </div>
      )}

      {/* ── CTA overlay ── */}
      {mediaUrl && !editable && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border-2"
            style={{
              background: "rgba(255,251,242,0.85)",
              color: "#0F1A35",
              borderColor: "#B37C1C",
            }}
          >
            Tap a dot to shop 🛍️
          </motion.div>
        </div>
      )}

      {/* ── Edit mode badge ── */}
      {editable && mediaUrl && (
        <div className="absolute top-3 right-3 z-20">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2"
            style={{ background: "#B37C1C", color: "#FFFBF2", borderColor: "#0F1A35" }}
          >
            Edit Mode
          </span>
        </div>
      )}

      {/* ── Hotspot dots ── */}
      {hotspots.map((hs) => (
        <motion.button
          key={hs.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
          onClick={(e) => {
            e.stopPropagation();
            if (!editable) openDrawer(hs.product);
          }}
        >
          {/* Pulsing ring - Gold ring animation */}
          <span
            className="absolute rounded-full animate-pulse"
            style={{
              background: "transparent",
              border: "2px solid #B37C1C",
              width: 32,
              height: 32,
              margin: "-8px",
              opacity: 0.6,
            }}
          />

          {/* Glassmorphic tag with price */}
          <div
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black backdrop-blur-md border-2 shadow-lg whitespace-nowrap"
            style={{
              background: "rgba(255, 251, 242, 0.9)",
              borderColor: "#B37C1C",
              color: "#B37C1C",
              boxShadow: "0 8px 32px rgba(179, 124, 28, 0.15)",
            }}
          >
            <span>ZMW {hs.product.price.toLocaleString()}</span>
          </div>
        </motion.button>
      ))}

      {/* ── Store tag ── */}
      {mediaUrl && storeName && (
        <div className="absolute bottom-4 left-4 z-10">
          <span
            className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border-2"
            style={{ background: "#FFFBF2", color: "#0F1A35", borderColor: "#0F1A35" }}
          >
            @{storeName}
          </span>
        </div>
      )}

      {/* ── Bottom Sheet / Drawer ── */}
      <AnimatePresence>
        {isDrawerOpen && selectedProduct && (
          <>
            {/* Dim overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 z-30"
              style={{ background: "rgba(15,26,53,0.5)" }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl p-5 border-t-[3px]"
              style={{ background: "#FFFBF2", borderColor: "#0F1A35" }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1.5 rounded-full mx-auto mb-4" style={{ background: "#0F1A35", opacity: 0.2 }} />

              {/* Close */}
              <button
                onClick={closeDrawer}
                className="absolute top-4 right-4 p-1 rounded-full border-2"
                style={{ borderColor: "#0F1A35", color: "#0F1A35" }}
              >
                <X size={16} />
              </button>

              {/* Product card */}
              <div className="flex gap-4 items-start">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-20 h-20 rounded-lg object-cover border-2"
                    style={{ borderColor: "#0F1A35" }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-lg flex items-center justify-center border-2"
                    style={{ background: "#B37C1C", borderColor: "#0F1A35", color: "#FFFBF2" }}
                  >
                    <ShoppingBag size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black truncate" style={{ color: "#0F1A35" }}>
                    {selectedProduct.name}
                  </h3>
                  <p className="text-lg font-black mt-1" style={{ color: "#B37C1C" }}>
                    ZMW {selectedProduct.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  if (outOfCapacity) return;
                  onLockDeal?.(selectedProduct);
                  closeDrawer();
                }}
                disabled={outOfCapacity}
                className="w-full mt-5 py-3.5 rounded-xl text-sm font-black tracking-wide border-[3px] shadow-[4px_4px_0px_#0F1A35] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: outOfCapacity ? "#9CA3AF" : "#B37C1C",
                  color: "#FFFBF2",
                  borderColor: "#0F1A35",
                }}
              >
                {outOfCapacity ? "Vendor Unavailable" : "⚡ LOCK DEAL"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PulsePlayer;
