import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingBag, TrendingUp, Zap, Sparkles, Heart, Flame, Search, SlidersHorizontal
} from "lucide-react";
import FeaturedItemCard, { type FeaturedItem } from "@/components/FeaturedItemCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import GlobalFooter from "@/components/GlobalFooter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const HorizontalScrollRow = ({ title, icon, subtitle, badge, badgeColor, items, variant = "default" }: { title: string; icon: React.ReactNode; subtitle: string; badge?: string; badgeColor?: string; items: FeaturedItem[]; variant?: "default" | "hot" | "trending" }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${badgeColor || "bg-primary"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-3">
        {items.map((item, i) => (
          <FeaturedItemCard key={item.id} item={item} index={i} variant={variant} onBuyNow={() => {}} />
        ))}
      </div>
    </div>
  );
};

const Marketplace = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [allItems, setAllItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Derive rows (mirroring DashboardHomeSection structure)
  const userPrefs = (profile?.preferences || []).filter((p: string) => !p.startsWith("philosophy:"));
  const recommended = userPrefs.length > 0
    ? allItems.filter(i => userPrefs.some((p: string) => i.category?.toLowerCase().includes(p.toLowerCase())))
    : allItems.slice(0, 8);

  const trending = [...allItems].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
  const hotDeals = allItems.filter(i => i.old_price && i.old_price > i.price).slice(0, 8);

  const filteredItems = allItems.filter(item =>
    !searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          Marketplace
        </h2>
        <p className="text-muted-foreground mt-2">Discover amazing products and exclusive deals.</p>

        {/* Search Bar */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, services, stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              style={{ borderColor: "#B37C1C" }}
            />
          </div>
          <button className="px-4 py-3 rounded-xl bg-card border border-border hover:bg-secondary transition-colors">
            <SlidersHorizontal size={18} className="text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products in the catalogue yet. Check back soon!</p>
        </div>
      ) : (
        <>
          {/* Row 1: Recommended */}
          <HorizontalScrollRow
            title="Recommended For You"
            icon={<Heart size={20} className="text-primary" />}
            subtitle="Based on your interests"
            items={recommended}
          />

          {/* Row 2: Trending */}
          <HorizontalScrollRow
            title="Trending Now"
            icon={<TrendingUp size={20} className="text-primary" />}
            subtitle="Most popular items"
            items={trending}
            badge="HOT"
            badgeColor="bg-orange-500"
          />

          {/* Row 3: Hot Deals */}
          <HorizontalScrollRow
            title="Hot Deals"
            icon={<Flame size={20} className="text-primary" />}
            subtitle="Limited time offers"
            items={hotDeals}
            badge="SALE"
            badgeColor="bg-red-500"
            variant="hot"
          />

          {/* Row 4: Recommended Vendors */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingBag size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-bold text-foreground">Featured Vendors</h3>
                <p className="text-xs text-muted-foreground">Shop from verified sellers</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-3">
              {[1, 2, 3, 4, 5, 6].map((vendorIdx) => (
                <motion.div
                  key={vendorIdx}
                  whileHover={{ scale: 1.05 }}
                  className="rounded-xl border border-border bg-card p-4 cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="w-full h-32 rounded-lg bg-secondary mb-3 flex items-center justify-center">
                    <ShoppingBag size={32} className="text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">Vendor {vendorIdx}</h4>
                  <p className="text-xs text-muted-foreground">Multi-category store</p>
                  <div className="mt-3 flex items-center gap-1 text-xs">
                    <span className="text-yellow-500">★★★★★</span>
                    <span className="text-muted-foreground">(124)</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Row 5: Categories Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-bold text-foreground">Browse Categories</h3>
                <p className="text-xs text-muted-foreground">Explore by category</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-3">
              {[
                { label: "Fashion", emoji: "👗", path: "/category/fashion" },
                { label: "Tech", emoji: "📱", path: "/category/tech" },
                { label: "Food", emoji: "🍔", path: "/category/food" },
                { label: "Beauty", emoji: "💄", path: "/category/beauty" },
                { label: "Entertainment", emoji: "🎬", path: "/category/entertainment" }
              ].map((cat) => (
                <motion.button
                  key={cat.label}
                  onClick={() => navigate(cat.path)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-24 rounded-xl border-2 border-border bg-card/50 hover:border-primary/50 flex flex-col items-center justify-center font-semibold text-foreground transition-all"
                  style={{
                    borderColor: "#B37C1C",
                    backgroundColor: "rgba(179, 124, 28, 0.05)"
                  }}
                >
                  <span className="text-3xl mb-1">{cat.emoji}</span>
                  <span className="text-xs">{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* All items (search results if applicable) */}
          {searchQuery && (
            <>
              <h3 className="text-lg font-display font-bold text-foreground mb-4">Search Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-8">
                {filteredItems.map((item, i) => (
                  <FeaturedItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    onBuyNow={(it) => { setSelectedItem(it); setDrawerOpen(true); }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />

      <GlobalFooter />
    </div>
  );
};

export default Marketplace;
