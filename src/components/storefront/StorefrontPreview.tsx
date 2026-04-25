// Live preview of the public store page — re-renders instantly as the
// owner edits identity fields, uploads images, or adds offers.
// Now renders full desktop layout (not phone mockup) for split-screen editor.

import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Briefcase, MessageCircle, Package, Monitor, Check, Star, Zap } from "lucide-react";

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
  const isService = visible.some((o) => o.item_type === "service");

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-primary" />
          <h3 className="text-xs md:text-sm font-display font-bold text-foreground">Live Preview</h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">/store/{storeSlug || "…"}</span>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {/* PROFILE HEADER */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center overflow-hidden text-sm font-display font-bold text-primary">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                brandName?.[0]?.toUpperCase() || "S"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-display font-bold text-foreground truncate">
                  {brandName || "Store"}
                </p>
                <BadgeCheck size={12} className="text-blue-500 shrink-0" />
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="text-[11px] font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary"
          >
            <MessageCircle size={13} /> Message
          </button>
        </div>

        {/* HERO SECTION */}
        <div className="relative py-6">
          <div className="px-4 grid md:grid-cols-2 gap-4 items-center">
            {/* Text Block */}
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {brandName || "Welcome"}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                {description || "Discover amazing products and services"}
              </p>
              <button className="text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 w-fit">
                Shop Now
              </button>
            </div>

            {/* Media Card with Gold Border */}
            <div className="relative h-40 md:h-48">
              <div className="relative rounded-2xl overflow-hidden border-3 border-primary bg-card h-full w-full">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Hero" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Hero Image</p>
                  </div>
                )}
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary border-2 border-background"></div>
            </div>
          </div>
        </div>

        {/* TRUST BAR */}
        <div className="bg-primary/5 border-y border-primary/20 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <BadgeCheck size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Star size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">4.8 Stars</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Fast</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Check size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Secure</p>
            </div>
          </div>
        </div>

        {/* FEATURED OFFERS */}
        <div className="px-4 py-6">
          <p className="text-xs font-bold text-foreground mb-3 uppercase">Featured Offers ({visible.length})</p>

          {offers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
              <Package size={16} className="mx-auto mb-1 opacity-40" />
              <p className="text-[10px]">Add offers to preview here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                      <div className="p-2">
                        <p className="text-[10px] font-semibold text-foreground truncate">
                          {o.product_name || "Item"}
                        </p>
                        <p className="text-[10px] font-bold text-primary">
                          ZMW {o.price ?? 0}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* FOOTER NOTE */}
        <div className="px-4 py-4 text-center border-t border-border/50 text-[10px] text-muted-foreground">
          <p>Live preview · Updates in real-time as you edit</p>
        </div>
      </div>
    </div>
  );
};

export default StorefrontPreview;
