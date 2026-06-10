import { motion } from 'framer-motion';
import { ShoppingCart, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export interface HeroSectionLandingProps {
  storeName: string;
  headline?: string;
  subheading?: string;
  description?: string;
  featuredImageUrl?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  onShopClick?: () => void;
  onMessageClick?: () => void;
}

const HeroSectionLanding = ({
  storeName,
  headline,
  subheading = 'Premium Quality, Fast Delivery',
  description,
  featuredImageUrl,
  logoUrl,
  whatsappNumber,
  onShopClick,
  onMessageClick,
}: HeroSectionLandingProps) => {
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);

  const handleShopClick = async () => {
    setShoppingLoading(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      onShopClick?.();
    } finally {
      setShoppingLoading(false);
    }
  };

  const handleMessageClick = async () => {
    setMessagingLoading(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      onMessageClick?.();
    } finally {
      setMessagingLoading(false);
    }
  };
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative py-12 md:py-20 lg:py-24 overflow-hidden"
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* SOFT GRADIENT BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/60" />
      
      {/* Subtle pattern overlay (very low opacity) */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,191,36,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(217,119,6,0.05),transparent_50%)]" />
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* 2-COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* LEFT SIDE - TEXT CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="flex flex-col justify-center space-y-6"
          >
            {/* Small label (optional) */}
            {subheading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 w-fit"
              >
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <p className="text-xs md:text-sm font-semibold text-amber-700 uppercase tracking-widest">
                  Premium Collection
                </p>
              </motion.div>
            )}

            {/* Main Headline - VERY LARGE */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight"
            >
              {headline || storeName}
            </motion.h1>

            {/* Supporting Text */}
            {subheading && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md"
              >
                {subheading}
              </motion.p>
            )}

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md"
              >
                {description}
              </motion.p>
            )}

            {/* CTA BUTTONS ROW - Horizontal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              {/* Primary Button */}
              <button
                onClick={handleShopClick}
                disabled={shoppingLoading}
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-600/40 text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {shoppingLoading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Shop Now
                  </>
                )}
              </button>

              {/* Secondary Button */}
              {whatsappNumber && (
                <button
                  onClick={handleMessageClick}
                  disabled={messagingLoading}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-foreground text-foreground font-bold rounded-xl hover:bg-foreground/5 transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {messagingLoading ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <MessageCircle size={20} />
                      Contact Vendor
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE - MEDIA CARD (FRAMED) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
            className="flex justify-center md:justify-end"
          >
            <div className="relative w-full max-w-md">
              {/* Outer Frame with Border */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-amber-600/40 shadow-2xl bg-white">
                {/* Decorative Badge - Top Center */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    ✨
                  </div>
                </motion.div>

                {/* Inner Image Container */}
                <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center overflow-hidden">
                  {featuredImageUrl ? (
                    <img
                      src={featuredImageUrl}
                      alt={storeName}
                      className="w-full h-full object-cover"
                    />
                  ) : logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={storeName}
                      className="w-4/5 h-4/5 object-contain"
                    />
                  ) : (
                    <span className="text-6xl md:text-7xl font-display font-bold text-amber-600">
                      {storeName[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Card Footer Info */}
                <div className="px-6 py-5 md:px-8 md:py-6 bg-gradient-to-r from-amber-50 to-white border-t border-amber-100/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm md:text-base font-bold text-foreground">{storeName}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Trusted & Verified</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-amber-200">
                      <span className="text-lg">⭐</span>
                      <span className="text-xs md:text-sm font-bold text-amber-700">4.8</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtle shadow glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 blur-2xl -z-10 scale-105" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* MOBILE RESPONSIVE - Stack vertically */}
      <style>{`
        @media (max-width: 768px) {
          /* Grid will naturally stack, ensure media is on bottom */
        }
      `}</style>
    </motion.section>
  );
};

export default HeroSectionLanding;
