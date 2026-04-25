import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";

interface Props {
  brandName?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  onShopNow?: () => void;
}

const HeroSectionStorefront = ({
  brandName,
  description,
  bannerUrl,
  logoUrl,
  onShopNow,
}: Props) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative py-12 md:py-20 bg-gradient-to-b from-secondary/30 to-background"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT: Text Block */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 md:order-1"
          >
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
                {brandName || "Welcome to Our Store"}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {description || "Discover amazing products and services curated just for you."}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={onShopNow}
                className="btn-gold flex items-center gap-2 px-8 py-4 text-base font-bold rounded-xl hover:shadow-lg transition-all"
              >
                <Zap size={20} /> Shop Now
              </button>
              <button className="flex items-center gap-2 px-8 py-4 text-base font-bold rounded-xl border-2 border-primary text-primary hover:bg-primary/5 transition-colors">
                Learn More <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>

          {/* RIGHT: Foreground Media Card with Gold Border */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative md:order-2"
          >
            {/* Background image (behind) */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 -z-10 blur-2xl h-full w-full"></div>

            {/* Gold-bordered foreground card */}
            <div className="relative rounded-3xl overflow-hidden border-4 border-primary shadow-2xl bg-card">
              <div className="aspect-[3/4] md:aspect-[2/3] overflow-hidden">
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Hero"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-muted/20 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted-foreground text-lg font-semibold">Hero Image</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating badge (top-center) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
              <div className="w-16 h-16 rounded-full bg-primary border-4 border-background shadow-lg flex items-center justify-center">
                <Zap size={28} className="text-primary-foreground" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroSectionStorefront;
