import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Smartphone, Shirt, Music, UtensilsCrossed, Sparkles, ArrowRight } from "lucide-react";
import FeaturedItemCard, { type FeaturedItem } from "@/components/FeaturedItemCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import { supabase } from "@/integrations/supabase/client";

const categoryCards = [
  { label: "Tech", emoji: "📱", icon: Smartphone, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Latest gadgets & devices" },
  { label: "Fashion", emoji: "👗", icon: Shirt, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Trendy clothing & accessories" },
  { label: "Food", emoji: "🍟", icon: UtensilsCrossed, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Fresh & organic delights" },
  { label: "Entertainment", emoji: "🎬", icon: Music, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Events & bookings" },
  { label: "Beauty", emoji: "💄", icon: Sparkles, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Beauty & skincare" },
];

const Categories = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allItems, setAllItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("hive_catalogue")
        .select("*, sme_stores(brand_name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        const mapped: FeaturedItem[] = data.map((item: any) => ({
          id: item.id,
          item_name: item.product_name || "Unnamed",
          price: item.price || 0,
          old_price: item.old_price,
          image_url: item.image_url,
          store_name: item.sme_stores?.brand_name || "The Hive Store",
          category: item.category || "General",
          is_featured: (item.stock_count ?? 0) > 10,
          in_stock: (item.stock_count ?? 0) > 0,
          fast_delivery: item.fulfillment_type === "express",
          free_shipping: (item.price ?? 0) > 100,
          item_type: item.item_type === "service" ? "service" : "product",
          discount_percent: item.old_price ? Math.round(((item.old_price - (item.price || 0)) / item.old_price) * 100) : undefined,
          sme_id: item.sme_id,
        }));
        setAllItems(mapped);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const filtered = selected ? allItems.filter(i => i.category?.toLowerCase().includes(selected.toLowerCase())) : [];

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <FolderOpen size={24} className="text-primary" /> Categories
        </h2>
        <p className="text-muted-foreground mt-1">Browse by your favourite categories</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {categoryCards.map((cat, i) => (
          <motion.button
            key={cat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, type: "spring", damping: 20, stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(selected === cat.label ? null : cat.label)}
            className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all group p-6 ${
              selected === cat.label
                ? "border-primary ring-2 ring-primary/40 bg-primary/10"
                : "border-primary/20 hover:border-primary/50 bg-gradient-to-br from-card/60 to-secondary/30"
            }`}
          >
            {/* Animated background gradient */}
            <div className={`absolute inset-0 ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                  <span className="text-2xl">{cat.emoji}</span>
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>
              <motion.div
                animate={{ x: selected === cat.label ? 4 : 0 }}
                className="flex-shrink-0"
              >
                <ArrowRight size={18} className="text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </div>
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-lg font-display font-bold text-foreground mb-4">{selected} ({filtered.length} items)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <FeaturedItemCard key={item.id} item={item} index={i} onBuyNow={(it) => { setSelectedItem(it); setDrawerOpen(true); }} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No items in this category yet</p>
          )}
        </motion.div>
      )}

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default Categories;
