import { motion } from 'framer-motion';
import { MessageCircle, ShoppingCart, CheckCircle } from 'lucide-react';

export interface HeroSectionEditorialProps {
  storeName: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
  description?: string;
  whatsappNumber?: string;
  onMessageClick?: () => void;
  onShopClick?: () => void;
}

const HeroSectionEditorial = ({
  storeName,
  heroTitle = storeName,
  heroSubtitle = 'Premium Quality, Fast Delivery',
  heroImageUrl,
  bannerUrl,
  logoUrl,
  description,
  whatsappNumber,
  onMessageClick,
  onShopClick,
}: HeroSectionEditorialProps) => {
  // Use featured hero image first, then fallback to banner
  const frameImage = heroImageUrl || bannerUrl;

  return (
    <section className="w-full bg-[#FFFBF2] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Two-column grid: Left (Typography) | Right (Image Frame) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* LEFT COLUMN: Brand Identity & Typography */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Brand Identity Bar */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="w-12 h-12 rounded-full border-2 border-[#B37C1C] overflow-hidden flex items-center justify-center bg-[#F5F1ED]">
                  <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-[#B37C1C] flex items-center justify-center bg-[#F5F1ED] text-[#B37C1C] font-bold text-lg">
                  {storeName[0]}
                </div>
              )}
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold text-[#0F1A35]">{storeName}</h3>
                <CheckCircle size={18} className="text-[#B37C1C]" />
              </div>
            </div>

            {/* Main Slogan - Playfair Display style */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-6xl font-serif font-bold text-[#0F1A35] leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {heroTitle}
            </motion.h1>

            {/* Body Copy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-4"
            >
              <p className="text-base md:text-lg text-gray-600 max-w-md leading-relaxed font-light">
                {description || heroSubtitle}
              </p>
            </motion.div>

            {/* Action Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              <button
                onClick={onShopClick}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-[#B37C1C] text-white font-semibold rounded-lg hover:bg-[#9b6816] transition-colors shadow-md hover:shadow-lg"
              >
                <ShoppingCart size={18} />
                Shop Now
              </button>
              {whatsappNumber && (
                <button
                  onClick={() => onMessageClick?.()}
                  className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 border-2 border-[#B37C1C] text-[#0F1A35] font-semibold rounded-lg hover:bg-[#FFFBF2] transition-colors"
                >
                  <MessageCircle size={18} />
                  Contact Vendor
                </button>
              )}
            </motion.div>

            {/* Social Proof Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="pt-4 border-t border-gray-200"
            >
              <p className="text-xs md:text-sm text-gray-600 font-light">
                <span className="mr-4">⚡ 150+ Orders</span>
                <span className="mr-4">⭐ 4.8 Rating</span>
                <span>✓ Verified Store</span>
              </p>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN: Gallery Image Frame */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex justify-center md:justify-end"
          >
            {frameImage ? (
              <div className="relative w-full max-w-sm">
                {/* Gold Border Frame with Museum Shadow */}
                <div className="aspect-square md:aspect-[4/5] rounded-xl overflow-hidden border border-[#B37C1C] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                  <img
                    src={frameImage}
                    alt={storeName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Decorative gold accent */}
                <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-[#B37C1C]" />
                <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-[#B37C1C]" />
              </div>
            ) : (
              <div className="w-full max-w-sm aspect-square md:aspect-[4/5] rounded-xl border border-[#B37C1C] bg-[#F5F1ED] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">📸</div>
                  <p className="text-sm text-gray-500">Add a featured image</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionEditorial;
