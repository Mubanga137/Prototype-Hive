import { motion } from 'framer-motion';
import { ShoppingCart, MessageCircle, BadgeCheck, Zap, Star } from 'lucide-react';

export interface HeroSectionRefinedProps {
  storeName: string;
  storeLogoUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  totalItems?: number;
  rating?: number;
  onShopClick?: () => void;
  onContactClick?: () => void;
}

const HeroSectionRefined = ({
  storeName,
  storeLogoUrl,
  heroTitle = 'Curated Premium Selection',
  heroSubtitle,
  heroImageUrl,
  totalItems = 0,
  rating = 4.8,
  onShopClick,
  onContactClick,
}: HeroSectionRefinedProps) => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden"
    >
      {/* GOLD HONEYCOMB BACKGROUND */}
      <div className="absolute inset-0 bg-[#FFFBF2]" />
      
      {/* Honeycomb pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="honeycomb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M30,0 L60,17.32 L60,51.96 L30,69.28 L0,51.96 L0,17.32 Z"
              fill="none"
              stroke="#B37C1C"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#honeycomb)" />
      </svg>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="py-16 md:py-20 lg:py-24">
          {/* 2-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* LEFT COLUMN - TEXT CONTENT */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="space-y-6 md:space-y-8"
            >
              {/* IDENTITY STRIP - Store info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-3 pb-4 border-b border-amber-200/30"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-300 flex items-center justify-center flex-shrink-0">
                  {storeLogoUrl ? (
                    <img
                      src={storeLogoUrl}
                      alt={storeName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-lg font-bold text-amber-700">
                      {storeName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Store Name + Verified */}
                <div className="flex items-center gap-2">
                  <p className="text-sm md:text-base font-bold text-[#0F1A35]">
                    {storeName}
                  </p>
                  <BadgeCheck size={18} className="text-blue-500 flex-shrink-0" />
                </div>

                {/* Stats */}
                <div className="ml-auto flex items-center gap-2 text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                  <Zap size={14} className="text-amber-600" />
                  <span className="font-medium">{totalItems} items</span>
                  <span className="text-gray-300">•</span>
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="font-medium">{rating} rating</span>
                </div>
              </motion.div>

              {/* MAIN HEADLINE - Removed redundant store name since it appears in identity strip with verified badge */}
              {heroTitle && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[#0F1A35] leading-tight tracking-tight"
                >
                  {heroTitle}
                </motion.h1>
              )}

              {/* SUBTITLE */}
              {heroSubtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg"
                >
                  {heroSubtitle}
                </motion.p>
              )}

              {/* CTA BUTTONS - SLEEK */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-3 pt-4"
              >
                {/* Primary Button */}
                <button
                  onClick={onShopClick}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B37C1C] hover:bg-[#9D6B17] text-white font-medium text-sm md:text-base rounded-lg transition-colors shadow-lg shadow-[#B37C1C]/20"
                >
                  <ShoppingCart size={16} />
                  Shop Now
                </button>

                {/* Secondary Button */}
                <button
                  onClick={onContactClick}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-[#B37C1C] text-[#B37C1C] font-medium text-sm md:text-base rounded-lg hover:bg-[#B37C1C]/5 transition-colors"
                >
                  <MessageCircle size={16} />
                  Contact Vendor
                </button>
              </motion.div>
            </motion.div>

            {/* RIGHT COLUMN - FRAMED PORTRAIT */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
              className="flex justify-center lg:justify-end"
            >
              {heroImageUrl ? (
                <div className="relative w-full max-w-md">
                  {/* Gallery Art Frame */}
                  <div className="relative">
                    {/* Decorative offset background */}
                    <div className="absolute inset-0 w-full h-full bg-white border border-[#B37C1C]/40 transform translate-x-2 translate-y-2 rounded-sm" />

                    {/* Main frame with image */}
                    <div className="relative bg-white border-2 border-[#B37C1C] rounded-sm overflow-hidden shadow-[10px_10px_40px_rgba(179,124,28,0.15)]">
                      <div className="aspect-[4/5] overflow-hidden bg-amber-50">
                        <img
                          src={heroImageUrl}
                          alt="Featured"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md aspect-[4/5] bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-[#B37C1C] rounded-sm flex items-center justify-center text-amber-700 font-display text-xl shadow-[10px_10px_40px_rgba(179,124,28,0.15)]">
                  Featured Image
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroSectionRefined;
