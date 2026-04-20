// Live preview of the public store page — re-renders instantly as the
// owner edits identity fields, uploads images, or adds offers.
// Mirrors the look of /store/:slug (StorePage) but in a phone-shaped frame.

import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Briefcase, MessageCircle, Package, Smartphone } from "lucide-react";

export interface PreviewOffer {
  id: number;
  product_name: string | null;
  price: number | null;
  image_url: string | null;
  item_type: string | null;
}

interface Props {
  brandName: string;
  description: string;
  bannerUrl: string;
  logoUrl: string;
  storeSlug: string;
  offers: PreviewOffer[];
}

const StorefrontPreview = ({
  brandName,
  description,
  bannerUrl,
  logoUrl,
  storeSlug,
  offers,
}: Props) => {
  const visible = offers.slice(0, 6);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-primary" />
          <h3 className="text-sm font-display font-bold text-foreground">Live Preview</h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">/store/{storeSlug || "…"}</span>
      </div>

      <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-background shadow-inner overflow-hidden">
        {/* Banner */}
        <div className="relative h-28">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/25 via-secondary to-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 to-transparent" />
        </div>

        {/* Identity */}
        <div className="px-4 -mt-7 pb-3 flex items-end gap-3">
          <div className="w-14 h-14 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center overflow-hidden text-lg font-display font-bold text-primary shadow-lg">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              brandName?.[0]?.toUpperCase() || "S"
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-display font-bold text-foreground truncate">
                {brandName || "Your Store"}
              </p>
              <BadgeCheck size={14} className="text-blue-500 shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {description ? description.slice(0, 60) : "Your store description will appear here."}
            </p>
          </div>
          <button
            type="button"
            disabled
            className="text-[10px] font-semibold flex items-center gap-1 px-2 py-1.5 rounded-md bg-primary/15 text-primary"
          >
            <MessageCircle size={11} /> Message
          </button>
        </div>

        {/* Offers grid */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-foreground">
              Offers ({offers.length})
            </p>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
              <Package size={20} className="mx-auto mb-1 opacity-40" />
              <p className="text-[11px]">Add an offer to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence>
                {visible.map((o) => {
                  const isService = o.item_type === "service";
                  return (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      <div className="h-16 bg-secondary/40 flex items-center justify-center">
                        {o.image_url ? (
                          <img
                            src={o.image_url}
                            alt={o.product_name || ""}
                            className="w-full h-full object-cover"
                          />
                        ) : isService ? (
                          <Briefcase size={16} className="text-muted-foreground/40" />
                        ) : (
                          <Package size={16} className="text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] font-semibold text-foreground truncate">
                          {o.product_name || "Item"}
                        </p>
                        <p className="text-[10px] font-bold text-primary">
                          {isService ? "From " : ""}ZMW {o.price ?? 0}
                        </p>
                        <p className="text-[8px] mt-0.5 text-center font-bold text-primary-foreground bg-primary rounded py-0.5">
                          {isService ? "📅 Book Order" : "🛒 Buy Now"}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Updates instantly as you edit · This is exactly what shoppers will see.
      </p>
    </div>
  );
};

export default StorefrontPreview;
