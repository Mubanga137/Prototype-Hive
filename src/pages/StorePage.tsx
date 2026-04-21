import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BadgeCheck, Store, MessageCircle, Tag, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HoneycombBackground from "@/components/HoneycombBackground";
import Header from "@/components/Header";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/storefront/ProductCard";
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
  prepaid_units?: number | null;
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
  const [filter, setFilter] = useState<"all" | "products" | "services">("all");
  const [activeCampaigns, setActiveCampaigns] = useState<{ code: string; discount_value: number; discount_type: string }[]>([]);
  // Seller's pulse_credits — drives the "Vendor Unavailable" public CTA gating.
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

        // Fetch the seller's order capacity (pulse_credits) — used for gating CTAs.
        if (s.owner_user_id) {
          const { data: ownerProf } = await supabase
            .from("profiles")
            .select("pulse_credits")
            .eq("user_id", s.owner_user_id)
            .maybeSingle();
          setSellerOrdersLeft(Number((ownerProf as any)?.pulse_credits ?? 0));
        }

        // Active campaigns from local promo engine
        const camps = loadCampaigns(s.id).filter((c) => c.status === "active");
        setActiveCampaigns(camps.map((c) => ({ code: c.code, discount_value: c.discount_value, discount_type: c.discount_type })));
      }
      setLoading(false);
    })();
  }, [storeKey]);

  // Vendor is "available" only when they have remaining order capacity.
  const sellerHasCapacity = sellerOrdersLeft > 0;

  const filtered = useMemo(() =>
    items.filter((i) =>
      filter === "all" ? true : filter === "services" ? i.item_type === "service" : i.item_type !== "service"
    ),
  [items, filter]);

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
    // Find or create a 1:1 conversation
    const a = user.id, b = store.owner_user_id;
    const { data: existing } = await supabase
      .from("conversations" as any)
      .select("id")
      .or(`and(participant_a.eq.${a},participant_b.eq.${b}),and(participant_a.eq.${b},participant_b.eq.${a})`)
      .maybeSingle();
    let convId = (existing as any)?.id;
    if (!convId) {
      const { data: created, error } = await supabase
        .from("conversations" as any)
        .insert({ participant_a: a, participant_b: b } as any)
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
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
          <Store size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Store Not Found</h2>
          <p className="text-muted-foreground text-sm mb-4">This store doesn't exist or has been removed.</p>
          <button onClick={() => navigate("/")} className="btn-gold px-6 py-2.5 text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <HoneycombBackground />
      <Header />
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-4 border border-border">
          <div className={`h-40 md:h-56 ${store.banner_url ? '' : 'bg-gradient-to-br from-primary/20 via-secondary to-muted'} flex items-end relative`}>
            {store.banner_url && <img src={store.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="relative z-10 p-6 w-full bg-gradient-to-t from-foreground/60 to-transparent">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-16 h-16 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-2xl font-display font-bold text-primary shadow-lg overflow-hidden">
                  {store.logo_url
                    ? <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    : (store.brand_name?.[0] || "S")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-display font-bold text-white">{store.brand_name || "Store"}</h1>
                    <BadgeCheck size={20} className="text-blue-400" />
                  </div>
                  <p className="text-white/80 text-sm">{store.business_type || "Retail"}</p>
                </div>
                <button onClick={handleMessageStore}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-lg">
                  <MessageCircle size={14} /> Message Store
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {store.description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{store.description}</p>
        )}

        {/* Promo banner */}
        {activeCampaigns.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center gap-2 flex-wrap">
            <Tag size={16} className="text-primary shrink-0" />
            <span className="text-sm text-foreground">
              {activeCampaigns.slice(0, 2).map((c, i) => (
                <span key={c.code}>
                  {i > 0 && " · "}
                  Use <span className="font-mono font-bold text-primary">{c.code}</span> for{" "}
                  {c.discount_type === "percentage" ? `${c.discount_value}% off` : `ZMW ${c.discount_value} off`}
                </span>
              ))}
            </span>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Offers ({filtered.length})</h2>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            {(["all", "products", "services"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>{f}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No offers in this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          </div>
        )}
      </main>

      {/* Floating cart button — appears when cart has items */}
      <AnimatePresence>
        {itemCount > 0 && !cartOpen && !drawerOpen && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
            aria-label="Open cart"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-bold">View Cart</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-background px-1.5 text-xs font-bold text-primary">
              {itemCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        storeId={store?.id ?? null}
        smeId={store?.id ?? null}
        storeName={store?.brand_name || "Store"}
        storeWhatsapp={store?.whatsapp_number ?? null}
      />

      {/* Storefront Bot Assistant */}
      <StorefrontBot
        storeName={store?.brand_name || "Store"}
        storeDescription={store?.description || ""}
      />
    </div>
  );
};

export default StorePage;
