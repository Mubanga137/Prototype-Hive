import { motion } from 'framer-motion';
import { MessageCircle, ShoppingCart } from 'lucide-react';

export interface HeroSectionProps {
  storeName: string;
  tagline?: string;
  bannerUrl?: string;
  logoUrl?: string;
  description?: string;
  whatsappNumber?: string;
  onMessageClick?: () => void;
  onShopClick?: () => void;
  featuredImageUrl?: string;
  isEditing?: boolean;
  onBannerChange?: (url: string) => void;
  onLogoChange?: (url: string) => void;
  onTaglineChange?: (text: string) => void;
}

const HeroSection = ({
  storeName,
  tagline = 'Premium Quality, Fast Delivery',
  bannerUrl,
  logoUrl,
  description,
  whatsappNumber,
  onMessageClick,
  onShopClick,
  featuredImageUrl,
  isEditing = false,
}: HeroSectionProps) => {
  // Use featured image if available, otherwise banner
  const backgroundImage = featuredImageUrl || bannerUrl;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative pt-0"
    >
      {/* BACKGROUND MEDIA LAYER - Full width, 65-80vh */}
      <div className="relative w-full h-screen max-h-[80vh] min-h-[400px] overflow-hidden">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt="Store banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary to-muted" />
        )}

        {/* TEXT + CTA BLOCK - Left side */}
        <div className="absolute inset-0 flex flex-col justify-center items-start px-6 md:px-12">
          <div className="max-w-2xl">
            {/* Store Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-2 md:mb-4 leading-tight"
            >
              {storeName}
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-2xl text-white/90 mb-4 md:mb-6 font-medium max-w-xl"
            >
              {tagline}
            </motion.p>

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base md:text-lg text-white/80 mb-6 md:mb-8 max-w-xl leading-relaxed"
              >
                {description}
              </motion.p>
            )}

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3 md:gap-4"
            >
              <button
                onClick={onShopClick}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/40"
              >
                <ShoppingCart size={18} />
                Shop Now
              </button>
              {whatsappNumber && (
                <button
                  onClick={onMessageClick}
                  className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white/20 backdrop-blur text-white font-bold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
                >
                  <MessageCircle size={18} />
                  Message
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* FOREGROUND MEDIA CARD - Right side, overlapping */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="absolute right-4 md:right-12 bottom-8 md:bottom-16 top-1/4 md:top-1/3 h-fit w-64 md:w-80"
        >
          <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20">
            {logoUrl ? (
              <div className="aspect-square bg-gradient-to-br from-secondary to-muted flex items-center justify-center p-4">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
                <span className="text-6xl md:text-7xl font-display font-black text-primary">
                  {storeName[0]}
                </span>
              </div>
            )}
            {/* Card Badge */}
            <div className="px-4 py-3 md:px-6 md:py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
              <p className="text-sm md:text-base font-bold">Premium Quality</p>
              <p className="text-xs text-primary-foreground/80">Trusted by 2.5K+ customers</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Trust badges row under hero - small and compact */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between text-xs md:text-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-lg">⭐</span>
            <span className="font-semibold text-foreground">4.8 Rating</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-lg">🚀</span>
            <span className="font-semibold text-foreground">Fast Delivery</span>
          </div>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-1 whitespace-nowrap hidden sm:flex">
            <span className="text-lg">✅</span>
            <span className="font-semibold text-foreground">Verified Store</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroSection;
