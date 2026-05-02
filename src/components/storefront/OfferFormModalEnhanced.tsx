import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, Package, Briefcase, Cloud, Plus, Trash2, FileVideo, Image as ImageIcon, Tag, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureStore } from "@/lib/ensureStore";
import { generateVariants } from "@/lib/variantGenerator";
import { toast } from "sonner";

export type ItemType = "physical" | "digital" | "service";
export type DiscountType = "none" | "percentage" | "fixed";

export interface Variant {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
}

export interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  alt?: string;
}

export interface OfferDraft {
  id?: number;
  name: string;
  price: string;
  description: string;
  image_url: string;
  item_type: ItemType;
  stock?: string;
  duration?: string;
  location_type?: "at_customer" | "at_sme" | "remote" | "";
  category?: string;
  discount_type?: DiscountType;
  discount_value?: string;
  variants?: Variant[];
  media_gallery?: MediaItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  smeId: number | null;
  initial?: OfferDraft | null;
  onSaved: () => void;
}

const emptyDraft: OfferDraft = {
  name: "",
  price: "",
  description: "",
  image_url: "",
  item_type: "physical",
  stock: "",
  duration: "",
  location_type: "",
  category: "",
  discount_type: "none",
  discount_value: "",
  variants: [],
  media_gallery: [],
};

const typeMeta: Record<ItemType, { label: string; icon: any; help: string }> = {
  physical: { label: "Physical Product", icon: Package, help: "Tangible goods you ship or hand over." },
  digital: { label: "Digital Product", icon: Cloud, help: "Files, downloads, codes — delivered online." },
  service: { label: "Service", icon: Briefcase, help: "Bookings: appointments, jobs, gigs." },
};

