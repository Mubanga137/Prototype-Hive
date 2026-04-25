import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, BadgeCheck, MessageCircle, ShoppingCart, Plus, Search, 
  ChevronDown, Star, Clock, MapPin, Zap, TrendingUp, Eye, Heart, Share2,
  Filter, SortAsc, X, Package, CheckCircle, Users, Sparkles, Truck, BarChart3,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HoneycombBackground from "@/components/HoneycombBackground";
import Header from "@/components/Header";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/storefront/ProductCard";
import StorefrontBot from "@/components/storefront/StorefrontBot";
import ProfileHeader from "@/components/storefront/ProfileHeader";
import HeroSectionStorefront from "@/components/storefront/HeroSectionStorefront";
import { useStoreCart } from "@/hooks/useStoreCart";
import { useAuth } from "@/hooks/useAuth";
import { loadCampaigns } from "@/lib/promoEngine";
import { generateSmartContent } from "@/lib/smartContent";
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

const StorePage = () => {
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
    avgRating: 4.8,
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

  // Generate smart content
  const hasPhysical = items.some((i) => i.item_type !== "service" && i.item_type !== "digital");
  const hasServices = items.some((i) => i.item_type === "service");
  const hasDigital = items.some((i) => i.item_type === "digital");
  const smartContent = generateSmartContent(store?.description, hasPhysical, hasServices, hasDigital);

  const handleScrollToOffers = () => {
    const offersSection = document.getElementById("offers-section");
    offersSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative">
      <HoneycombBackground />
      <Header />

      {/* SECTION 1: PROFILE HEADER (Minimal top bar) */}
      <ProfileHeader
        logoUrl={store?.logo_url}
        brandName={store?.brand_name}
        onMessage={handleMessageStore}
      />

      <main className="relative z-10">
        {/* SECTION 2: HERO SECTION (Large layered design) */}
        <HeroSectionStorefront
          brandName={store?.brand_name}
          description={store?.description}
          bannerUrl={store?.banner_url}
          logoUrl={store?.logo_url}
          onShopNow={handleScrollToOffers}
        />

        {/* SECTION 3: TRUST BAR (Quick trust indicators) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-primary/5 to-primary/10 border-y border-primary/20 py-6 md:py-8"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BadgeCheck size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Verified</p>
                  <p className="text-sm font-bold text-foreground">Trusted Seller</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Star size={24} className="text-primary fill-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Rating</p>
                  <p className="text-sm font-bold text-foreground">{stats.avgRating} stars</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Clock size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Response</p>
                  <p className="text-sm font-bold text-foreground">{'2 hours'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Truck size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Shipping</p>
                  <p className="text-sm font-bold text-foreground">Fast & Secure</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 4: ACTIVITY FEED (Recent purchases/engagement) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="max-w-7xl mx-auto px-4 py-12 md:py-16"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">Recently Sold</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.slice(0, 3).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.product_name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-muted-foreground/40 m-auto" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.product_name}</p>
                  <p className="text-xs text-primary font-bold">ZMW {item.price}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={16} className="text-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SECTION 5: HOW IT WORKS (Auto-generated steps) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary/20 py-12 md:py-16"
        >
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-12 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {smartContent.howItWorks.map((step, idx) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4">
                      {step.number}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {idx < smartContent.howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-8 -right-3 transform translate-x-full">
                      <ArrowRight size={24} className="text-primary/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* SECTION 6: WHAT YOU GET (Auto-generated benefits) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="max-w-7xl mx-auto px-4 py-12 md:py-16"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">What You Get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {smartContent.whatYouGet.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-primary" />
                </div>
                <p className="text-sm md:text-base font-semibold text-foreground">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SECTION 7: AVAILABILITY (Dynamic status) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-7xl mx-auto px-4 py-8 md:py-12"
        >
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-6 md:p-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                <p className="text-sm font-bold text-primary uppercase">{smartContent.availability.badge}</p>
              </div>
              <p className="text-lg md:text-xl font-bold text-foreground">{smartContent.availability.message}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase mb-1">Current Status</p>
              <p className="text-2xl md:text-3xl font-bold text-primary">{smartContent.availability.status}</p>
            </div>
          </div>
        </motion.section>

        {/* SECTION 8: FEATURED OFFERS (Top/highlighted offers) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-secondary/20 py-12 md:py-16"
        >
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">Featured Offers</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.slice(0, 4).map((item, i) => (
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
            </div>
          </div>
        </motion.section>

        {/* SECTION 9: REVIEWS (Customer reviews & ratings) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-7xl mx-auto px-4 py-12 md:py-16"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">Customer Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Alice Johnson", rating: 5, text: "Amazing products and fast shipping! Highly recommend." },
              { name: "Michael Chen", rating: 5, text: "Excellent customer service and quality items." },
              { name: "Sarah Williams", rating: 4, text: "Great selection and competitive prices." },
            ].map((review, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{review.name}</p>
                    <div className="flex gap-1">
                      {Array(review.rating)
                        .fill(null)
                        .map((_, i) => (
                          <Star key={i} size={14} className="text-primary fill-primary" />
                        ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SECTION 10: FULL OFFER GRID (All offers with filters) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          id="offers-section"
          className="bg-secondary/20 py-12 md:py-16"
        >
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">All Offers</h2>

            {/* Search & Filters */}
            <div className="space-y-4 mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, services..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex gap-1 p-1.5 rounded-xl bg-card border border-border">
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
                      {f} ({f === "all" ? stats.total : f === "products" ? stats.products : stats.services})
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-xs md:text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors">
                    <SortAsc size={16} />
                    Sort
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
                        {s === "price-low" ? "Price: Low to High" : s === "price-high" ? "Price: High to Low" : s === "newest" ? "Newest" : "Popular"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Package size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold mb-2">No items found</p>
                <p className="text-sm">Try adjusting your filters</p>
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
          </div>
        </motion.section>
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

export default StorePage;
