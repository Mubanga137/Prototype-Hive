import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Briefcase, Clock, MapPin, Star, Plus, ShoppingCart, FileVideo, Image as ImageIcon, Tag, TrendingDown } from "lucide-react";

interface Variant {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
}

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  alt?: string;
}

interface ProductCardProps {
  id: number;
  product_name: string | null;
  price: number | null;
  old_price?: number | null;
  image_url: string | null;
  category: string | null;
  stock_count?: number | null;
  item_type: string | null;
  description?: string | null;
  duration?: string | null;
  location_type?: string | null;
  rating?: number | null;
  review_count?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  variants?: Variant[] | null;
  media_gallery?: MediaItem[] | null;
  isService?: boolean;
  onBuyNow?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const locLabel = (l?: string | null) =>
  l === "at_customer" ? "At you" : l === "at_sme" ? "At store" : l === "remote" ? "Online" : null;

const ProductCard = ({
  id,
  product_name,
  price,
  old_price,
  image_url,
  category,
  stock_count,
  item_type,
  description,
  duration,
  location_type,
  rating = 0,
  review_count = 0,
  discount_type,
  discount_value,
  variants,
  media_gallery,
  isService = item_type === "service",
  onBuyNow,
  onAddToCart,
  disabled = false,
  disabledReason = "Unavailable",
}: ProductCardProps) => {
  const [showMedia, setShowMedia] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(variants?.[0] || null);

  // Calculate discounted price
  const effectivePrice = (() => {
    if (!price) return 0;
    if (!discount_type || discount_type === "none") return price;
    if (discount_type === "percentage") {
      return price * (1 - (discount_value || 0) / 100);
    }
    if (discount_type === "fixed") {
      return Math.max(0, price - (discount_value || 0));
    }
    return price;
  })();

  const discountPercent = (() => {
    if (old_price && price) {
      return Math.round(((old_price - price) / old_price) * 100);
    }
    if (discount_type === "percentage") {
      return Math.round(discount_value || 0);
    }
    return 0;
  })();

  const totalStock = variants ? variants.reduce((sum, v) => sum + v.quantity, 0) : stock_count || 0;
  const isOutOfStock = !isService && totalStock <= 0;

  const hasMedia = media_gallery && media_gallery.length > 0;
  const hasVariants = variants && variants.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border transition-all overflow-hidden flex flex-col h-full hover:shadow-lg hover:border-primary/40 ${
        disabled ? "opacity-60 border-muted" : "border-border"
      }`}
    >
      {/* Media Section */}
      <div className="relative h-48 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden group">
        {image_url ? (
          <img
            src={image_url}
            alt={product_name || "Product"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground/40">
            {isService ? <Briefcase size={40} /> : <Package size={40} />}
          </div>
        )}

        {/* Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg bg-foreground/80 text-background backdrop-blur-sm">
            {isService ? "Service" : item_type === "digital" ? "Digital" : "Product"}
          </span>
          {hasMedia && (
            <button
              onClick={() => setShowMedia(true)}
              className="p-1.5 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-colors"
            >
              <FileVideo size={14} />
            </button>
          )}
        </div>

        {/* Discount/Rating Badge */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {discountPercent > 0 && (
            <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg">
              <TrendingDown size={12} /> -{discountPercent}%
            </span>
          )}
          {review_count > 0 && (
            <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
              <Star size={12} fill="currentColor" /> {rating?.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-3">
          <p className="text-sm font-bold text-foreground line-clamp-2 mb-1">{product_name || "Item"}</p>
          <div className="flex items-center justify-between gap-2">
            {category && <span className="text-xs text-muted-foreground">{category}</span>}
            {totalStock > 0 && (
              <span className="text-xs text-primary font-semibold flex items-center gap-1">
                <Package size={12} /> {totalStock} available
              </span>
            )}
          </div>
        </div>

        {/* Service-specific info */}
        {isService && (
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mb-2">
            {duration && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                <Clock size={10} /> {duration}
              </span>
            )}
            {locLabel(location_type) && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50">
                <MapPin size={10} /> {locLabel(location_type)}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{description}</p>
        )}

        {/* Variants Selector */}
        {hasVariants && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground mb-1 block">Variant:</label>
            <div className="flex gap-1 flex-wrap">
              {variants?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                    selectedVariant?.id === variant.id
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Section */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-primary">
              ZMW {effectivePrice.toFixed(2)}
            </span>
            {(old_price || (discount_type && discount_type !== "none")) && (
              <span className="text-sm text-muted-foreground line-through">
                ZMW {(old_price || price)?.toFixed(2)}
              </span>
            )}
          </div>
          {review_count > 0 && (
            <p className="text-xs text-muted-foreground">
              {review_count} review{review_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {isService ? (
          <button
            onClick={() => onBuyNow?.({ id, product_name, price: effectivePrice })}
            disabled={disabled}
            className={`mt-auto w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              disabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            📅 Book Now
          </button>
        ) : (
          <div className="mt-auto flex gap-2">
            <button
              onClick={() =>
                onAddToCart?.({
                  offer_id: id,
                  item_name: product_name,
                  unit_price: effectivePrice,
                  image_url,
                  variant: selectedVariant,
                })
              }
              disabled={disabled || isOutOfStock}
              aria-label="Add to cart"
              className={`flex-shrink-0 w-10 rounded-xl border flex items-center justify-center transition-colors ${
                disabled || isOutOfStock
                  ? "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                  : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() =>
                onBuyNow?.({
                  id,
                  product_name,
                  price: effectivePrice,
                  image_url,
                  variant: selectedVariant,
                })
              }
              disabled={disabled || isOutOfStock}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                disabled || isOutOfStock
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isOutOfStock ? "Out of Stock" : "🛒 Buy Now"}
            </button>
          </div>
        )}
      </div>

      {/* Media Lightbox */}
      {showMedia && hasMedia && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowMedia(false)}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl space-y-4"
          >
            {/* Display selected media */}
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center h-96">
              {media_gallery![selectedMediaIndex].type === "video" ? (
                <video
                  src={media_gallery![selectedMediaIndex].url}
                  controls
                  className="w-full h-full"
                />
              ) : (
                <img
                  src={media_gallery![selectedMediaIndex].url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Thumbnails */}
            {media_gallery!.length > 1 && (
              <div className="flex gap-2 overflow-auto pb-2">
                {media_gallery!.map((media, idx) => (
                  <button
                    key={media.id}
                    onClick={() => setSelectedMediaIndex(idx)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedMediaIndex === idx ? "border-primary" : "border-muted"
                    }`}
                  >
                    {media.type === "video" ? (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <FileVideo size={20} className="text-muted-foreground" />
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowMedia(false)}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProductCard;
