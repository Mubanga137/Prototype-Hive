import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Briefcase,
  Clock,
  MapPin,
  Star,
  ShoppingCart,
  MessageCircle,
  X,
  Heart,
  BadgeCheck,
  Truck,
} from "lucide-react";

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

interface ProductCardProps {
  id: number;
  product_name: string | null;
  price: number | null;
  old_price?: number | null;
  image_url: string | null;
  category: string | null;
  storeName?: string | null;
  stock_count?: number | null;
  item_type: string | null;
  description?: string | null;
  duration?: string | null;
  location_type?: string | null;
  rating?: number | null;
  review_count?: number | null;
  isService?: boolean;
  onBuyNow?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: ProductVariant;
  allVariants?: ProductVariant[];
  isFeatured?: boolean;
  storeWhatsapp?: string | null;
}

const locLabel = (l?: string | null) =>
  l === "at_customer" ? "At you" : l === "at_sme" ? "At store" : l === "remote" ? "Online" : null;

const getBadgeStyles = (tag?: string) => {
  const styles: Record<string, { bg: string; text: string; emoji: string }> = {
    "Most Popular": { bg: "bg-red-500", text: "text-white", emoji: "🔥" },
    "Best Value": { bg: "bg-emerald-500", text: "text-white", emoji: "💰" },
    Premium: { bg: "bg-amber-500", text: "text-white", emoji: "⭐" },
    Starter: { bg: "bg-blue-500", text: "text-white", emoji: "⚡" },
  };

  return styles[tag || ""] || { bg: "bg-slate-400", text: "text-white", emoji: "•" };
};

