import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

export interface CategoryVendor {
  id: number;
  store_name: string;
  description: string;
  rating?: number;
  review_count?: number;
  verified?: boolean;
  featured?: boolean;
  location?: string;
}

interface VendorCarouselProps {
  vendors: CategoryVendor[];
  theme: any;
}

const VendorCarousel = ({ vendors, theme }: VendorCarouselProps) => {
  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-12"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag size={20} className="text-[#B37C1C]" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0F1A35]">
              Featured Vendors
            </h2>
            <p className="text-sm text-[#0F1A35]/60">
              Trusted sellers in {theme.title.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {vendors.map((vendor, i) => (
          <motion.div
            key={vendor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className="bg-white rounded-2xl overflow-hidden border border-[#B37C1C]/20 hover:border-[#B37C1C]/50 shadow-sm hover:shadow-md transition-all group cursor-pointer min-w-[280px] max-w-[320px] shrink-0"
          >
            {/* Header */}
            <div className="relative h-24 bg-gradient-to-br from-[#B37C1C]/10 to-[#B37C1C]/5 flex items-end p-4">
              <div className="w-16 h-16 rounded-full border-4 border-white bg-[#B37C1C] flex items-center justify-center text-white font-display font-bold text-xl shadow-md -mb-8 group-hover:scale-105 transition-transform">
                {vendor.store_name[0].toUpperCase()}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 pt-6">
              <h3 className="font-display font-bold text-lg text-[#0F1A35] group-hover:text-[#B37C1C] transition-colors line-clamp-1 mb-2">
                {vendor.store_name}
              </h3>

              <p className="text-sm text-[#0F1A35]/70 mb-4 line-clamp-2">
                {vendor.description}
              </p>

              {vendor.location && (
                <div className="text-xs text-[#0F1A35]/60 mb-4">
                  📍 {vendor.location}
                </div>
              )}

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
    </motion.div>
  );
};

export default VendorCarousel;
