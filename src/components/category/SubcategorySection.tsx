import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import FeaturedItemCard, { FeaturedItem } from "@/components/FeaturedItemCard";
import { CategoryTheme } from "@/lib/categoryThemes";

interface SubcategorySectionProps {
  title: string;
  description?: string;
  items: FeaturedItem[];
  onBuyNow: (item: FeaturedItem) => void;
  theme: CategoryTheme;
  index?: number;
}

const SubcategorySection = ({
  title,
  description,
  items,
  onBuyNow,
  theme,
  index = 0,
}: SubcategorySectionProps) => {
  const themeClasses = {
    btnBg: theme.btnBg,
    btnHover: theme.btnHover,
    btnText: theme.btnText,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className="mb-10"
    >
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <motion.button
          whileHover={{ gap: 6 }}
          className="flex items-center gap-2 text-primary hover:text-primary font-semibold text-sm transition-colors"
        >
          View More
          <ChevronRight size={16} />
        </motion.button>
      </div>

      {/* Horizontal Scroll Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.slice(0, 8).map((item, i) => (
          <div
            key={item.id}
            className="min-w-[220px] max-w-[240px] shrink-0"
          >
            <FeaturedItemCard
              item={item}
              index={i}
              onBuyNow={onBuyNow}
              themeClasses={themeClasses}
              variant="default"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SubcategorySection;
