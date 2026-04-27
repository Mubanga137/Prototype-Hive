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
import { generateVariants } from "@/lib/variantGenerator";
import { toast } from "sonner";

interface ProductVariant {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  description: string;
  valueProposition: string;
  tag?: "Best Value" | "Most Popular" | "Premium" | "Starter";
  features: string[];
}

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
  variants?: ProductVariant[];
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

// Create dummy products with auto-generated variants
const createDummyProducts = (): OfferItem[] => {
  const baseProducts = [
    {
      id: 1,
      product_name: "Premium Leather Bag",
      price: 2500,
      old_price: 3200,
      image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop",
      category: "Bags",
      stock_count: 15,
      item_type: "product" as const,
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
      item_type: "product" as const,
      description: "UV-protected designer sunglasses",
      duration: null,
      location_type: null,
    },
    {
      id: 3,
      product_name: "Style Consultation",
      price: 500,
      old_price: null,
      image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
      category: "Services",
      stock_count: null,
      item_type: "service" as const,
      description: "Personal style consultation service",
      duration: "1 hour",
      location_type: "online",
    },
  ];

  // Generate variants for each product
  return baseProducts.map((product) => {
    const generated = generateVariants(
      product.product_name!,
      product.price || 1000,
      product.item_type as "product" | "service",
      product.category,
      product.description || undefined
    );

    return {
      ...product,
      variants: generated.variants,
    };
  });
};

const DUMMY_PRODUCTS = createDummyProducts();

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

  // Filter & Search - VARIANTS ONLY
  const filteredVariants = useMemo(() => {
    // Flatten all variants from all products
    const allVariants: Array<ProductVariant & { baseProductName: string; baseProductImage: string; baseItemType: string }> = [];

    items.forEach((product) => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant) => {
          allVariants.push({
            ...variant,
            baseProductName: product.product_name || "Product",
            baseProductImage: product.image_url || "",
            baseItemType: product.item_type || "product",
          });
        });
      }
    });

    // Filter by search query
    const result = allVariants.filter((v) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        v.title.toLowerCase().includes(searchLower) ||
        v.baseProductName.toLowerCase().includes(searchLower) ||
        v.description.toLowerCase().includes(searchLower) ||
        v.valueProposition.toLowerCase().includes(searchLower) ||
        v.features.some((f) => f.toLowerCase().includes(searchLower))
      );
    });

    // Sort by price (low to high) by default
    return result.sort((a, b) => a.price - b.price);
  }, [items, searchQuery]);

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
        <FeaturedOffers offers={filteredVariants.slice(0, 4).map((v, idx) => ({
          id: 5000 + idx, // Unique ID based on position
          product_name: v.title,
          price: v.price,
          old_price: v.originalPrice,
          image_url: v.baseProductImage,
          category: v.baseProductName,
          stock_count: 10,
          item_type: v.baseItemType,
          description: v.description,
          duration: null,
          location_type: null,
        }))} />

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

              </div>

              {/* Variants Grid */}
              {filteredVariants.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Package size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold mb-2">No items found</p>
                  <p className="text-sm">Try adjusting your search query</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  {filteredVariants.map((variant, index) => {
                    const variantId = parseInt(variant.id.replace(/\D/g, ''), 10) || (1000 + index);
                    return (
                    <ProductCard
                      key={variant.id}
                      id={variantId}
                      product_name={variant.title}
                      price={variant.price}
                      old_price={variant.originalPrice}
                      image_url={variant.baseProductImage}
                      category={variant.baseProductName}
                      stock_count={10}
                      item_type={variant.baseItemType}
                      description={variant.description}
                      rating={variant.tag === "Most Popular" ? 4.8 : variant.tag === "Premium" ? 4.9 : 4.5}
                      review_count={Math.floor(Math.random() * 100) + 10}
                      isService={variant.baseItemType === "service"}
                      onBuyNow={() => {
                        setSelectedItem({
                          id: variantId,
                          item_name: variant.title,
                          price: variant.price,
                          image_url: variant.baseProductImage,
                          store_name: store?.brand_name || "Store",
                          sme_id: store?.id,
                          store_id: store?.id,
                          store_whatsapp: store?.whatsapp_number || null,
                          item_type: variant.baseItemType,
                        });
                        setDrawerOpen(true);
                      }}
                      onAddToCart={() => {
                        addItem({
                          offer_id: variantId,
                          item_name: variant.title,
                          unit_price: variant.price,
                          image_url: variant.baseProductImage,
                          item_type: variant.baseItemType === "service" ? "service" : "physical",
                        });
                        toast.success(`Added "${variant.title}" to cart`);
                      }}
                      disabled={!sellerHasCapacity}
                      disabledReason={!sellerHasCapacity ? "Vendor Unavailable" : undefined}
                    />
                    );
                  })}
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
