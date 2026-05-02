import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import FeaturedItemCard, { FeaturedItem } from "@/components/FeaturedItemCard";
import { CategoryTheme } from "@/lib/categoryThemes";

interface DiscoverySectionProps {
  items: FeaturedItem[];
  onBuyNow: (item: FeaturedItem) => void;
  theme: CategoryTheme;
  usedItemIds?: Set<number>;
}

const DiscoverySection = ({
  items,
  onBuyNow,
  theme,
  usedItemIds = new Set(),
}: DiscoverySectionProps) => {
  // Filter out items already used in other sections
  const unusedItems = useMemo(
    () => items.filter((item) => !usedItemIds.has(item.id)),
    [items, usedItemIds]
  );

  // Randomize and limit to 8 items
  const discoveryItems = useMemo(() => {
    const shuffled = [...unusedItems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }, [unusedItems]);

  const themeClasses = {
    btnBg: theme.btnBg,
    btnHover: theme.btnHover,
    btnText: theme.btnText,
  };

  if (discoveryItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-10"
    >
      {/* Section Header */}
      <div className="mb-4">
        <h3 className="text-xl font-display font-bold text-foreground mb-1">
          You Might Also Like
        </h3>
        <p className="text-sm text-muted-foreground">
          More great selections from {theme.title}
        </p>
      </div>

      {/* Mixed Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      >
        {discoveryItems.map((item, i) => (
          <FeaturedItemCard
            key={item.id}
            item={item}
            index={i}
            onBuyNow={onBuyNow}
            themeClasses={themeClasses}
            variant="default"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default DiscoverySection;
