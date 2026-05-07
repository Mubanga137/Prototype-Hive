import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingBag, MapPin, TrendingUp, Zap, Heart, Flame, ChevronRight, Sparkles
} from "lucide-react";
import FeaturedItemCard, { FeaturedItem } from "@/components/FeaturedItemCard";
import VendorCard, { VendorData } from "@/components/VendorCard";
import PremiumCategoryCard from "@/components/PremiumCategoryCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const categoryCards = [
  {
    label: "Fashion",
    description: "Trending styles, streetwear & formal wear",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F4bf015b55143432d9c1c69e328364ff3%2F4738e72a426d4c5592aa5a70cf81c44f?format=webp&width=800&height=1200",
    path: "/category/fashion",
    accentColor: "#3B4C8F",
  },
  {
    label: "Tech",
    description: "Latest gadgets, phones & smart devices",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F4bf015b55143432d9c1c69e328364ff3%2F4480a768d47d4386a883353f2f6a302f?format=webp&width=800&height=1200",
    path: "/category/tech",
    accentColor: "#06B6D4",
  },
  {
    label: "Entertainment",
    description: "Events, experiences & media services",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F4bf015b55143432d9c1c69e328364ff3%2Fe70524cb2bbe41ba95ac86c6a76936ba?format=webp&width=800&height=1200",
    path: "/category/entertainment",
    accentColor: "#8B5CF6",
  },
  {
    label: "Food",
    description: "Fresh meals, snacks & local delicacies",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F4bf015b55143432d9c1c69e328364ff3%2F04e2e15aa3524f06b0a1964a4a8b8dd5?format=webp&width=800&height=1200",
    path: "/category/food",
    accentColor: "#F97316",
  },
  {
    label: "Beauty",
    description: "Skincare, makeup & cosmetics",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F4bf015b55143432d9c1c69e328364ff3%2F9c864285676e4cb485d271b033e1cc3f?format=webp&width=800&height=1200",
    path: "/category/beauty",
    accentColor: "#EC4899",
  },
];

interface Props {
  firstName: string;
  greeting: string;
  setActiveSection: (s: string) => void;
}

const HorizontalScrollRow = ({
  title, icon, subtitle, badge, badgeColor, children
}: {
  title: string; icon: React.ReactNode; subtitle: string; badge?: string; badgeColor?: string; children: React.ReactNode;
}) => (
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
      {children}
    </div>
  </div>
);

