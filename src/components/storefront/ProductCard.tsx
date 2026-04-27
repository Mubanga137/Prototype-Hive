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
  ChevronDown,
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
  isFeatured?: boolean;
  storeWhatsapp?: string | null;
}

const locLabel = (l?: string | null) =>
  l === "at_customer" ? "At you" : l === "at_sme" ? "At store" : l === "remote" ? "Online" : null;

// Badge colors based on tag type
const getBadgeStyles = (tag?: string) => {
  const styles: Record<
    string,
    { bg: string; text: string; emoji: string }
  > = {
    "Most Popular": { bg: "bg-red-500", text: "text-white", emoji: "🔥" },
    "Best Value": { bg: "bg-emerald-500", text: "text-white", emoji: "💰" },
    Premium: { bg: "bg-amber-500", text: "text-white", emoji: "⭐" },
    Starter: { bg: "bg-blue-500", text: "text-white", emoji: "⚡" },
  };
  return styles[tag || ""] || { bg: "bg-slate-400", text: "text-white", emoji: "•" };
};

// Discount calculation
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
  stock_count,
  item_type,
  description,
  duration,
  location_type,
  rating = 0,
  review_count = 0,
  isService = item_type === "service",
  onBuyNow,
  onAddToCart,
  disabled = false,
  disabledReason = "Unavailable",
  variant,
  isFeatured = false,
  storeWhatsapp,
}: ProductCardProps) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variant || null
  );

  // Use variant data if available, otherwise use card props
  const displayTitle = selectedVariant?.title || product_name || "Product";
  const displayPrice = selectedVariant?.price ?? price ?? 0;
  const displayOldPrice = selectedVariant?.originalPrice ?? old_price;
  const displayTag = selectedVariant?.tag;
  const displayFeatures = selectedVariant?.features || [];
  const displayDescription = selectedVariant?.description || description;

  const discountPercent = calculateDiscount(displayPrice, displayOldPrice);

  const badgeStyle = getBadgeStyles(displayTag);

  // Don't show price with decimals if it's a whole number
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
      window.open(
        `https://wa.me/${storeWhatsapp.replace(/\D/g, "")}?text=${encodedMessage}`,
        "_blank"
      );
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
        className={`flex flex-col h-full rounded-2xl border transition-all overflow-hidden ${
          isFeatured
            ? "scale-105 ring-2 ring-primary/40 shadow-lg border-primary/40"
            : "border-border hover:border-primary/40"
        } ${disabled ? "opacity-50" : ""} bg-white`}
      >
        {/* SECTION 1: MEDIA */}
        <div className="relative h-48 md:h-56 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden group">
          {image_url ? (
            <img
              src={image_url}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground/40">
              {isService ? <Briefcase size={40} /> : <Package size={40} />}
            </div>
          )}

          {/* Subtle gradient overlay (bottom fade) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

          {/* SECTION 2: BADGE (floating, top-right) */}
          {displayTag && (
            <div className="absolute top-3 right-3">
              <div
                className={`${badgeStyle.bg} ${badgeStyle.text} px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1`}
              >
                <span>{badgeStyle.emoji}</span>
                <span>{displayTag}</span>
              </div>
            </div>
          )}

          {/* Discount badge (if applicable) */}
          {discountPercent > 0 && (
            <div className="absolute top-3 left-3">
              <div className="bg-red-500 text-white px-2.5 py-1.5 rounded-full text-xs font-bold shadow-md">
                -{discountPercent}%
              </div>
            </div>
          )}
        </div>

        {/* CONTENT WRAPPER */}
        <div className="p-4 md:p-5 flex-1 flex flex-col">
          {/* SECTION 3: TITLE */}
          <h3 className="text-sm md:text-base font-bold text-foreground mb-1 line-clamp-2">
            {displayTitle}
          </h3>

          {/* Subtitle/category */}
          {category && (
            <p className="text-xs text-muted-foreground mb-3">{category}</p>
          )}

          {/* Service-specific metadata */}
          {isService && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mb-3">
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

          {/* SECTION 4: PRICE BLOCK */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl md:text-3xl font-bold text-primary">
                ZMW {formattedPrice}
              </span>
              {displayOldPrice && displayOldPrice > displayPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ZMW {formattedOldPrice}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <p className="text-xs text-emerald-600 font-semibold">
                Save {discountPercent}%
              </p>
            )}
            {review_count > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={`${
                        i < Math.round(rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  ({review_count})
                </span>
              </div>
            )}
          </div>

          {/* SECTION 5: VALUE BULLETS */}
          {displayFeatures && displayFeatures.length > 0 && (
            <div className="mb-4 space-y-1.5 flex-1">
              {displayFeatures.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold shrink-0 mt-0.5">✔</span>
                  <span className="text-foreground text-xs md:text-sm leading-snug">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 6: CTA SECTION */}
          <div className="space-y-2.5">
            {/* PRIMARY CTA */}
            <button
              onClick={handleBuyNow}
              disabled={disabled}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                disabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
              }`}
            >
              <ShoppingCart size={16} />
              {isService ? "Book Now" : "Buy Now"}
            </button>

            {/* SECONDARY CTAs - Both as pill buttons */}
            <div className="space-y-2">
              {/* WHATSAPP CTA */}
              {storeWhatsapp && (
                <button
                  onClick={handleWhatsAppClick}
                  disabled={disabled}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    disabled
                      ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
                      : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60"
                  }`}
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              )}

              {/* VIEW DETAILS CTA - Now a proper pill button */}
              <button
                onClick={handleDetailsClick}
                disabled={disabled}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                  disabled
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
                    : "border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:border-muted-foreground/50"
                }`}
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* DETAILS MODAL */}
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
              {/* Close button */}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <X size={20} className="text-primary" />
              </button>

              {/* Large media display */}
              <div className="h-80 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden relative">
                {image_url ? (
                  <img
                    src={image_url}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground/40">
                    {isService ? <Briefcase size={64} /> : <Package size={64} />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>

              {/* Modal content */}
              <div className="p-6 md:p-8">
                {/* Title + badge */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {displayTitle}
                    </h2>
                    {displayTag && (
                      <div className={`${badgeStyle.bg} ${badgeStyle.text} px-3 py-1.5 rounded-full text-xs font-bold w-fit flex items-center gap-1`}>
                        <span>{badgeStyle.emoji}</span>
                        <span>{displayTag}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-primary">
                      ZMW {formattedPrice}
                    </span>
                    {displayOldPrice && displayOldPrice > displayPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        ZMW {formattedOldPrice}
                      </span>
                    )}
                  </div>
                  {discountPercent > 0 && (
                    <p className="text-emerald-600 font-semibold">
                      Save {discountPercent}%
                    </p>
                  )}
                </div>

                {/* Description */}
                {displayDescription && (
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground mb-2">About</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {displayDescription}
                    </p>
                  </div>
                )}

                {/* What you get */}
                {displayFeatures && displayFeatures.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-foreground mb-3">What You Get</h3>
                    <div className="space-y-2">
                      {displayFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="text-primary font-bold shrink-0 text-lg">✔</span>
                          <span className="text-foreground text-sm leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service info */}
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
                    {locLabel(location_type) && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <MapPin size={18} className="text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          Location: <strong>{locLabel(location_type)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleBuyNow();
                      setShowDetailsModal(false);
                    }}
                    disabled={disabled}
                    className="w-full py-3.5 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isService ? "Book Now" : "Buy Now"}
                  </button>
                  {storeWhatsapp && (
                    <button
                      onClick={() => {
                        handleWhatsAppClick();
                        setShowDetailsModal(false);
                      }}
                      className="w-full py-3 rounded-xl font-semibold text-base border-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                    >
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
