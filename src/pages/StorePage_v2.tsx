import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, BadgeCheck, MessageCircle, ShoppingCart, Plus, Search, 
  ChevronDown, Star, Clock, MapPin, Zap, TrendingUp, Eye, Heart, Share2,
  Filter, SortAsc, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HoneycombBackground from "@/components/HoneycombBackground";
import Header from "@/components/Header";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/storefront/ProductCard";
import HeroSectionLanding from "@/components/storefront/HeroSectionLanding";
import StorefrontBot from "@/components/storefront/StorefrontBot";
import { useStoreCart } from "@/hooks/useStoreCart";
import { useAuth } from "@/hooks/useAuth";
import { loadCampaigns } from "@/lib/promoEngine";
import { toast } from "sonner";

interface StoreInfo {
  id: number;
  brand_name: string | null;
  business_type: string | null;
  description: string | null;
  banner_url: string | null;
  logo_url?: string | null;
  whatsapp_number: string | null;
  store_slug?: string | null;
  owner_user_id?: string | null;
}

interface OfferItem {
  id: number;
  product_name: string | null;
  price: number | null;
  old_price: number | null;
  image_url: string | null;
  category: string | null;
  stock_count: number | null;
  item_type: string | null;
  description: string | null;
  duration: string | null;
  location_type: string | null;
}

