import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { CategoryTheme } from "@/lib/categoryThemes";

interface CategoryHeroProps {
  theme: CategoryTheme;
}

interface HeroSlide {
  title: string;
  subtitle: string;
  accentColor: string;
}

const CategoryHero = ({ theme }: CategoryHeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides: Record<string, HeroSlide[]> = {
    tech: [
      { title: "Latest Gadgets", subtitle: "Explore cutting-edge technology and smart devices", accentColor: "#06B6D4" },
      { title: "Smart Accessories", subtitle: "Premium chargers, cables, and tech essentials", accentColor: "#0EA5E9" },
      { title: "Expert Support", subtitle: "Professional repairs and tech consultations", accentColor: "#06B6D4" },
    ],
    fashion: [
      { title: "Trending Styles", subtitle: "Discover the latest fashion collections and trends", accentColor: "#3B4C8F" },
      { title: "Premium Brands", subtitle: "Authenticated designer pieces and exclusive looks", accentColor: "#5B6BB8" },
      { title: "Style Services", subtitle: "Personal styling and fashion consultation", accentColor: "#3B4C8F" },
    ],
    food: [
      { title: "Fresh & Delicious", subtitle: "Farm-fresh produce and locally-sourced ingredients", accentColor: "#F97316" },
      { title: "Gourmet Selection", subtitle: "Premium foods, specialty items, and international cuisine", accentColor: "#FB923C" },
      { title: "Catering Services", subtitle: "Professional chefs for events and gatherings", accentColor: "#F97316" },
    ],
    entertainment: [
      { title: "Live Experiences", subtitle: "Premium entertainment gear and exclusive events", accentColor: "#8B5CF6" },
      { title: "Events & Packages", subtitle: "Curated experiences and exclusive access", accentColor: "#A78BFA" },
      { title: "Professionals", subtitle: "Book DJs, photographers, and event specialists", accentColor: "#8B5CF6" },
    ],
    beauty: [
      { title: "Premium Beauty", subtitle: "Natural skincare and makeup from top brands", accentColor: "#EC4899" },
      { title: "Luxury Treatments", subtitle: "Premium serums, masks, and wellness products", accentColor: "#F472B6" },
      { title: "Beauty Services", subtitle: "Facials, hair styling, and spa treatments", accentColor: "#EC4899" },
    ],
  };

  const slides = heroSlides[theme.key] || heroSlides.tech;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const currentColor = slides[currentSlide].accentColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl mb-12 bg-gradient-to-br from-slate-50 to-slate-100/50"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${currentColor}08 0%, ${currentColor}03 100%)`,
            }}
          />
        </AnimatePresence>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: currentColor }} />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: currentColor }} />

      {/* Content */}
      <div className="relative z-10">
        <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <div className="w-2 h-2 rounded-full" style={{ background: currentColor }} />
              <span className="text-sm font-semibold" style={{ color: currentColor }}>
                {theme.title}
              </span>
            </motion.div>

            {/* Main content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4 leading-tight tracking-tight">
                  {slides[currentSlide].title}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  {slides[currentSlide].subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slide indicators */}
            <div className="flex gap-2 mt-10">
              {slides.map((_, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className="transition-all rounded-full"
                  style={{
                    background: idx === currentSlide ? currentColor : `${currentColor}30`,
                    width: idx === currentSlide ? 32 : 8,
                    height: 8,
                  }}
                  whileHover={{ scale: 1.2 }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="absolute bottom-6 right-6 z-10 flex gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow flex items-center justify-center text-foreground"
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow flex items-center justify-center text-foreground"
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CategoryHero;
