import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShoppingBag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CheckoutDrawer from "@/components/CheckoutDrawer";

const IVORY = "#FFFBF2";
const GOLD = "#B37C1C";
const NAVY = "#0F1A35";

interface PulseData {
  id: number;
  product_name: string | null;
  image_url: string | null;
  digital_vault: string | null;
  price: number | null;
  sme_id: number | null;
  category: string | null;
}

interface HotspotData {
  x: number;
  y: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
}

const PulsePublic = () => {
  const { pulseId } = useParams<{ pulseId: string }>();
  const navigate = useNavigate();
  
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Fetch pulse data on mount
  useEffect(() => {
    if (!pulseId) { setNotFound(true); setLoading(false); return; }

    (async () => {
      setLoading(true);
      // Extract numeric ID from pulseId (e.g., "p123" -> "123")
      const numericId = pulseId.replace(/^p/, "");
      const { data, error } = await supabase
        .from("hive_catalogue")
        .select("*")
        .eq("id", parseInt(numericId))
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPulseData(data as PulseData);
        // Parse hotspots if stored (for now, empty since we're building the route)
        setHotspots([]);
      }
      setLoading(false);
    })();
  }, [pulseId]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (notFound || !pulseData) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-4" style={{ background: NAVY }}>
        <ShoppingBag size={56} style={{ color: GOLD, opacity: 0.4 }} />
        <h1 className="text-2xl font-black" style={{ color: IVORY }}>Pulse Not Found</h1>
        <p className="text-sm" style={{ color: IVORY, opacity: 0.6 }}>This link has expired or doesn't exist.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-6 py-3 font-black rounded-xl border-2 transition-all hover:scale-105"
          style={{ background: GOLD, color: IVORY, borderColor: IVORY }}
        >
          Back to The Hive
        </button>
      </div>
    );
  }

  const mediaUrl = pulseData.digital_vault || pulseData.image_url;
  const isVideo = !!pulseData.digital_vault;

  const handleHotspotTap = (hotspot: HotspotData) => {
    setSelectedProduct({
      id: hotspot.product.id,
      item_name: hotspot.product.name,
      price: hotspot.product.price,
      image_url: hotspot.product.imageUrl || pulseData.image_url,
      store_name: pulseData.product_name,
      sme_id: pulseData.sme_id,
      store_id: pulseData.sme_id,
      item_type: "product",
    });
    setDrawerOpen(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: NAVY }}>
      {/* Full-bleed Media */}
      <div className="relative w-full h-full">
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img src={mediaUrl} alt={pulseData.product_name || "Pulse"} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex items-center justify-center h-full" style={{ background: GOLD }}>
            <ShoppingBag size={80} style={{ color: IVORY, opacity: 0.3 }} />
          </div>
        )}

        {/* Close button (top-left) */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-50 p-3 rounded-full border-2 transition-all hover:scale-110"
          style={{ background: "rgba(255, 251, 242, 0.9)", borderColor: IVORY, color: NAVY }}
        >
          <X size={20} />
        </button>

        {/* Hotspots */}
        {hotspots.map((hs, idx) => (
          <motion.button
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
            onClick={() => handleHotspotTap(hs)}
          >
            {/* Pulsing ring */}
            <span
              className="absolute rounded-full animate-pulse"
              style={{
                background: "transparent",
                border: `2px solid ${GOLD}`,
                width: 40,
                height: 40,
                margin: "-10px",
                opacity: 0.7,
              }}
            />

            {/* Glassmorphic tag */}
            <div
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black backdrop-blur-md border-2 shadow-lg whitespace-nowrap cursor-pointer transition-transform hover:scale-110"
              style={{
                background: "rgba(255, 251, 242, 0.9)",
                borderColor: GOLD,
                color: GOLD,
                boxShadow: `0 8px 32px rgba(179, 124, 28, 0.25)`,
              }}
            >
              ZMW {hs.product.price.toLocaleString()}
            </div>
          </motion.button>
        ))}

        {/* Bottom Gradient Overlay + CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${NAVY} 0%, rgba(15, 26, 53, 0.7) 50%, transparent 100%)`,
            height: "30%",
          }}
        />

        {/* Buy Now CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => {
            // Set default product from pulse data
            setSelectedProduct({
              id: pulseData.id,
              item_name: pulseData.product_name || "Product",
              price: pulseData.price || 0,
              image_url: mediaUrl,
              store_name: pulseData.category,
              sme_id: pulseData.sme_id,
              store_id: pulseData.sme_id,
              item_type: "product",
            });
            setDrawerOpen(true);
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 px-8 py-5 rounded-xl text-lg font-black border-[3px] shadow-[8px_8px_0px_rgba(15,26,53,0.4)] hover:scale-105 transition-transform pointer-events-auto"
          style={{
            background: GOLD,
            color: IVORY,
            borderColor: IVORY,
          }}
        >
          ⚡ BUY NOW
        </motion.button>
      </div>

      {/* Checkout Drawer */}
      <CheckoutDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedProduct}
      />
    </div>
  );
};

export default PulsePublic;