const StorePage_v2 = () => {
  const { storeKey } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "products" | "services">("all");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "price-low" | "price-high">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [sellerOrdersLeft, setSellerOrdersLeft] = useState<number>(1);
  const { addItem, itemCount } = useStoreCart(store?.id ?? null);

  useEffect(() => {
    if (!storeKey) return;
    (async () => {
      setLoading(true);
      const isNumeric = /^\d+$/.test(storeKey);
      const { data: storeData } = isNumeric
        ? await supabase.from("sme_stores").select("*").eq("id", Number(storeKey)).maybeSingle()
        : await (supabase.from("sme_stores").select("*") as any).eq("store_slug", storeKey).maybeSingle();

      if (storeData) {
        const s = storeData as unknown as StoreInfo;
        setStore(s);
        const { data: itemsData } = await supabase
          .from("hive_catalogue")
          .select("*")
          .eq("sme_id", s.id)
          .order("created_at", { ascending: false });
        setItems((itemsData as unknown as OfferItem[]) || []);

        if (s.owner_user_id) {
          const { data: ownerProf } = await supabase
            .from("profiles")
            .select("pulse_credits")
            .eq("user_id", s.owner_user_id)
            .maybeSingle();
          setSellerOrdersLeft(Number((ownerProf as any)?.pulse_credits ?? 0));
        }
      }
      setLoading(false);
    })();
  }, [storeKey]);

  const sellerHasCapacity = sellerOrdersLeft > 0;

  // Filter & Search
  const filtered = useMemo(() => {
    let result = items.filter((i) => {
      const matchesType =
        filter === "all" ? true : filter === "services" ? i.item_type === "service" : i.item_type !== "service";
      const matchesSearch =
        !searchQuery ||
        i.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });

    // Sort
    switch (sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-high":
        result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "popular":
        result = [...result].sort((a, b) => (b.stock_count ?? 0) - (a.stock_count ?? 0));
        break;
      default:
        // newest - already ordered by created_at
    }

    return result;
  }, [items, filter, searchQuery, sortBy]);

  // Stats
  const stats = {
    total: items.length,
    products: items.filter((i) => i.item_type !== "service").length,
    services: items.filter((i) => i.item_type === "service").length,
  };

  const handleBuyNow = (item: OfferItem) => {
    if (!sellerHasCapacity) return;
    const isPhysical = item.item_type !== "service" && item.item_type !== "digital";
    if (isPhysical && (item.stock_count ?? 0) <= 0) return;
    setSelectedItem({
      id: item.id,
      item_name: item.product_name || "Item",
      price: item.price || 0,
      image_url: item.image_url,
      store_name: store?.brand_name || "Store",
      sme_id: store?.id,
      store_id: store?.id,
      store_whatsapp: store?.whatsapp_number || null,
      item_type: item.item_type,
      duration: item.duration,
      location_type: item.location_type,
    });
    setDrawerOpen(true);
  };

  const handleAddToCart = (item: OfferItem) => {
    if (!sellerHasCapacity) return;
    if ((item.stock_count ?? 0) <= 0) return;
    addItem({
      offer_id: item.id,
      item_name: item.product_name || "Item",
      unit_price: item.price || 0,
      image_url: item.image_url,
      item_type: item.item_type ?? "physical",
    });
    toast.success(`Added "${item.product_name}" to cart`);
  };

  const handleMessageStore = async () => {
    if (!user) { toast.error("Sign in to message this store."); navigate("/login"); return; }
    if (!store?.owner_user_id) { toast.error("Store owner not available for messaging."); return; }
    if (store.owner_user_id === user.id) { toast.info("This is your own store."); return; }
    const a = user.id, b = store.owner_user_id;
    const { data: existing } = await supabase
      .from("conversations" as any)
      .select("id")
      .or(`and(participant_a.eq.${a},participant_b.eq.${b}),and(participant_a.eq.${b},participant_b.eq.${a})`)
      .maybeSingle();
    let convId = (existing as any)?.id;
    if (!convId) {
      const { data: created } = await supabase
        .from("conversations" as any)
        .insert({ participant_a: a, participant_b: b } as any)
        .select("id")
        .single();
      convId = (created as any).id;
    }
    navigate(`/messages?c=${convId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen relative">
        <HoneycombBackground />
        <Header />
        <div className="relative z-10 flex flex-col items-center justify-center py-20 px-4">
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Store Not Found</h2>
          <button onClick={() => navigate("/")} className="btn-gold px-6 py-2.5 text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <HoneycombBackground />
      <Header />

      <main className="relative z-10">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* HERO SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <div className="max-w-7xl mx-auto px-4">
            {/* Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden h-64 md:h-80 mb-6 border border-border/50">
              <div className={`absolute inset-0 ${store.banner_url ? '' : 'bg-gradient-to-br from-primary/20 via-secondary to-muted'}`}>
                {store.banner_url && (
                  <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Store Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-end gap-4 md:gap-6">
                  {/* Logo */}
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-card border-4 border-primary/20 flex items-center justify-center text-3xl md:text-5xl font-display font-bold text-primary shadow-2xl overflow-hidden shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      store.brand_name?.[0] || "S"
                    )}
                  </div>

                  {/* Store Title & Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h1 className="text-2xl md:text-4xl font-display font-bold text-white">{store.brand_name}</h1>
                      <BadgeCheck size={24} className="text-blue-400 shrink-0" />
                    </div>
                    <p className="text-white/90 text-sm md:text-base mb-3">{store.business_type || "Retail"}</p>
                    
                    {/* Quick Stats */}
                    <div className="flex gap-4 flex-wrap text-white text-xs md:text-sm">
                      <div className="flex items-center gap-1">
                        <Zap size={14} className="text-yellow-400" />
                        <span>{stats.total} items</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleMessageStore}
                      className="p-3 rounded-xl bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg hidden md:flex items-center gap-2"
                    >
                      <MessageCircle size={18} />
                      <span className="text-sm font-semibold">Message</span>
                    </button>
                    <button
                      onClick={handleMessageStore}
                      className="p-3 rounded-xl bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-lg md:hidden"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {store.description && (
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed mb-6">{store.description}</p>
            )}
          </div>
        </motion.section>

        {/* NEW 2-COLUMN HERO SECTION */}
        <HeroSectionLanding
          storeName={store.brand_name || "Store"}
          headline={`${store.brand_name || "Store"} Collection`}
          subheading={store.business_type || "Premium Quality, Fast Delivery"}
          description={store.description}
          featuredImageUrl={store.banner_url}
          logoUrl={store.logo_url}
          whatsappNumber={store.whatsapp_number}
          onShopClick={() => document.querySelector('[data-filter-products]')?.scrollIntoView({ behavior: 'smooth' })}
          onMessageClick={handleMessageStore}
        />

        {/* FILTER & SEARCH SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-7xl mx-auto px-4 mb-8"
        >
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, services, brands..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm md:text-base"
              />
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex gap-2 flex-wrap items-center">
              {/* Category Tabs */}
              <div className="flex gap-1 p-1.5 rounded-xl bg-secondary/50 border border-border">
                {(["all", "products", "services"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold capitalize transition-all ${
                      filter === f
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f} {f === "all" ? `(${stats.total})` : f === "products" ? `(${stats.products})` : `(${stats.services})`}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Sort Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-xs md:text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                  <SortAsc size={16} />
                  <span className="hidden sm:inline">Sort</span>
                  <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                  {(["newest", "popular", "price-low", "price-high"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        sortBy === s
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {s === "price-low" ? "Price: Low to High" : s === "price-high" ? "Price: High to Low" : s === "newest" ? "Newest First" : "Most Popular"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* PRODUCTS GRID */}
        <section className="max-w-7xl mx-auto px-4 mb-12" data-filter-products>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-semibold mb-2">No items found</p>
              <p className="text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {filtered.map((item, i) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  product_name={item.product_name}
                  price={item.price}
                  old_price={item.old_price}
                  image_url={item.image_url}
                  category={item.category}
                  stock_count={item.stock_count}
                  item_type={item.item_type}
                  description={item.description}
                  duration={item.duration}
                  location_type={item.location_type}
                  rating={(item as any).rating}
                  review_count={(item as any).review_count}
                  discount_type={(item as any).discount_type}
                  discount_value={(item as any).discount_value}
                  variants={(item as any).variants}
                  media_gallery={(item as any).media_gallery}
                  isService={item.item_type === "service"}
                  onBuyNow={handleBuyNow}
                  onAddToCart={handleAddToCart}
                  disabled={!sellerHasCapacity || (item.item_type !== "service" && item.item_type !== "digital" && (item.stock_count ?? 0) <= 0)}
                  disabledReason={!sellerHasCapacity ? "Vendor Unavailable" : "Out of Stock"}
                />
              ))}
            </motion.div>
          )}
        </section>
      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {itemCount > 0 && !cartOpen && !drawerOpen && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 20 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-bold">View Cart</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-background px-1.5 text-xs font-bold text-primary">
              {itemCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        storeId={store?.id ?? null}
        smeId={store?.id ?? null}
        storeName={store?.brand_name || "Store"}
        storeWhatsapp={store?.whatsapp_number ?? null}
      />

      {/* Bot Assistant */}
      <StorefrontBot
        storeName={store?.brand_name || "Store"}
        storeDescription={store?.description || ""}
      />
    </div>
  );
};

export default StorePage_v2;
