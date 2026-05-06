import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Smartphone, Shirt, Music, UtensilsCrossed, Sparkles, ArrowRight } from "lucide-react";
import FeaturedItemCard, { type FeaturedItem } from "@/components/FeaturedItemCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import { supabase } from "@/integrations/supabase/client";

const categoryCards = [
  { label: "Tech", emoji: "📱", icon: Smartphone, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Latest gadgets & devices" },
  { label: "Fashion", emoji: "👗", icon: Shirt, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Trendy clothing & accessories" },
  { label: "Food", emoji: "🍟", icon: UtensilsCrossed, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Fresh & organic delights" },
  { label: "Entertainment", emoji: "🎬", icon: Music, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Events & bookings" },
  { label: "Beauty", emoji: "💄", icon: Sparkles, color: "from-primary/30 to-primary/10", gradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-background", description: "Beauty & skincare" },
];

const Categories = () => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCategoryClick = (categoryLabel: string) => {
    navigate(`/category/${categoryLabel.toLowerCase()}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <FolderOpen size={24} className="text-primary" /> Categories
        </h2>
        <p className="text-muted-foreground mt-1">Browse by your favourite categories</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {categoryCards.map((cat, i) => (
          <motion.button
            key={cat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, type: "spring", damping: 20, stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryClick(cat.label)}
            className="relative overflow-hidden rounded-2xl border border-primary/20 hover:border-primary/50 bg-gradient-to-br from-card/60 to-secondary/30 backdrop-blur-sm transition-all group p-6"
          >
            {/* Animated background gradient */}
            <div className={`absolute inset-0 ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                  <span className="text-2xl">{cat.emoji}</span>
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>
              <motion.div className="flex-shrink-0">
                <ArrowRight size={18} className="text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </div>
          </motion.button>
        ))}
      </div>

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default Categories;
