import { useState, useEffect, useRef, useCallback } from "react";
import { Globe, Rocket, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { saveStore } from "@/lib/ensureStore";
import OfferFormModalEnhanced, { OfferDraft, ItemType } from "@/components/storefront/OfferFormModalEnhanced";
import StorefrontPreviewLiveEditorial from "@/components/storefront/StorefrontPreviewLiveEditorial";
import StorefrontEditorPanel from "@/components/studio/StorefrontEditorPanel";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";

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
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [businessType, setBusinessType] = useState("retail");
  const [isVerified, setIsVerified] = useState(false);
  
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
      brand_name: string; description: string;
      logo_url: string; hero_image_url: string;
      hero_title: string; hero_subtitle: string;
      whatsapp_number: string; store_slug: string;
      business_type: string; is_verified: boolean;
    }>;
    setBrandName(draft.brand_name ?? currentStore.brand_name ?? "");
    setDescription(draft.description ?? currentStore.description ?? "");
    setLogoUrl(draft.logo_url ?? currentStore.logo_url ?? "");
    // Use banner_url (actual persisted upload) first, then fall back to draft hero_image_url
    setHeroImageUrl(draft.hero_image_url ?? currentStore.banner_url ?? "");
    setHeroTitle(draft.hero_title ?? currentStore.brand_name ?? "");
    setHeroSubtitle(draft.hero_subtitle ?? "Premium Quality, Fast Delivery");
    setWhatsappNumber(draft.whatsapp_number ?? currentStore.whatsapp_number ?? "");
    setStoreSlug(draft.store_slug ?? currentStore.store_slug ?? slugify(currentStore.brand_name || `store-${currentStore.id}`));
    setBusinessType(draft.business_type ?? currentStore.business_type ?? "retail");
    setIsVerified(draft.is_verified ?? false);
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
        logo_url: logoUrl,
        hero_image_url: heroImageUrl,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        whatsapp_number: whatsappNumber,
        store_slug: slugify(storeSlug || brandName),
        business_type: businessType,
        is_verified: isVerified,
      };
      const updatePayload: any = { draft_data: draftPayload };
      if (heroImageUrl) {
        updatePayload.banner_url = heroImageUrl;
      }
      const { error } = await (supabase.from("sme_stores") as any)
        .update(updatePayload)
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
  }, [brandName, description, logoUrl, heroImageUrl, heroTitle, heroSubtitle, whatsappNumber, storeSlug, businessType, isVerified, currentStore]);

  // File uploads with immediate DB persistence
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user || !currentStore) { toast.error("Sign in to upload"); return null; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hive_media").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return null; }
    const { data } = supabase.storage.from("hive_media").getPublicUrl(path);
    const url = data.publicUrl;

    // Immediately persist to DB so it doesn't disappear on page reload
    const updatePayload: Record<string, any> = {};
    if (folder === "logo") updatePayload.logo_url = url;
    if (folder === "hero") updatePayload.banner_url = url;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("sme_stores").update(updatePayload).eq("id", currentStore.id);
    }

    return url;
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
      logo_url: logoUrl || currentStore.logo_url || null,
      whatsapp_number: whatsappNumber || currentStore.whatsapp_number || null,
      business_type: businessType || currentStore.business_type || "retail",
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

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Globe size={26} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Storefront is only for Vendor accounts</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const StorefrontContent = () => (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* STICKY TAB SWITCHER - Glassmorphic (Mobile + Desktop) */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-card/75 border-b border-border/50">
        <div className="flex max-w-full">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 lg:flex-none lg:px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "edit"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🛠️</span> <span className="hidden sm:inline">Edit Store</span><span className="sm:hidden">Editor</span>
          </button>
          <div className="w-px bg-border/30" />
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 lg:flex-none lg:px-6 py-3 font-semibold text-sm transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "preview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>👁️</span> <span className="hidden sm:inline">Live Preview</span><span className="sm:hidden">Preview</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT - State-Dependent Full-Width */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* EDITOR PANEL - Full width when active, hidden on mobile, side-by-side on desktop */}
        <div className={`w-full lg:w-2/5 flex-col bg-card border-r border-border overflow-y-auto ${
          activeTab === "edit" ? "flex" : "hidden lg:flex"
        }`}>
          <StorefrontEditorPanel
            store={currentStore}
            brandName={brandName}
            onBrandNameChange={setBrandName}
            description={description}
            onDescriptionChange={setDescription}
            logoUrl={logoUrl}
            onLogoChange={setLogoUrl}
            heroImageUrl={heroImageUrl}
            onHeroImageChange={setHeroImageUrl}
            heroTitle={heroTitle}
            onHeroTitleChange={setHeroTitle}
            heroSubtitle={heroSubtitle}
            onHeroSubtitleChange={setHeroSubtitle}
            whatsappNumber={whatsappNumber}
            onWhatsappChange={setWhatsappNumber}
            storeSlug={storeSlug}
            onSlugChange={(val) => {
              setSlugTouched(true);
              setStoreSlug(slugify(val));
            }}
            storeUrl={storeUrl}
            onAddProduct={openAddOffer}
            onEditProduct={handleEditOffer}
            onDeleteProduct={handleDeleteOffer}
            products={offers}
            saveStatus={saveStatus}
            onLaunch={handleLaunch}
            launching={launching}
            onUploadFile={uploadFile}
            businessType={businessType}
            onBusinessTypeChange={setBusinessType}
            isVerified={isVerified}
            onVerifiedChange={setIsVerified}
          />
        </div>

        {/* PREVIEW PANEL - Full width when active, hidden on mobile, side-by-side on desktop */}
        <div className={`w-full lg:w-3/5 overflow-hidden flex ${
          activeTab === "preview" ? "flex" : "hidden lg:flex"
        }`} style={{ background: "#FFFBF2" }}>
          <StorefrontPreviewLiveEditorial
            storeId={currentStore.id}
            storeName={brandName}
            heroTitle={heroTitle}
            heroSubtitle={heroSubtitle}
            heroImageUrl={heroImageUrl}
            logoUrl={logoUrl}
            description={description}
            whatsappNumber={whatsappNumber}
            businessType={businessType}
            offers={offers}
            isVerified={isVerified}
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

  return (
    <RetailerStudioSidebar>
      <StorefrontContent />
    </RetailerStudioSidebar>
  );
};

export default StorefrontBuilder;