const calculateDiscount = (price?: number | null, oldPrice?: number | null) => {
  if (!oldPrice || !price || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const ProductCard = ({
  id,
  product_name,
  price,
  old_price,
  image_url,
  category,
  storeName,
  stock_count,
  item_type,
  description,
  duration,
  location_type,
  rating = 0,
  review_count = 0,
  isService = item_type === "service",
  onBuyNow,
  disabled = false,
  disabledReason = "Unavailable",
  variant,
  allVariants,
  isFeatured = false,
  storeWhatsapp,
}: ProductCardProps) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(variant || null);

  const displayTitle = selectedVariant?.title || product_name || "Product";
  const displayPrice = selectedVariant?.price ?? price ?? 0;
  const displayOldPrice = selectedVariant?.originalPrice ?? old_price;
  const displayTag = selectedVariant?.tag;
  const displayFeatures = selectedVariant?.features || [];
  const displayDescription = selectedVariant?.description || description;
  const displayStoreName = storeName || "The Hive Store";
  const discountPercent = calculateDiscount(displayPrice, displayOldPrice);
  const badgeStyle = getBadgeStyles(displayTag);
  const availabilityLabel = stock_count === 0 ? "Out of Stock" : "In Stock";
  const locationLabel = locLabel(location_type);

  const formattedPrice = displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2);
  const formattedOldPrice =
    displayOldPrice && displayOldPrice % 1 === 0
      ? displayOldPrice.toFixed(0)
      : displayOldPrice?.toFixed(2);

  const handleDetailsClick = () => {
    setShowDetailsModal(true);
  };

  const handleWhatsAppClick = () => {
    if (storeWhatsapp) {
      const message = `Hi, I'm interested in "${displayTitle}" (ZMW ${formattedPrice})`;
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${storeWhatsapp.replace(/\D/g, "")}?text=${encodedMessage}`, "_blank");
    }
  };

  const handleBuyNow = () => {
    onBuyNow?.({
      id,
      product_name: displayTitle,
      price: displayPrice,
      image_url,
      variant: selectedVariant,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-card rounded-xl overflow-hidden flex flex-col border transition-colors shadow-sm h-full ${
          isFeatured ? "border-primary/40 ring-2 ring-primary/20 shadow-lg" : "border-border hover:border-primary/40"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="relative h-36 sm:h-40 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden">
          {image_url ? (
            <img src={image_url} alt={displayTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary/70">
              {isService ? <Briefcase size={30} /> : <Package size={30} />}
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[75%]">
            {discountPercent > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md w-fit">
                -{discountPercent}% OFF
              </span>
            )}
            {displayTag && (
              <span className={`${badgeStyle.bg} ${badgeStyle.text} text-[10px] font-bold px-2 py-0.5 rounded-md w-fit flex items-center gap-1`}>
                <span>{badgeStyle.emoji}</span>
                <span className="truncate">{displayTag}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label="Save item"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/85 backdrop-blur-sm flex items-center justify-center border border-border hover:bg-background transition-colors"
          >
            <Heart size={16} className="text-muted-foreground" />
          </button>

          {review_count > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-foreground/75 backdrop-blur-sm text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-md">
              <Star size={11} className="fill-yellow-400 text-yellow-400" />
              {rating} ({review_count})
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-1">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {displayStoreName.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground truncate flex-1">{displayStoreName}</span>
            <BadgeCheck size={14} className="text-blue-500 shrink-0" />
          </div>

          <p className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem] mb-2">
            {displayTitle}
          </p>

          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="text-primary font-bold text-base">ZMW {formattedPrice}</span>
            {displayOldPrice && displayOldPrice > displayPrice && (
              <span className="text-xs text-muted-foreground line-through">ZMW {formattedOldPrice}</span>
            )}
          </div>

          {discountPercent > 0 && (
            <p className="text-emerald-600 text-[11px] font-semibold mb-2">Save {discountPercent}%</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-3 min-h-[1.25rem]">
            {isService ? (
              <>
                {duration && (
                  <span className="flex items-center gap-0.5">
                    <Clock size={10} />
                    {duration}
                  </span>
                )}
                {locationLabel && (
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {locationLabel}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className={stock_count === 0 ? "text-destructive" : "text-emerald-600"}>
                  ● {availabilityLabel}
                </span>
                <span className="flex items-center gap-0.5">
                  <Truck size={10} />Fast
                </span>
                <span className="flex items-center gap-0.5">
                  <Package size={10} />Free Ship
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleBuyNow}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-1.5 text-xs py-2.5 px-3 rounded-lg font-bold transition-all ${
                disabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[linear-gradient(135deg,#B37C1C_0%,#000000_100%)] text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
              }`}
            >
              <ShoppingCart size={14} />
              {isService ? "BOOK ORDER" : "BUY NOW"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleWhatsAppClick}
                disabled={disabled || !storeWhatsapp}
                className={`flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg py-1.5 border transition-colors px-2 ${
                  disabled || !storeWhatsapp
                    ? "border-primary/15 text-muted-foreground bg-muted/30 cursor-not-allowed"
                    : "text-primary border-primary/30 hover:bg-primary/5"
                }`}
              >
                <MessageCircle size={12} /> Message
              </button>
              <button
                onClick={handleDetailsClick}
                disabled={disabled}
                className={`flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg py-1.5 border transition-colors px-2 ${
                  disabled
                    ? "border-border text-muted-foreground bg-muted/30 cursor-not-allowed"
                    : "text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                Details
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDetailsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailsModal(false)}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <X size={20} className="text-primary" />
              </button>

              <div className="h-64 sm:h-80 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden relative">
                {image_url ? (
                  <img src={image_url} alt={displayTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground/40">
                    {isService ? <Briefcase size={64} /> : <Package size={64} />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{displayTitle}</h2>
                    {displayTag && (
                      <div className={`${badgeStyle.bg} ${badgeStyle.text} px-3 py-1.5 rounded-full text-xs font-bold w-fit flex items-center gap-1`}>
                        <span>{badgeStyle.emoji}</span>
                        <span>{displayTag}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    <span className="text-4xl font-bold text-primary">ZMW {formattedPrice}</span>
                    {displayOldPrice && displayOldPrice > displayPrice && (
                      <span className="text-lg text-muted-foreground line-through">ZMW {formattedOldPrice}</span>
                    )}
                  </div>
                  {discountPercent > 0 && <p className="text-emerald-600 font-semibold">Save {discountPercent}%</p>}
                </div>

                {displayDescription && (
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground mb-2">About</h3>
                    <p className="text-muted-foreground leading-relaxed">{displayDescription}</p>
                  </div>
                )}

                {displayFeatures.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground mb-3">What You Get</h3>
                    <div className="space-y-2">
                      {displayFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="text-primary font-bold shrink-0 text-lg">✔</span>
                          <span className="text-foreground text-sm leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isService && (
                  <div className="mb-6 space-y-3">
                    {duration && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <Clock size={18} className="text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          Duration: <strong>{duration}</strong>
                        </span>
                      </div>
                    )}
                    {locationLabel && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <MapPin size={18} className="text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          Location: <strong>{locationLabel}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {(allVariants?.length ?? 0) > 1 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground mb-3">Choose Your Variant</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allVariants?.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`py-2.5 px-3 rounded-lg font-semibold text-sm transition-all text-left ${
                            selectedVariant?.id === v.id
                              ? "bg-primary text-primary-foreground border-2 border-primary"
                              : "bg-muted text-foreground border-2 border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="text-xs line-clamp-1">{v.title}</div>
                          <div className="text-xs opacity-75 mt-0.5">ZMW {v.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      handleBuyNow();
                      setShowDetailsModal(false);
                    }}
                    disabled={disabled}
                    className="w-full py-3.5 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} />
                    {isService ? "BOOK ORDER" : "BUY NOW"}
                  </button>
                  {storeWhatsapp && (
                    <button
                      onClick={() => {
                        handleWhatsAppClick();
                        setShowDetailsModal(false);
                      }}
                      className="w-full py-3 rounded-xl font-semibold text-base border-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      Message on WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductCard;
