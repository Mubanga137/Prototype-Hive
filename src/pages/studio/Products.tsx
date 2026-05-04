import { useState, useEffect } from "react";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";
import { Package, Plus, Edit, Trash2, X, Loader2, Briefcase, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateVariants } from "@/lib/variantGenerator";
import { toast } from "sonner";
import SquadPromoEditor from "@/components/studio/SquadPromoEditor";

interface CatalogueItem {
  id: number;
  product_name: string | null;
  price: number | null;
  old_price: number | null;
  stock_count: number | null;
  stock_quantity?: number | null;
  category: string | null;
  image_url: string | null;
  item_type: string | null;
  squad_enabled?: boolean | null;
  squad_discount_type?: string | null;
  squad_discount_value?: number | null;
  squad_size?: number | null;
  squad_timer_minutes?: number | null;
}

const categories = ["Fashion", "Tech", "Beauty", "Food", "Entertainment", "Accessories", "Other"];
type ProductType = "physical" | "digital" | "service";

const Products = () => {
  const { user, currentStore } = useAuth();
  const [products, setProducts] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [itemType, setItemType] = useState<ProductType>("physical");

  // Squad Promo fields
  const [squadEnabled, setSquadEnabled] = useState(false);
  const [squadDiscountType, setSquadDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [squadDiscountValue, setSquadDiscountValue] = useState(15);
  const [squadSize, setSquadSize] = useState(2);
  const [squadTimerMinutes, setSquadTimerMinutes] = useState(1440); // 24 hours

  const resetForm = () => {
    setName(""); setPrice(""); setOldPrice(""); setStock(""); setCategory(""); setImageUrl(""); setItemType("physical");
    setSquadEnabled(false); setSquadDiscountType("percentage"); setSquadDiscountValue(15); setSquadSize(2); setSquadTimerMinutes(1440);
    setEditingId(null);
  };

  const fetchData = async () => {
    if (!currentStore) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("hive_catalogue")
      .select("*")
      .eq("sme_id", currentStore.id)
      .neq("item_type", "service")
      .order("created_at", { ascending: false });
    setProducts((data as CatalogueItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) { toast.error("Workspace not ready."); return; }
    if (!name.trim()) { toast.error("Product name is required."); return; }
    setSubmitting(true);
    const isPhysical = itemType === "physical";
    const basePrice = parseFloat(price) || 0;
    const stockNum = isPhysical ? (parseInt(stock) || 0) : 999999;

    // Auto-generate 4 variants for new products
    let generatedVariants: any[] = [];
    if (!editingId) {
      const variantData = generateVariants(
        name.trim(),
        basePrice,
        "product",
        category,
        ""
      );
      generatedVariants = variantData.variants.map((v: any) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: v.title,
        price: v.price,
        description: v.description,
        tag: v.tag,
        features: v.features || [],
        quantity: 100,
      }));
    }

    const payload: any = {
      product_name: name.trim(),
      price: basePrice,
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      stock_count: stockNum,
      stock_quantity: stockNum,
      category: category || null,
      image_url: imageUrl || null,
      sme_id: currentStore.id,
      item_type: itemType,
      squad_enabled: squadEnabled,
      squad_discount_type: squadEnabled ? squadDiscountType : null,
      squad_discount_value: squadEnabled ? squadDiscountValue : null,
      squad_size: squadEnabled ? squadSize : null,
      squad_timer_minutes: squadEnabled ? squadTimerMinutes : null,
      variants: generatedVariants.length > 0 ? generatedVariants : [],
    };
    if (editingId) {
      const { error } = await supabase.from("hive_catalogue").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); } else { toast.success("Product updated!"); }
    } else {
      const { error } = await supabase.from("hive_catalogue").insert(payload);
      if (error) { toast.error(error.message); } else { toast.success("Product added!"); }
    }
    setSubmitting(false);
    resetForm();
    setFormOpen(false);
    fetchData();
  };

  const handleEdit = (item: CatalogueItem) => {
    setEditingId(item.id);
    setName(item.product_name || "");
    setPrice(String(item.price || ""));
    setOldPrice(String(item.old_price || ""));
    setStock(String(item.stock_quantity ?? item.stock_count ?? ""));
    setCategory(item.category || "");
    setImageUrl(item.image_url || "");
    setItemType((item.item_type as ProductType) || "physical");
    setSquadEnabled(item.squad_enabled || false);
    setSquadDiscountType((item.squad_discount_type as "percentage" | "fixed") || "percentage");
    setSquadDiscountValue(item.squad_discount_value || 15);
    setSquadSize(item.squad_size || 2);
    setSquadTimerMinutes(item.squad_timer_minutes || 1440);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("hive_catalogue").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted.");
    fetchData();
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

  return (
    <RetailerStudioSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your product inventory</p>
          </div>
          <button onClick={() => { resetForm(); setFormOpen(true); }} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm">
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {formOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFormOpen(false)} className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[80]" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 flex items-center justify-center p-4 z-[90]"><div className="w-full max-w-[480px] bg-card border border-border rounded-2xl shadow-2xl overflow-auto max-h-[90vh]">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-display font-bold text-foreground">{editingId ? "Edit Item" : "Add Item"}</h3>
                    <button type="button" onClick={() => setFormOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} className="text-muted-foreground" /></button>
                  </div>

                  {/* Item type selector — drives whether stock UI is shown */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Item Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { v: "physical", label: "Physical", icon: Package },
                        { v: "digital", label: "Digital", icon: Cloud },
                        { v: "service", label: "Service", icon: Briefcase },
                      ] as const).map(({ v, label, icon: Icon }) => {
                        const active = itemType === v;
                        return (
                          <button key={v} type="button" onClick={() => setItemType(v)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                              active ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-secondary"
                            }`}>
                            <Icon size={16} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name *" className={inputClass} required />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (ZMW)" type="number" step="0.01" className={inputClass} required />
                    <input value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="Old price (optional)" type="number" step="0.01" className={inputClass} />
                  </div>

                  {/* Inventory only for Physical — Service & Digital are infinitely available */}
                  {itemType === "physical" ? (
                    <div>
                      <input value={stock} onChange={e => setStock(e.target.value)} placeholder="Stock quantity" type="number" min="0" className={inputClass} />
                      <p className="text-[10px] text-muted-foreground mt-1">When stock reaches 0, the item shows "Out of Stock" and buying is disabled.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-[11px] text-muted-foreground">
                      {itemType === "service" ? "Services are infinitely bookable — no stock tracking." : "Digital items are infinitely available — no stock tracking."}
                    </div>
                  )}

                  <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className={inputClass} />

                  {/* Squad Promo Editor */}
                  <SquadPromoEditor
                    enabled={squadEnabled}
                    onEnabledChange={setSquadEnabled}
                    discountType={squadDiscountType}
                    onDiscountTypeChange={setSquadDiscountType}
                    discountValue={squadDiscountValue}
                    onDiscountValueChange={setSquadDiscountValue}
                    squadSize={squadSize}
                    onSquadSizeChange={setSquadSize}
                    timerLimit={squadTimerMinutes}
                    onTimerLimitChange={setSquadTimerMinutes}
                  />

                  <button type="submit" disabled={submitting} className="btn-gold w-full py-3 text-sm flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingId ? "Update Item" : "Add Item"}
                  </button>
                </form>
</div></motion.div>
            </>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No products yet. Click "Add Product" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden group">
                <div className="aspect-square bg-secondary/30 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.product_name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={36} className="text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground truncate">{product.product_name || "Unnamed"}</h3>
                  <p className="text-xs text-muted-foreground">{product.category || "Uncategorized"}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">ZMW {product.price || 0}</span>
                    {(() => {
                      const isPhysical = (product.item_type || "physical") === "physical";
                      const qty = product.stock_quantity ?? product.stock_count ?? 0;
                      if (!isPhysical) {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Always available</span>;
                      }
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          qty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}>{qty > 0 ? `${qty} in stock` : "Out of Stock"}</span>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleEdit(product)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors">
                      <Edit size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-destructive border border-destructive/30 rounded-lg py-1.5 hover:bg-destructive/5 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RetailerStudioSidebar>
  );
};

export default Products;
