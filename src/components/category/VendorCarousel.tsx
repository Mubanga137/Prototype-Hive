import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, BadgeCheck, Star, MapPin } from "lucide-react";

export interface CategoryVendor {
  id: number;
  store_name: string;
  description: string;
  rating: number;
  review_count: number;
  verified: boolean;
  featured: boolean;
  location: string;
  initials: string;
}

interface VendorCarouselProps {
  vendors: CategoryVendor[];
  theme: any;
}

const VendorCarousel = ({ vendors, theme }: VendorCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!vendors || vendors.length === 0) {
    return null;
  }

  const itemsPerView = 3;
  const maxIndex = Math.max(0, vendors.length - itemsPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const visibleVendors = vendors.slice(currentIndex, currentIndex + itemsPerView);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-12 bg-gradient-to-br from-[#FFFBF2] to-[#FFF9F0] rounded-3xl px-6 md:px-8 mb-12 border border-[#B37C1C]/20"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0F1A35] mb-1">
              Featured Vendors
            </h2>
            <p className="text-sm text-[#0F1A35]/60">
              Trusted sellers providing quality {theme.title.toLowerCase()} products and services
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevSlide}
              className="p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors"
              aria-label="Previous vendors"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextSlide}
              className="p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors"
              aria-label="Next vendors"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>

        {/* Vendor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleVendors.map((vendor, idx) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="bg-white rounded-2xl overflow-hidden border border-[#B37C1C]/20 hover:border-[#B37C1C]/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            >
              {/* Header with initials */}
              <div className="relative h-24 bg-gradient-to-br from-[#B37C1C]/10 to-[#B37C1C]/5 flex items-end p-4">
                {/* Badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {vendor.featured && (
                    <span className="bg-[#B37C1C] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      Featured
                    </span>
                  )}
                  {vendor.verified && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <BadgeCheck size={10} /> Verified
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-16 h-16 rounded-full border-4 border-white bg-[#B37C1C] flex items-center justify-center text-white font-display font-bold text-xl shadow-md -mb-8 group-hover:scale-105 transition-transform">
                  {vendor.initials}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 pt-6">
                {/* Store name and rating */}
                <div className="mb-2">
                  <h3 className="font-display font-bold text-lg text-[#0F1A35] group-hover:text-[#B37C1C] transition-colors line-clamp-1">
                    {vendor.store_name}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-sm text-[#0F1A35]/70 mb-3 line-clamp-2">
                  {vendor.description}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#B37C1C]/10">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.floor(vendor.rating)
                            ? "fill-[#B37C1C] text-[#B37C1C]"
                            : "text-[#B37C1C]/30"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-[#0F1A35]">
                    {vendor.rating.toFixed(1)} ({vendor.review_count})
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={14} className="text-[#B37C1C] shrink-0" />
                  <span className="text-xs text-[#0F1A35]/70">{vendor.location}</span>
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 px-4 bg-[#B37C1C] text-white rounded-xl font-semibold text-sm hover:bg-[#0F1A35] transition-colors"
                >
                  Visit Store
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-8">
          {vendors.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(Math.min(idx, maxIndex))}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx >= currentIndex && idx < currentIndex + itemsPerView
                  ? "bg-[#B37C1C] w-8"
                  : "bg-[#B37C1C]/30 hover:bg-[#B37C1C]/50"
              }`}
              aria-label={`Go to vendor ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default VendorCarousel;
