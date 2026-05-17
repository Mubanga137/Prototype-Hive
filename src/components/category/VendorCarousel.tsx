import { ShoppingBag } from "lucide-react";
import VendorCard, { VendorData } from "@/components/VendorCard";

interface VendorCarouselProps {
  vendors: VendorData[];
  theme: any;
}

const VendorCarousel = ({ vendors, theme }: VendorCarouselProps) => {
  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Featured Vendors
            </h2>
            <p className="text-sm text-muted-foreground">
              Trusted sellers in {theme.title.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {vendors.map((vendor, i) => (
          <VendorCard key={vendor.id} vendor={vendor} index={i} />
        ))}
      </div>
    </div>
  );
};

export default VendorCarousel;
