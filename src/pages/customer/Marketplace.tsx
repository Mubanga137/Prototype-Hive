import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, TrendingUp, Zap, Sparkles,
  Smartphone, Shirt, Music, UtensilsCrossed, FolderOpen, Search, SlidersHorizontal
} from "lucide-react";
import FeaturedItemCard, { type FeaturedItem } from "@/components/FeaturedItemCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import VendorCard, { type VendorData } from "@/components/VendorCard";
import HoneycombBackground from "@/components/HoneycombBackground";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categoryCards = [
  { label: "Tech", emoji: "📱", icon: Smartphone, color: "from-blue-500/20 to-blue-600/10" },
  { label: "Fashion", emoji: "👗", icon: Shirt, color: "from-pink-500/20 to-pink-600/10" },
  { label: "Food", emoji: "🍟", icon: UtensilsCrossed, color: "from-orange-500/20 to-orange-600/10" },
  { label: "Entertainment", emoji: "🎬", icon: Music, color: "from-purple-500/20 to-purple-600/10" },
  { label: "Beauty", emoji: "💄", icon: Sparkles, color: "from-rose-500/20 to-rose-600/10" },
];

const mapItem = (item: any): FeaturedItem => ({
  id: item.id,
  item_name: item.product_name || "Unnamed",
  price: item.price || 0,
  old_price: item.old_price,
  image_url: item.image_url,
  store_name: item.sme_stores?.brand_name || "The Hive Store",
  store_whatsapp: item.sme_stores?.whatsapp_number || null,
  category: item.category || "General",
  is_featured: (item.stock_count ?? 0) > 10,
  in_stock: (item.stock_count ?? 0) > 0,
  fast_delivery: item.fulfillment_type === "express",
  free_shipping: (item.price ?? 0) > 100,
  item_type: item.item_type === "service" ? "service" : "product",
  sme_id: item.sme_id,
});

const HorizontalScrollRow = ({ title, icon, items, badge, variant = "default" }: { title: string; icon: React.ReactNode; items: FeaturedItem[]; badge?: string; variant?: "default" | "hot" | "trending" }) => {
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const badgeClass = variant === "hot" ? "bg-red-500 text-white" : variant === "trending" ? "bg-orange-500 text-white" : "bg-destructive text-destructive-foreground";

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
        {badge && <span className={`${badgeClass} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{badge}</span>}
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {items.map((item, i) => (
          <div key={item.id} className="flex-shrink-0 w-[220px]">
            <FeaturedItemCard item={item} index={i} variant={variant} onBuyNow={(it) => { setSelectedItem(it); setDrawerOpen(true); }} />
          </div>
        ))}
      </div>
      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

const Marketplace = () => {
  const { profile } = useAuth();
  const [allItems, setAllItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(0);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hive_catalogue")
        .select("*, sme_stores(brand_name, whatsapp_number)")
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) { toast.error("Failed to load marketplace."); }
      if (data && data.length > 0) {
        setAllItems(data.map(mapItem));
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const userPreferences = profile?.preferences?.filter(p => !p.startsWith("philosophy:")) || [];
  const recommendedItems = userPreferences.length > 0
    ? allItems.filter(i => userPreferences.some(p => i.category?.toLowerCase().includes(p.toLowerCase())))
    : allItems.slice(0, 5);

  const hotDeals = allItems.filter(i => i.old_price).slice(0, 5);
  const trendingItems = [...allItems].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  const filteredItems = allItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto relative">
      <HoneycombBackground />
      <div className="relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <ShoppingBag size={24} className="text-primary" /> Marketplace
        </h2>
        <p className="text-muted-foreground mt-1">Browse products, services, and exclusive deals</p>
      </motion.div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search products, services, stores..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
          </div>
          <button className="px-4 py-3 rounded-xl bg-card border border-border hover:bg-secondary transition-colors">
            <SlidersHorizontal size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Category Cards Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-10">
          {categoryCards.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label === selectedCategory ? null : cat.label)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative h-32 sm:h-40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all border-2 overflow-hidden group ${
                  selectedCategory === cat.label
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:border-primary/50"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10">
                  <div className="text-4xl mb-2">{cat.emoji}</div>
                  <p className="text-xs sm:text-sm font-bold text-foreground text-center">{cat.label}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Quick Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1">
          <button onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"}`}>
            All
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No products in the catalogue yet. Check back soon!</p>
          </div>
          ) : null}
      </div>

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default Marketplace;
