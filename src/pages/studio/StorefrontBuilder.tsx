import { useState, useEffect, useRef, useCallback } from "react";
import { Globe, Upload, Rocket, Image as ImageIcon, Check, Loader2, Copy, ExternalLink, Plus, Edit, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { saveStore } from "@/lib/ensureStore";
import OfferFormModalEnhanced, { OfferDraft, ItemType } from "@/components/storefront/OfferFormModalEnhanced";
import StorefrontPreviewLive from "@/components/storefront/StorefrontPreviewLive";

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
  const { user, currentStore, refreshStore } = useAuth();
  
  // Store data
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  
  // Offers
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [filter, setFilter] = useState<"all" | "products" | "services">("all");
  const [offerOpen, setOfferOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferDraft | null>(null);
  
  // UX
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Uploads
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // Autosave
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

  // Hydrate from store
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
    hydratedRef.current = false;
    const t = setTimeout(() => { hydratedRef.current = true; }, 50);
    return () => clearTimeout(t);
  }, [currentStore, fetchOffers]);

  // Autosave
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
      const { error } = await (supabase.from("sme_stores") as any)
        .update({ draft_data: draftPayload })
        .eq("id", currentStore.id);

      if (error) {
        setSaveStatus("idle");
        toast.error("Autosave failed");
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

  // File uploads
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) { toast.error("Sign in to upload"); return null; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hive_media").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return null; }
    const { data } = supabase.storage.from("hive_media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingLogo(true);
    const url = await uploadFile(f, "logo");
    if (url) setLogoUrl(url);
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

  // Launch
  const handleLaunch = async () => {
    if (!currentStore) { toast.error("Workspace not ready"); return; }
    setLaunching(true);
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }

    const desiredSlug = slugify(storeSlug || brandName) || `store-${user!.id.slice(0, 8)}`;
    const livePatch: Record<string, any> = {
      brand_name: brandName.trim() || currentStore.brand_name || "My Store",
      description: description ?? currentStore.description,
      banner_url: bannerUrl || currentStore.banner_url || null,
      logo_url: logoUrl || currentStore.logo_url || null,
      whatsapp_number: whatsappNumber || currentStore.whatsapp_number || null,
      store_slug: desiredSlug,
      draft_data: {},
    };

    const { store, error } = await saveStore(user, livePatch);
    setLaunching(false);

    if (error || !store) {
      toast.error("Could not launch");
      return;
    }

    setStoreSlug(store.store_slug || desiredSlug);
    toast.success("🚀 Store launched!");

    const storeUrl = store.store_slug ? `/store/${store.store_slug}` : `/store/${store.id}`;
    window.open(storeUrl, "_blank");
    void refreshStore();
  };

  // Offers
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
    toast.success("Offer removed");
    if (currentStore) fetchOffers(currentStore.id);
  };

  const openAddOffer = () => {
    if (!currentStore) { toast.error("Workspace not ready"); return; }
    setEditingOffer(null);
    setOfferOpen(true);
  };

  const storeUrl = storeSlug ? `${window.location.origin}/store/${storeSlug}` : currentStore ? `${window.location.origin}/store/${currentStore.id}` : "";
  const copyLink = async () => {
    if (!storeUrl) { toast.error("Save your store first"); return; }
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 1800);
  };

  const filtered = offers.filter((o) =>
    filter === "all" ? true : filter === "services" ? o.item_type === "service" : o.item_type !== "service"
  );

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Globe size={26} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Storefront is only for Vendor accounts</p>
      </div>
    );
  }

  const SaveIndicator = () => (
    <AnimatePresence mode="wait">
      {saveStatus === "saving" && (
        <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/70 border border-border text-xs font-semibold text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </motion.div>
      )}
      {saveStatus === "saved" && (
        <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
          <Check size={12} /> Saved
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Globe size={22} className="text-primary" />
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Storefront Builder</h2>
            <p className="text-xs text-muted-foreground">Design & manage your storefront</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator />
          <button onClick={openAddOffer} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm">
            <Plus size={16} /> Add Offer
          </button>
          <button onClick={handleLaunch} disabled={launching}
            className="btn-gold px-5 py-2.5 text-sm font-bold disabled:opacity-60 flex items-center gap-2">
            {launching ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            Launch
          </button>
        </div>
      </div>

      {/* SPLIT SCREEN: 40% Editor | 60% Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: 40% Editor */}
        <div className="w-2/5 border-r border-border overflow-y-auto bg-card">
          <div className="p-6 space-y-6">
            {/* Store Identity Section */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-4">Store Identity</h3>
              
              {/* Logo */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-2 block">Logo</label>
                <div onClick={() => logoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                  {uploadingLogo ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> :
                    logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> :
                    <Upload size={20} className="text-muted-foreground/40" />}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>

              {/* Store Name */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Store Name</label>
                <input value={brandName} onChange={(e) => {
                  setBrandName(e.target.value);
                  if (!slugTouched) setStoreSlug(slugify(e.target.value));
                }}
                  placeholder="e.g. Lusaka Threads" className={inputClass} />
              </div>

              {/* URL Slug */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Store URL</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">/store/</span>
                  <input value={storeSlug} onChange={(e) => { setSlugTouched(true); setStoreSlug(slugify(e.target.value)); }}
                    placeholder="lusaka-threads" className={inputClass} />
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers about your store..." rows={3} className={`${inputClass} resize-none`} />
              </div>

              {/* Banner */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Banner Image</label>
                <div onClick={() => bannerInputRef.current?.click()}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                  {uploadingBanner ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> :
                    bannerUrl ? <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" /> :
                    <div className="text-center"><ImageIcon size={24} className="mx-auto text-muted-foreground/40" /></div>}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">WhatsApp Number</label>
                <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+260 9XX XXX XXX" className={inputClass} />
              </div>
            </div>

            {/* Public Link Card */}
            {storeUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Your Public Link</p>
                <p className="text-xs font-mono text-foreground truncate mb-2">{storeUrl}</p>
                <div className="flex gap-2">
                  <button onClick={copyLink} className="flex-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  <a href={storeUrl} target="_blank" rel="noreferrer" className="flex-1 text-xs font-semibold text-primary bg-primary/10 rounded-lg py-2 hover:bg-primary/20 transition-colors inline-flex items-center justify-center gap-1">
                    <ExternalLink size={12} /> View
                  </a>
                </div>
              </motion.div>
            )}

            {/* Offers Section */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Your Offers ({offers.length})</h3>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 mb-3">
                {(["all", "products", "services"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2 py-1 text-[10px] font-semibold rounded-md capitalize transition-colors ${
                      filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}>{f}</button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs mb-2">No offers yet</p>
                  <button onClick={openAddOffer} className="btn-gold inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                    <Plus size={12} /> Add Offer
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filtered.map((o) => (
                    <div key={o.id} className="border border-border rounded-lg p-3 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                      <div className="flex gap-2 mb-2">
                        {o.image_url && <img src={o.image_url} alt={o.product_name} className="w-12 h-12 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{o.product_name}</p>
                          <p className="text-xs text-primary font-bold">ZMW {o.price}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditOffer(o)} className="flex-1 text-xs font-semibold text-primary border border-primary/30 rounded py-1 hover:bg-primary/5">
                          <Edit size={10} className="inline mr-1" /> Edit
                        </button>
                        <button onClick={() => handleDeleteOffer(o.id)} className="flex-1 text-xs font-semibold text-destructive border border-destructive/30 rounded py-1 hover:bg-destructive/5">
                          <Trash2 size={10} className="inline mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 60% Live Preview */}
        <div className="w-3/5 overflow-hidden bg-muted/30">
          <StorefrontPreviewLive
            storeId={currentStore.id}
            brandName={brandName}
            description={description}
            bannerUrl={bannerUrl}
            logoUrl={logoUrl}
            storeSlug={storeSlug}
            whatsappNumber={whatsappNumber}
            businessType={currentStore.business_type}
            offers={offers}
          />
        </div>
      </div>

      {/* Modal for offer form */}
      <OfferFormModalEnhanced
        open={offerOpen}
        onOpenChange={setOfferOpen}
        smeId={currentStore.id}
        initial={editingOffer}
        onSaved={() => fetchOffers(currentStore.id)}
      />
    </div>
  );
};

export default StorefrontBuilder;
