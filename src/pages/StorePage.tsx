import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, ChevronDown, SortAsc, Package, ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HoneycombBackground from "@/components/HoneycombBackground";
import Header from "@/components/Header";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/storefront/ProductCard";
import StorefrontBot from "@/components/storefront/StorefrontBot";
import HeroSectionEditorial from "@/components/storefront/HeroSectionEditorial";
import {
  ProfileHeader, TrustBar, ActivityFeed, HowItWorks, WhatYouGet,
  AvailabilityStatus, FeaturedOffers, ReviewsSection, FullOfferGrid
} from "@/components/storefront/StorefrontSections";
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

// Dummy store data for store ID 1
const DUMMY_STORE: StoreInfo = {
  id: 1,
  brand_name: "Lelayrilan",
  business_type: "Fashion & Accessories",
  description: "Premium fashion and accessories crafted with quality and care. Fast delivery and trusted by our customers.",
  banner_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
  logo_url: "https://images.unsplash.com/photo-1515562141207-5dfd823d3816?w=200&h=200&fit=crop",
  whatsapp_number: "+260960000001",
  store_slug: "lelayrilan",
  owner_user_id: null,
};

const DUMMY_PRODUCTS: OfferItem[] = [
  {
    id: 1,
    product_name: "Premium Leather Bag",
    price: 2500,
    old_price: 3200,
    image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop",
    category: "Bags",
    stock_count: 15,
    item_type: "product",
    description: "Handcrafted leather bag with premium materials",
    duration: null,
    location_type: null,
  },
  {
    id: 2,
    product_name: "Designer Sunglasses",
    price: 1200,
    old_price: 1500,
    image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop",
    category: "Eyewear",
    stock_count: 20,
    item_type: "product",
    description: "UV-protected designer sunglasses",
    duration: null,
    location_type: null,
  },
  {
    id: 3,
    product_name: "Elegant Scarf",
    price: 800,
    old_price: null,
    image_url: "https://images.unsplash.com/photo-1565631066963-c5facf338b96?w=300&h=300&fit=crop",
    category: "Accessories",
    stock_count: 30,
    item_type: "product",
    description: "Silk blend elegant scarf",
    duration: null,
    location_type: null,
  },
  {
    id: 4,
    product_name: "Style Consultation",
    price: 500,
    old_price: null,
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
    category: "Services",
    stock_count: null,
    item_type: "service",
    description: "Personal style consultation service",
    duration: "1 hour",
    location_type: "online",
  },
  {
    id: 5,
    product_name: "Gold Watch",
    price: 3500,
    old_price: 4500,
    image_url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=300&h=300&fit=crop",
    category: "Watches",
    stock_count: 8,
    item_type: "product",
    description: "Luxury gold-plated watch",
    duration: null,
    location_type: null,
  },
  {
    id: 6,
    product_name: "Casual Shoes",
    price: 1800,
    old_price: 2200,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
    category: "Footwear",
    stock_count: 25,
    item_type: "product",
    description: "Comfortable and stylish casual shoes",
    duration: null,
    location_type: null,
  },
  {
    id: 7,
    product_name: "Jewelry Set",
    price: 2200,
    old_price: 2800,
    image_url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
    category: "Jewelry",
    stock_count: 12,
    item_type: "product",
    description: "Elegant jewelry set with premium finish",
    duration: null,
    location_type: null,
  },
  {
    id: 8,
    product_name: "Fashion Makeover",
    price: 1200,
    old_price: null,
    image_url: "https://images.unsplash.com/photo-1488426862026-56a8ae30b134?w=300&h=300&fit=crop",
    category: "Services",
    stock_count: null,
    item_type: "service",
    description: "Complete fashion makeover service",
    duration: "3 hours",
    location_type: "in-person",
  },
];

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

      // Check if this is the demo store ID 1
      if (isNumeric && Number(storeKey) === 1) {
        setStore(DUMMY_STORE);
        setItems(DUMMY_PRODUCTS);
        setLoading(false);
        return;
      }

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

  return (
    <div className="min-h-screen relative">
      <HoneycombBackground />
      <Header />

      {/* SECTION 1: PROFILE HEADER */}
      {store && <ProfileHeader storeName={store.brand_name || 'Store'} businessType={store.business_type} />}

      <main className="relative z-10">
        {/* SECTION 2: HERO SECTION with editorial design */}
        {store && (
          <HeroSectionEditorial
            storeName={store.brand_name || 'Store'}
            heroTitle={store.brand_name || 'Store'}
            heroSubtitle="Premium Quality, Fast Delivery"
            heroImageUrl={(store as any).hero_image_url}
            bannerUrl={store.banner_url}
            logoUrl={store.logo_url}
            description={store.description}
            whatsappNumber={store.whatsapp_number}
            onMessageClick={handleMessageStore}
            onShopClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          />
        )}

        {/* SECTION 3: TRUST BAR */}
        <TrustBar />

        {/* SECTION 4: ACTIVITY FEED */}
        <ActivityFeed />

        {/* SECTION 5: HOW IT WORKS */}
        <HowItWorks businessType={store?.business_type} />

        {/* SECTION 6: WHAT YOU GET */}
        <WhatYouGet businessType={store?.business_type} />

        {/* SECTION 7: AVAILABILITY STATUS */}
        <AvailabilityStatus />

        {/* SECTION 8: FEATURED OFFERS (top 4) */}
        <FeaturedOffers offers={filtered.slice(0, 4)} />

        {/* SECTION 9: REVIEWS */}
        <ReviewsSection />

        {/* SECTION 10: FULL OFFER GRID with filters and search */}
        <section className="py-8 md:py-12 bg-gradient-to-br from-secondary/30 to-background">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="space-y-6">
              {/* Search & Filter Controls */}
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

              {/* Offers Grid */}
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Package size={48} className="mx-auto mb-4 opacity-30" />
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
                  {filtered.map((item) => (
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
          </div>
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

export default StorePage;
