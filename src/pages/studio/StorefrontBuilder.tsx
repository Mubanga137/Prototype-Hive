import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Globe, Upload, Rocket, Image as ImageIcon, Check, Loader2, Copy,
  ExternalLink, Plus, Edit, Trash2, Package, Briefcase, Cloud, FileVideo, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { saveStore } from "@/lib/ensureStore";
import OfferFormModalEnhanced, { OfferDraft, ItemType } from "@/components/storefront/OfferFormModalEnhanced";
import StorefrontPreview from "@/components/storefront/StorefrontPreview";

interface OfferRow {
  id: number;
  product_name: string | null;
  price: number | null;
  image_url: string | null;
  item_type: string | null;
  description?: string | null;
  duration?: string | null;
  location_type?: string | null;
  category?: string | null;
  stock_count?: number | null;
  stock_quantity?: number | null;
}

type SaveStatus = "idle" | "saving" | "saved";

const AUTOSAVE_DEBOUNCE_MS = 1500;

const StorefrontBuilder = () => {
  // Global state — guaranteed resolved before this component mounts
  // (AuthProvider gates the whole app behind WorkspaceSplash).
  const { user, currentStore, refreshStore } = useAuth();

  // Editable draft fields
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // UX state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Offers
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [filter, setFilter] = useState<"all" | "products" | "services">("all");
  const [offerOpen, setOfferOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferDraft | null>(null);

  // Uploads
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Autosave bookkeeping
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOffers = useCallback(async (sid: number) => {
    const { data } = await supabase
      .from("hive_catalogue")
      .select("*")
      .eq("sme_id", sid)
      .order("created_at", { ascending: false });
    setOffers((data as OfferRow[]) || []);
  }, []);

  // Hydrate editable fields from currentStore + draft_data overlay.
  useEffect(() => {
    if (!currentStore) return;
    const draft = ((currentStore as any).draft_data || {}) as Partial<{
      brand_name: string; description: string; banner_url: string;
      logo_url: string; whatsapp_number: string; store_slug: string;
    }>;
    setBrandName(draft.brand_name ?? currentStore.brand_name ?? "");
    setDescription(draft.description ?? currentStore.description ?? "");
    setBannerUrl(draft.banner_url ?? currentStore.banner_url ?? "");
    setLogoUrl(draft.logo_url ?? currentStore.logo_url ?? "");
    setWhatsappNumber(draft.whatsapp_number ?? currentStore.whatsapp_number ?? "");
    setStoreSlug(draft.store_slug ?? currentStore.store_slug ?? slugify(currentStore.brand_name || `store-${currentStore.id}`));
    fetchOffers(currentStore.id);
    // Allow autosave only AFTER initial hydration completes.
    hydratedRef.current = false;
    const t = setTimeout(() => { hydratedRef.current = true; }, 50);
    return () => clearTimeout(t);
  }, [currentStore, fetchOffers]);

  // ----- Autosave (debounced write of draft_data only) ---------------
  useEffect(() => {
    if (!hydratedRef.current || !currentStore) return;

    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const draftPayload = {
        brand_name: brandName,
        description,
        banner_url: bannerUrl,
        logo_url: logoUrl,
        whatsapp_number: whatsappNumber,
        store_slug: slugify(storeSlug || brandName),
      };
      const { error } = await (supabase
        .from("sme_stores") as any)
        .update({ draft_data: draftPayload })
        .eq("id", currentStore.id);

      if (error) {
        setSaveStatus("idle");
        toast.error("Autosave failed: " + error.message);
        return;
      }
      setSaveStatus("saved");
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setSaveStatus("idle"), 2200);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [brandName, description, bannerUrl, logoUrl, whatsappNumber, storeSlug, currentStore]);

  // ---------- Image uploads ----------
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) { toast.error("Sign in to upload images."); return null; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hive_media").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("hive_media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingLogo(true);
    const url = await uploadFile(f, "logo");
    if (url) setLogoUrl(url); // triggers autosave
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingBanner(true);
    const url = await uploadFile(f, "banner");
    if (url) setBannerUrl(url);
    setUploadingBanner(false);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  // ---------- Launch (promote draft → live, MERGE strategy) ----------
  const handleLaunch = async () => {
    if (!currentStore) { toast.error("Workspace not ready yet."); return; }
    setLaunching(true);

    // Flush any pending autosave first.
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }

    const desiredSlug = slugify(storeSlug || brandName) || `store-${user!.id.slice(0, 8)}`;

    // MERGE: draft wins, but live keeps anything not in the draft.
    const livePatch: Record<string, any> = {
      brand_name: brandName.trim() || currentStore.brand_name || "My Store",
      description: description ?? currentStore.description,
      banner_url: bannerUrl || currentStore.banner_url || null,
      logo_url: logoUrl || currentStore.logo_url || null,
      whatsapp_number: whatsappNumber || currentStore.whatsapp_number || null,
      store_slug: desiredSlug,
      draft_data: {}, // reset draft after publish
    };

    const { store, error } = await saveStore(user, livePatch);
    setLaunching(false);

    if (error || !store) {
      toast.error(error || "Could not launch — please try again.");
      return;
    }

    // Optimize: use the returned store data instead of fetching again
    // Only call refreshStore if we need to sync auth context
    setStoreSlug(store.store_slug || desiredSlug);
    toast.success("🚀 Store launched!");

    // Open the store in a new tab immediately (don't wait for refreshStore)
    const storeUrl = store.store_slug
      ? `/store/${store.store_slug}`
      : `/store/${store.id}`;
    window.open(storeUrl, "_blank");

    // Refresh auth context in background (non-blocking)
    void refreshStore();
  };

  // ---------- Offers ----------
  const handleEditOffer = (o: OfferRow) => {
    const t = (o.item_type === "service" ? "service" : (o.item_type === "digital" ? "digital" : "physical")) as ItemType;
    setEditingOffer({
      id: o.id,
      name: o.product_name || "",
      price: String(o.price ?? ""),
      description: o.description || "",
      image_url: o.image_url || "",
      item_type: t,
      stock: String(o.stock_quantity ?? o.stock_count ?? ""),
      duration: o.duration || "",
      location_type: (o.location_type as any) || "",
      category: o.category || "",
      discount_type: (o as any).discount_type || "none",
      discount_value: (o as any).discount_value ? String((o as any).discount_value) : "",
      variants: (o as any).variants || [],
      media_gallery: (o as any).media_gallery || [],
    });
    setOfferOpen(true);
  };

  const handleDeleteOffer = async (id: number) => {
    const { error } = await supabase.from("hive_catalogue").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Offer removed.");
    if (currentStore) fetchOffers(currentStore.id);
  };

  const openAddOffer = () => {
    if (!currentStore) { toast.error("Workspace not ready yet."); return; }
    setEditingOffer(null);
    setOfferOpen(true);
  };

  // ---------- Derived ----------
  const storeUrl = storeSlug
    ? `${window.location.origin}/store/${storeSlug}`
    : currentStore
      ? `${window.location.origin}/store/${currentStore.id}`
      : "";

  const copyLink = async () => {
    if (!storeUrl) { toast.error("Save your store first."); return; }
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 1800);
  };

  const filtered = offers.filter((o) =>
    filter === "all" ? true : filter === "services" ? o.item_type === "service" : o.item_type !== "service"
  );

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

  // No local "bootstrapping" splash needed — AuthProvider already gated us.
  // If we somehow render without a store (non-vendor accidentally here), bail clean.
  if (!currentStore) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Globe size={26} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Storefront is only available for Vendor accounts.</p>
        </div>
      </DashboardLayout>
    );
  }

  // ---------- Save indicator (top-right) ----------
  const SaveIndicator = () => (
    <AnimatePresence mode="wait">
      {saveStatus === "saving" && (
        <motion.div key="saving" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/70 border border-border text-xs font-semibold text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </motion.div>
      )}
      {saveStatus === "saved" && (
        <motion.div key="saved" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
          <Check size={12} /> Saved to Drafts
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe size={22} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Storefront Builder</h2>
              <p className="text-sm text-muted-foreground">Design, manage offers, and launch your store</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator />
            <button onClick={openAddOffer} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm">
              <Plus size={16} /> Add Offer
            </button>
          </div>
        </div>

        {/* INVENTORY ANALYTICS DASHBOARD */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Items */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Items</p>
              <Package size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{offers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Products & Services</p>
          </div>

          {/* Products */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Products</p>
              <Package size={16} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{offers.filter((o) => o.item_type !== "service").length}</p>
            <p className="text-xs text-muted-foreground mt-1">Physical & Digital</p>
          </div>

          {/* Services */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Services</p>
              <Briefcase size={16} className="text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{offers.filter((o) => o.item_type === "service").length}</p>
            <p className="text-xs text-muted-foreground mt-1">Bookable Services</p>
          </div>

          {/* Available Stock */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">In Stock</p>
              <Zap size={16} className="text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{offers.reduce((sum, o) => sum + (o.stock_count ?? 0), 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Units</p>
          </div>
        </motion.div>

        {/* Public link card */}
        {storeUrl && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/30 rounded-2xl p-6 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Your Public Store Link</p>
              <p className="text-sm md:text-base font-medium text-foreground truncate font-mono">{storeUrl}</p>
            </div>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy Link"}
            </button>
            <a href={storeUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              <ExternalLink size={14} /> View Store
            </a>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Identity controls */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6 space-y-5 h-fit">
            {/* Logo */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Store Logo</label>
              <div className="flex items-center gap-4">
                <div onClick={() => logoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                  {uploadingLogo ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> :
                    logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> :
                    <Upload size={20} className="text-muted-foreground/40" />}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <p className="text-xs text-muted-foreground">Click to upload your logo</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Store Name</label>
              <input value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  if (!slugTouched) setStoreSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Lusaka Threads" className={inputClass} />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Store URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/store/</span>
                <input value={storeSlug}
                  onChange={(e) => { setSlugTouched(true); setStoreSlug(slugify(e.target.value)); }}
                  placeholder="lusaka-threads" className={inputClass} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">If taken, we'll automatically append a number.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your store..." rows={3} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Banner Image</label>
              <div onClick={() => bannerInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                {uploadingBanner ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> :
                  bannerUrl ? <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" /> :
                  <div className="text-center"><ImageIcon size={24} className="mx-auto text-muted-foreground/40" /><p className="text-xs text-muted-foreground mt-1">Upload banner</p></div>}
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">WhatsApp Number</label>
              <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+260 9XX XXX XXX" className={inputClass} />
            </div>

            <button onClick={handleLaunch} disabled={launching}
              className="btn-gold w-full py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {launching ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
              🚀 LAUNCH ONLINE STORE
            </button>
            <p className="text-[10px] text-center text-muted-foreground">
              Drafts autosave as you type. Click Launch to publish to your public link.
            </p>
          </motion.div>

          {/* MIDDLE: Offers list */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-foreground">Your Offers ({offers.length})</h3>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
                {(["all", "products", "services"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
                      filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">No offers yet.</p>
                <button onClick={openAddOffer}
                  className="btn-gold inline-flex items-center gap-2 px-4 py-2 text-xs">
                  <Plus size={14} /> Create your first offer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[680px] overflow-auto pr-1">
                <AnimatePresence>
                  {filtered.map((o) => {
                    const isService = o.item_type === "service";
                    const totalStock = (o as any).variants
                      ? (o as any).variants.reduce((sum: number, v: any) => sum + v.quantity, 0)
                      : o.stock_count || 0;
                    const hasDiscount = (o as any).discount_type && (o as any).discount_type !== "none";
                    return (
                      <motion.div
                        key={o.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border border-border rounded-2xl overflow-hidden bg-card hover:border-primary/40 transition-all hover:shadow-lg group">
                        <div className="h-28 bg-gradient-to-br from-secondary to-muted relative overflow-hidden">
                          {o.image_url ? (
                            <img src={o.image_url} alt={o.product_name || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isService ? <Briefcase size={32} className="text-muted-foreground/40" /> : <Package size={32} className="text-muted-foreground/40" />}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                          {/* Status Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg bg-foreground/80 text-background backdrop-blur-sm">
                              {isService ? "Service" : o.item_type === "digital" ? "Digital" : "Physical"}
                            </span>
                            {hasDiscount && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-primary text-primary-foreground">
                                {(o as any).discount_type === "percentage" ? `${(o as any).discount_value}%` : `ZMW ${(o as any).discount_value}`} OFF
                              </span>
                            )}
                          </div>

                          {/* Stock indicator */}
                          {!isService && (
                            <div className="absolute bottom-2 right-2.5 px-2 py-1 rounded-lg bg-background/90 backdrop-blur-sm">
                              <p className="text-xs font-bold text-foreground">{totalStock} stock</p>
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 space-y-2">
                          <div>
                            <p className="text-sm font-bold text-foreground line-clamp-2 mb-0.5">{o.product_name || "Unnamed"}</p>
                            {o.category && <p className="text-xs text-muted-foreground">{o.category}</p>}
                          </div>

                          <div className="flex items-baseline gap-2">
                            <p className="text-base font-bold text-primary">
                              ZMW {o.price ?? 0}
                            </p>
                            {o.old_price && <p className="text-xs text-muted-foreground line-through">ZMW {o.old_price}</p>}
                          </div>

                          {o.description && <p className="text-xs text-muted-foreground line-clamp-1">{o.description}</p>}

                          {(o as any).media_gallery && (o as any).media_gallery.length > 0 && (
                            <p className="text-xs text-primary font-semibold flex items-center gap-1">
                              <FileVideo size={12} /> {(o as any).media_gallery.length} media file(s)
                            </p>
                          )}

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleEditOffer(o)}
                              className="flex-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-1">
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(o.id)}
                              className="flex-1 text-xs font-semibold text-destructive border border-destructive/30 rounded-lg py-2 hover:bg-destructive/5 transition-colors inline-flex items-center justify-center gap-1">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* RIGHT: Live Preview */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:sticky lg:top-4 h-fit">
            <StorefrontPreview
              brandName={brandName}
              description={description}
              bannerUrl={bannerUrl}
              logoUrl={logoUrl}
              storeSlug={storeSlug}
              offers={offers}
            />
          </motion.div>
        </div>
      </div>

      <OfferFormModalEnhanced
        open={offerOpen}
        onOpenChange={setOfferOpen}
        smeId={currentStore.id}
        initial={editingOffer}
        onSaved={() => fetchOffers(currentStore.id)}
      />
    </DashboardLayout>
  );
};

export default StorefrontBuilder;