const OfferFormModalEnhanced = ({ open, onOpenChange, smeId, initial, onSaved }: Props) => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<OfferDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedTab, setExpandedTab] = useState<"basic" | "media" | "discounts" | "variants">("basic");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(initial ?? emptyDraft);
  }, [open, initial]);

  const set = <K extends keyof OfferDraft>(k: K, v: OfferDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const uploadMedia = async (file: File, type: "image" | "video") => {
    if (!user) { toast.error("Sign in to upload media."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/offer_${Date.now()}_${type}.${ext}`;
    const { error } = await supabase.storage.from("hive_media").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("hive_media").getPublicUrl(path);
    const url = data.publicUrl;

    if (type === "image") {
      // Set as primary image
      set("image_url", url);
      toast.success("Image uploaded");
    } else {
      // Add to media gallery
      const newMedia: MediaItem = {
        id: Date.now().toString(),
        type: "video",
        url,
        thumbnail: "",
      };
      set("media_gallery", [...(draft.media_gallery || []), newMedia]);
      toast.success("Video uploaded");
    }
    setUploading(false);
  };

  const addVariant = () => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      name: "",
      sku: "",
      quantity: 0,
      price: parseFloat(draft.price) || 0,
    };
    set("variants", [...(draft.variants || []), newVariant]);
  };

  const updateVariant = (id: string, key: keyof Variant, value: any) => {
    const updated = (draft.variants || []).map((v) => (v.id === id ? { ...v, [key]: value } : v));
    set("variants", updated);
  };

  const removeVariant = (id: string) => {
    set("variants", (draft.variants || []).filter((v) => v.id !== id));
  };

  const removeMedia = (id: string) => {
    set("media_gallery", (draft.media_gallery || []).filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let sid = smeId;
    if (!sid) {
      const store = await ensureStore(user);
      sid = store?.id || null;
    }
    if (!sid) { toast.error("Sign in to create offers."); return; }
    if (!draft.name.trim()) { toast.error("Name is required."); return; }
    setSubmitting(true);

    const isService = draft.item_type === "service";
    const basePrice = parseFloat(draft.price) || 0;

    // Auto-generate 4 variants for new products (not services)
    let generatedVariants: any[] = [];
    if (!draft.id && !isService && (!draft.variants || draft.variants.length === 0)) {
      const variantData = generateVariants(
        draft.name.trim(),
        basePrice,
        "product",
        draft.category,
        draft.description
      );
      generatedVariants = variantData.variants.map((v: any) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: v.title,
        price: v.price,
        description: v.description,
        tag: v.tag,
        features: v.features || [],
        quantity: 100, // Default stock per variant
      }));
    }

    const payload: any = {
      product_name: draft.name.trim(),
      price: basePrice,
      description: draft.description || null,
      image_url: draft.image_url || null,
      item_type: draft.item_type,
      sme_id: sid,
      category: draft.category || null,
      discount_type: draft.discount_type || "none",
      discount_value: draft.discount_value ? parseFloat(draft.discount_value) : null,
      media_gallery: draft.media_gallery && draft.media_gallery.length > 0 ? draft.media_gallery : [],
      variants: generatedVariants.length > 0 ? generatedVariants : (draft.variants && draft.variants.length > 0 ? draft.variants : []),
    };

    if (isService) {
      payload.duration = draft.duration || null;
      payload.location_type = draft.location_type || null;
      payload.fulfillment_type = draft.location_type === "at_customer" ? "mobile" : "in-store";
      payload.stock_count = 999;
      payload.stock_quantity = 999;
    } else {
      // For products: use total of variant quantities
      const variantsToUse = generatedVariants.length > 0 ? generatedVariants : draft.variants;
      if (variantsToUse && variantsToUse.length > 0) {
        const totalStock = variantsToUse.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
        payload.stock_count = totalStock;
        payload.stock_quantity = totalStock;
      } else {
        payload.stock_count = draft.stock ? parseInt(draft.stock) : 0;
        payload.stock_quantity = draft.stock ? parseInt(draft.stock) : 0;
      }
    }

    const op = draft.id
      ? supabase.from("hive_catalogue").update(payload).eq("id", draft.id)
      : supabase.from("hive_catalogue").insert(payload);

    const { error } = await op;
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(draft.id ? "Offer updated!" : "Offer created!");
      onSaved();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

  const isService = draft.item_type === "service";
  const hasVariants = draft.variants && draft.variants.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[90]" />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inset-4 sm:inset-auto sm:w-[620px] bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-auto max-h-[92vh]">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-foreground">
                  {draft.id ? "Edit Offer" : "Create Offer"}
                </h3>
                <button type="button" onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
                {(["basic", "media", "discounts", "variants"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setExpandedTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      expandedTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* BASIC TAB */}
              {expandedTab === "basic" && (
                <div className="space-y-4">
                  {/* Type selector */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Offer Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(typeMeta) as ItemType[]).map((t) => {
                        const Icon = typeMeta[t].icon;
                        const active = draft.item_type === t;
                        return (
                          <button key={t} type="button" onClick={() => set("item_type", t)}
                            className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${
                              active ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-secondary"
                            }`}>
                            <Icon size={18} />
                            {typeMeta[t].label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">{typeMeta[draft.item_type].help}</p>
                  </div>

                  <input value={draft.name} onChange={(e) => set("name", e.target.value)}
                    placeholder={isService ? "Service name *" : "Product name *"} className={inputClass} required />

                  <div className="grid grid-cols-2 gap-3">
                    <input value={draft.price} onChange={(e) => set("price", e.target.value)}
                      placeholder={isService ? "Starting from (ZMW)" : "Price (ZMW)"}
                      type="number" step="0.01" className={inputClass} required />
                    {!isService && !hasVariants && (
                      <input value={draft.stock || ""} onChange={(e) => set("stock", e.target.value)}
                        placeholder="Stock (optional)" type="number" className={inputClass} />
                    )}
                    {isService && (
                      <input value={draft.duration || ""} onChange={(e) => set("duration", e.target.value)}
                        placeholder="Duration (e.g. 1h, 30 min)" className={inputClass} />
                    )}
                  </div>

                  {isService && (
                    <select value={draft.location_type || ""} onChange={(e) => set("location_type", e.target.value as any)}
                      className={inputClass}>
                      <option value="">Where is the service delivered?</option>
                      <option value="at_customer">At the customer</option>
                      <option value="at_sme">At my location</option>
                      <option value="remote">Remote / online</option>
                    </select>
                  )}

                  <input value={draft.category || ""} onChange={(e) => set("category", e.target.value)}
                    placeholder="Category (e.g. Fashion, Beauty, Tech)" className={inputClass} />

                  <textarea value={draft.description} onChange={(e) => set("description", e.target.value)}
                    placeholder="Description" rows={3} className={`${inputClass} resize-none`} />

                  {/* Primary Image */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Primary Image</label>
                    <div className="flex items-center gap-3">
                      <div onClick={() => fileRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors shrink-0">
                        {uploading ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> :
                          draft.image_url ? <img src={draft.image_url} alt="" className="w-full h-full object-cover" /> :
                          <ImageIcon size={20} className="text-muted-foreground/40" />}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0], "image")} />
                      <p className="text-xs text-muted-foreground">
                        {draft.image_url ? "Click to replace" : "Click to upload image"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MEDIA TAB */}
              {expandedTab === "media" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-foreground">Media Gallery (Images & Videos)</label>
                      <button
                        type="button"
                        onClick={() => videoRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <FileVideo size={14} /> Add Video
                      </button>
                    </div>
                    <input ref={videoRef} type="file" accept="video/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0], "video")} />

                    {draft.media_gallery && draft.media_gallery.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {draft.media_gallery.map((media) => (
                          <div key={media.id} className="relative group">
                            <div className="w-full h-24 rounded-lg bg-secondary/50 border border-border flex items-center justify-center overflow-hidden">
                              {media.type === "video" ? (
                                <>
                                  <FileVideo size={24} className="text-muted-foreground" />
                                  <span className="absolute bottom-1 right-1 bg-foreground text-background text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    Video
                                  </span>
                                </>
                              ) : (
                                <img src={media.url} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedia(media.id)}
                              className="absolute top-1 right-1 p-1 bg-destructive text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DISCOUNTS TAB */}
              {expandedTab === "discounts" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Discount Type</label>
                    <select value={draft.discount_type || "none"} onChange={(e) => set("discount_type", e.target.value as DiscountType)}
                      className={inputClass}>
                      <option value="none">No Discount</option>
                      <option value="percentage">Percentage Off</option>
                      <option value="fixed">Fixed Amount Off</option>
                    </select>
                  </div>

                  {draft.discount_type !== "none" && (
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1.5 block">
                        Discount Value {draft.discount_type === "percentage" ? "(%)" : "(ZMW)"}
                      </label>
                      <input
                        value={draft.discount_value || ""}
                        onChange={(e) => set("discount_value", e.target.value)}
                        placeholder={draft.discount_type === "percentage" ? "e.g., 20" : "e.g., 500"}
                        type="number"
                        step={draft.discount_type === "percentage" ? "0.1" : "0.01"}
                        className={inputClass}
                      />
                      {draft.discount_value && draft.price && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Original: ZMW {draft.price} →{" "}
                          <span className="text-primary font-semibold">
                            ZMW{" "}
                            {draft.discount_type === "percentage"
                              ? (parseFloat(draft.price) * (1 - parseFloat(draft.discount_value) / 100)).toFixed(2)
                              : (parseFloat(draft.price) - parseFloat(draft.discount_value)).toFixed(2)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VARIANTS TAB */}
              {expandedTab === "variants" && !isService && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-foreground">Product Variants</label>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus size={14} /> Add Variant
                      </button>
                    </div>

                    {draft.variants && draft.variants.length > 0 ? (
                      <div className="space-y-3">
                        {draft.variants.map((variant) => (
                          <div key={variant.id} className="p-3 border border-border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <input
                                value={variant.name}
                                onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                                placeholder="Variant name (e.g., White Airforce 1s)"
                                className={inputClass}
                              />
                              <button
                                type="button"
                                onClick={() => removeVariant(variant.id)}
                                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                value={variant.sku || ""}
                                onChange={(e) => updateVariant(variant.id, "sku", e.target.value)}
                                placeholder="SKU (optional)"
                                className={`${inputClass} text-xs`}
                              />
                              <input
                                value={variant.quantity}
                                onChange={(e) => updateVariant(variant.id, "quantity", parseInt(e.target.value) || 0)}
                                placeholder="Quantity"
                                type="number"
                                className={`${inputClass} text-xs`}
                              />
                              <input
                                value={variant.price || ""}
                                onChange={(e) => updateVariant(variant.id, "price", e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="Price (optional)"
                                type="number"
                                className={`${inputClass} text-xs`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No variants yet. Add one to manage inventory by product type.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting || uploading}
                className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : draft.id ? "Update Offer" : "Create Offer"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OfferFormModalEnhanced;