const DashboardHomeSection = ({ firstName, greeting, setActiveSection }: Props) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCategoryNavigate = (categoryPath: string) => {
    navigate(categoryPath);
  };

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("hive_catalogue")
        .select("*, sme_stores(brand_name)")
        .limit(30);

      if (data && data.length > 0) {
        const mapped: FeaturedItem[] = data.map((item: any) => ({
          id: item.id,
          item_name: item.product_name || "Unnamed Item",
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
        setItems(mapped);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      const { data: storesData } = await supabase
        .from("sme_stores")
        .select("id, brand_name, description, owner_user_id, is_verified")
        .limit(6);

      if (storesData && storesData.length > 0) {
        const { data: productsData } = await supabase
          .from("hive_catalogue")
          .select("sme_id");

        const productCounts: Record<string, number> = {};
        productsData?.forEach((p: any) => {
          productCounts[p.sme_id] = (productCounts[p.sme_id] || 0) + 1;
        });

        const vendorsList: VendorData[] = storesData.map((store: any) => ({
          id: store.id,
          store_name: store.brand_name || "Unknown Store",
          description: store.description || "Quality products and services",
          verified: store.is_verified || false,
          product_count: productCounts[store.id] || 0,
          location: "Zambia",
          category: "Multi-category",
        }));
        setVendors(vendorsList);
      }
    };
    fetchVendors();
  }, []);

  const handleBuyNow = (item: FeaturedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  // Derive rows
  const userPrefs = (profile?.preferences || []).filter((p: string) => !p.startsWith("philosophy:"));
  const recommended = userPrefs.length > 0
    ? items.filter(i => userPrefs.some((p: string) => i.category?.toLowerCase().includes(p.toLowerCase())))
    : items.slice(0, 6);

  const trending = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
  const hotDeals = items.filter(i => i.old_price && i.old_price > i.price).slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-primary/20 text-sm font-medium text-muted-foreground mb-4">
          ✨ Welcome back to The Hive
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          {greeting}, <span className="text-primary">{firstName}</span>
        </h2>
        <p className="text-muted-foreground mt-2">Discover amazing products, exclusive deals, and services tailored just for you.</p>

        <div className="flex gap-3 mt-6">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setActiveSection("Marketplace")}
            className="btn-gold flex items-center gap-2 px-6 py-3 text-sm">
            <ShoppingBag size={16} /> Explore Marketplace
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setActiveSection("Track My Orders")}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold border-2 border-border rounded-xl text-foreground hover:bg-secondary transition-colors">
            <MapPin size={16} /> Track Orders
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveSection("Marketplace")}>
          <TrendingUp size={20} className="text-blue-500 mb-2" />
          <p className="text-xs text-muted-foreground">Trending Now</p>
          <p className="text-xl font-bold text-foreground">{trending.length}+</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveSection("Marketplace")}>
          <Zap size={20} className="text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Hot Deals</p>
          <p className="text-xl font-bold text-foreground">{hotDeals.length > 0 ? "50% OFF" : "Deals"}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveSection("Wallet")}>
          <Heart size={20} className="text-emerald-500 mb-2" />
          <p className="text-xs text-muted-foreground">Saved Items</p>
          <p className="text-xl font-bold text-foreground">{items.filter(i => i.is_featured).length}</p>
        </motion.div>
      </div>

            {/* Row 1: Recommended For You */}
      <HorizontalScrollRow
        title="Recommended For You"
        icon={<Sparkles size={20} className="text-primary" />}
        subtitle="Based on your taste profile"
        badge="PERSONALIZED"
        badgeColor="bg-primary"
      >
        {recommended.map((item, i) => (
          <FeaturedItemCard key={item.id} item={item} index={i} onBuyNow={handleBuyNow} onVisitStore={(it) => navigate(`/store/${it.sme_id || 1}`)} />
        ))}
      </HorizontalScrollRow>

      {/* Row 2: Trending Now */}
      <HorizontalScrollRow
        title="Trending Now"
        icon={<TrendingUp size={20} className="text-primary" />}
        subtitle="Most popular products right now"
        badge="TRENDING"
        badgeColor="bg-primary"
      >
        {trending.map((item, i) => (
          <FeaturedItemCard key={item.id} item={item} index={i} onBuyNow={handleBuyNow} onVisitStore={(it) => navigate(`/store/${it.sme_id || 1}`)} variant="trending" />
        ))}
      </HorizontalScrollRow>

      {/* Row 3: Hot Deals */}
      <HorizontalScrollRow
        title="Hot Deals"
        icon={<Flame size={20} className="text-primary" />}
        subtitle="Biggest discounts right now"
        badge="SAVE BIG"
        badgeColor="bg-primary"
      >
        {(hotDeals.length > 0 ? hotDeals : items.slice(0, 6)).map((item, i) => (
          <FeaturedItemCard key={item.id} item={item} index={i} onBuyNow={handleBuyNow} onVisitStore={(it) => navigate(`/store/${it.sme_id || 1}`)} variant="hot" />
        ))}
      </HorizontalScrollRow>

      {/* Row 4: Recommended Vendors */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display font-bold text-foreground">Recommended Vendors</h3>
            <p className="text-xs text-muted-foreground">Trusted stores on The Hive</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide pt-3">
          {vendors.length > 0 ? (
            vendors.map((vendor, i) => (
              <VendorCard key={vendor.id} vendor={vendor} index={i} onVisitStore={(v) => navigate(`/store/${v.id}`)} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No vendors available yet</p>
          )}
        </div>
      </div>

      {/* Row 5: Explore Categories (Premium) */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ChevronRight size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-foreground">Explore Categories</h3>
            <p className="text-xs text-muted-foreground">Curated shopping experiences</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {categoryCards.map((cat, i) => (
            <PremiumCategoryCard
              key={cat.label}
              label={cat.label}
              description={cat.description}
              imageUrl={cat.imageUrl}
              path={cat.path}
              accentColor={cat.accentColor}
              index={i}
            />
          ))}
        </div>
      </div>

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default DashboardHomeSection;
