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

interface HiveLinkData {
  id: number;
  product_name: string | null;
  image_url: string | null;
  digital_vault: string | null;
  price: number | null;
  sme_id: number | null;
  category: string | null;
}

interface SMEProfile {
  brand_name: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
}

const HiveLink = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState<HiveLinkData | null>(null);
  const [smeData, setSmeData] = useState<SMEProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch item & SME data on mount
  useEffect(() => {
    if (!itemId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const { data: item, error } = await supabase
        .from("hive_catalogue")
        .select("*")
        .eq("id", parseInt(itemId))
        .maybeSingle();

      if (error || !item) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setItemData(item as HiveLinkData);

      // Fetch SME profile if sme_id exists
      if (item.sme_id) {
        const { data: sme } = await supabase
          .from("sme_stores")
          .select("brand_name, logo_url")
          .eq("id", item.sme_id)
          .maybeSingle();

        if (sme) {
          setSmeData({ ...sme, is_verified: false } as SMEProfile);
        }
      }

      setLoading(false);
    })();
  }, [itemId]);

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

  if (notFound || !itemData) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-4" style={{ background: NAVY }}>
        <ShoppingBag size={56} style={{ color: GOLD, opacity: 0.4 }} />
        <h1 className="text-2xl font-black" style={{ color: IVORY }}>Link Not Found</h1>
        <p className="text-sm" style={{ color: IVORY, opacity: 0.6 }}>
          This link has expired or doesn't exist.
        </p>
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

  const mediaUrl = itemData.digital_vault || itemData.image_url;
  const isVideo = !!itemData.digital_vault;

  const handleBuyNow = () => {
    setDrawerOpen(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: NAVY }}>
      {/* Full-bleed Media Wrapper (100vh, 100vw) */}
      <div className="relative w-full h-full">
        {/* Media Content */}
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
            <img
              src={mediaUrl}
              alt={itemData.product_name || "Hive Link"}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full" style={{ background: GOLD }}>
            <ShoppingBag size={80} style={{ color: IVORY, opacity: 0.3 }} />
          </div>
        )}

        {/* Close Button (Top-Left) */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-50 p-3 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
          style={{ background: "rgba(255, 251, 242, 0.9)", borderColor: IVORY, color: NAVY }}
        >
          <X size={20} />
        </button>

        {/* Bottom Gradient Overlay (30% fade from bottom) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${NAVY} 0%, rgba(15, 26, 53, 0.8) 40%, transparent 100%)`,
            height: "35%",
          }}
        />

        {/* Merchant Trust Layer (Docked at bottom over gradient) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-24 left-0 right-0 z-30 px-5 pointer-events-none"
        >
          <div className="flex items-end gap-4">
            {/* SME Profile Picture & Brand Name */}
            <div className="flex items-end gap-3">
              {smeData?.logo_url ? (
                <img
                  src={smeData.logo_url}
                  alt={smeData.brand_name || "Merchant"}
                  className="w-14 h-14 rounded-full object-cover border-2 shrink-0"
                  style={{ borderColor: GOLD }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-2 shrink-0"
                  style={{ background: GOLD, borderColor: IVORY, color: IVORY }}
                >
                  <ShoppingBag size={24} />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-lg" style={{ color: IVORY }}>
                    {smeData?.brand_name || "Merchant"}
                  </p>
                  {smeData?.is_verified && (
                    <span className="text-lg" title="Verified Merchant">
                      ✅
                    </span>
                  )}
                </div>

                {/* Item Title */}
                <p className="text-sm font-bold mt-1" style={{ color: GOLD }}>
                  {itemData.product_name || "Product"}
                </p>
              </div>
            </div>

            {/* Gold Price (ZMW) */}
            <div className="ml-auto text-right pb-1">
              <p
                className="text-2xl font-black"
                style={{ color: GOLD, textShadow: `0 2px 8px rgba(0,0,0,0.3)` }}
              >
                ZMW {(itemData.price || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Fixed Pulsating BUY NOW CTA (Bottom Safe Area) */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          onClick={handleBuyNow}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-8 py-4 rounded-xl text-lg font-black border-[3px] pointer-events-auto"
          style={{
            background: GOLD,
            color: IVORY,
            borderColor: IVORY,
            boxShadow: `0 0 20px ${GOLD}80, 0 8px 16px rgba(0,0,0,0.3)`,
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulsating animation */}
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-block"
          >
            🛒 BUY NOW
          </motion.span>
        </motion.button>
      </div>

      {/* Checkout Drawer (Slides up over media) */}
      <CheckoutDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={{
          id: itemData.id,
          item_name: itemData.product_name || "Product",
          price: itemData.price || 0,
          image_url: mediaUrl || undefined,
          store_name: smeData?.brand_name || itemData.category || "The Hive",
          sme_id: itemData.sme_id || 0,
          store_id: itemData.sme_id || 0,
          item_type: "product",
        }}
      />
    </div>
  );
};

export default HiveLink;
