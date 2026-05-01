import { motion } from "framer-motion";
import { CategoryTheme } from "@/lib/categoryThemes";

interface CategoryHeroProps {
  theme: CategoryTheme;
  onBackClick: () => void;
}

const CategoryHero = ({ theme, onBackClick }: CategoryHeroProps) => {
  // Map category to hero content
  const heroContent: Record<string, { headline: string; subheading: string; bgClass: string }> = {
    tech: {
      headline: "Latest Gadgets & Smart Tech",
      subheading: "Cutting-edge devices, phones & accessories",
      bgClass: "from-cyan-900/40 via-cyan-700/20 to-transparent",
    },
    fashion: {
      headline: "Trending Styles & Curated Looks",
      subheading: "Editorial-inspired collections for every occasion",
      bgClass: "from-slate-900/40 via-slate-700/20 to-transparent",
    },
    food: {
      headline: "Fresh & Delicious Flavors",
      subheading: "Farm-fresh meals, snacks & local specialties",
      bgClass: "from-orange-900/40 via-orange-700/20 to-transparent",
    },
    entertainment: {
      headline: "Live Experiences & Events",
      subheading: "Book experiences, services & entertainment",
      bgClass: "from-violet-900/40 via-violet-700/20 to-transparent",
    },
    beauty: {
      headline: "Premium Beauty & Skincare",
      subheading: "Natural products, treatments & wellness",
      bgClass: "from-pink-900/40 via-pink-700/20 to-transparent",
    },
  };

  const content = heroContent[theme.key] || heroContent.tech;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl mb-8 px-6 py-16 md:py-24"
    >
      {/* Ambient Radial Gradient Glow (Category-Specific) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: theme.gradient,
        }}
      />

      {/* Dark overlay for text contrast */}
      <div className={`absolute inset-0 bg-gradient-to-b ${content.bgClass} pointer-events-none`} />

      {/* Content */}
      <div className="relative z-10 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
            <span className="text-2xl">{theme.emoji}</span>
            <span className="text-xs font-semibold text-white uppercase tracking-widest">
              {theme.title}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-3 leading-tight">
            {content.headline}
          </h1>

          <p className="text-lg md:text-xl text-white/85 mb-6 max-w-2xl">
            {content.subheading}
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBackClick}
            className={`${theme.btnBg} ${theme.btnHover} ${theme.btnText} px-6 py-3 rounded-xl font-semibold text-sm transition-all`}
          >
            ← Back to Dashboard
          </motion.button>
        </motion.div>
      </div>

      {/* Decorative accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(to right, ${theme.honeycombColor}, transparent)`,
        }}
      />
    </motion.div>
  );
};

export default CategoryHero;
