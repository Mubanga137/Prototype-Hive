import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingBag, Briefcase, Sparkles } from "lucide-react";
import { CategoryTheme } from "@/lib/categoryThemes";

interface CategoryHeroProps {
  theme: CategoryTheme;
}

interface HeroSlide {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
}

const CategoryHero = ({ theme }: CategoryHeroProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero content with icons instead of emojis
  const heroContent: Record<string, { headline: string; slides: HeroSlide[] }> = {
    tech: {
      headline: "Latest Gadgets & Smart Tech",
      slides: [
        {
          title: "Cutting-Edge Devices",
          description: "Discover the newest smartphones, laptops, and wearables from top brands",
          icon: <ShoppingBag size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Smart Accessories",
          description: "Complete your tech setup with premium chargers, cables, and gadgets",
          icon: <Sparkles size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Expert Services",
          description: "Get tech support, repairs, and consultation from certified professionals",
          icon: <Briefcase size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
      ],
    },
    fashion: {
      headline: "Trending Styles & Curated Looks",
      slides: [
        {
          title: "Premium Collections",
          description: "Explore exclusive apparel, footwear, and accessories for every occasion",
          icon: <ShoppingBag size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Designer Brands",
          description: "Shop authenticated designer pieces from emerging and established brands",
          icon: <Sparkles size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Styling Services",
          description: "Book personal stylists and fashion consultants for custom recommendations",
          icon: <Briefcase size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
      ],
    },
    food: {
      headline: "Fresh & Delicious Flavors",
      slides: [
        {
          title: "Farm-Fresh Produce",
          description: "Organic fruits, vegetables, and locally-sourced ingredients delivered fresh",
          icon: <ShoppingBag size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Gourmet Specialties",
          description: "Artisan foods, premium teas, coffee, and international delicacies",
          icon: <Sparkles size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Catering Services",
          description: "Book professional chefs and catering teams for events and gatherings",
          icon: <Briefcase size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
      ],
    },
    entertainment: {
      headline: "Live Experiences & Events",
      slides: [
        {
          title: "Experience Products",
          description: "Premium entertainment gear, concert tickets, and exclusive merchandise",
          icon: <ShoppingBag size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Event Packages",
          description: "Curated experiences, workshops, and exclusive access to shows",
          icon: <Sparkles size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Professional Services",
          description: "Book DJs, photographers, event planners, and entertainment professionals",
          icon: <Briefcase size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
      ],
    },
    beauty: {
      headline: "Premium Beauty & Skincare",
      slides: [
        {
          title: "Beauty Products",
          description: "Natural skincare, makeup, haircare, and wellness products from top brands",
          icon: <ShoppingBag size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Premium Treatments",
          description: "Luxury serums, face masks, hair treatments, and holistic wellness items",
          icon: <Sparkles size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
        {
          title: "Expert Services",
          description: "Book beauty consultations, facials, hair styling, and spa treatments",
          icon: <Briefcase size={48} />,
          bgGradient: "from-[#B37C1C]/20 to-[#FFFBF2]/10",
        },
      ],
    },
  };

  const content = heroContent[theme.key] || heroContent.tech;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % content.slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [content.slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % content.slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + content.slides.length) % content.slides.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl mb-12 bg-gradient-to-br from-[#FFFBF2] to-[#FFF9F0] border border-[#B37C1C]/20"
    >
      {/* Main title */}
      <div className="px-6 md:px-8 pt-8 md:pt-10 pb-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-[#0F1A35] leading-tight">
          {content.headline}
        </h1>
      </div>

      {/* Carousel Container */}
      <div className="relative px-6 md:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence mode="wait">
            {content.slides.map((slide, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: idx === currentSlide ? 1 : 0.6, y: idx === currentSlide ? 0 : 10 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`relative overflow-hidden rounded-2xl p-6 transition-all ${
                  idx === currentSlide
                    ? "ring-2 ring-[#B37C1C] shadow-lg"
                    : "hover:ring-1 hover:ring-[#B37C1C]/50"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${slide.bgGradient.split(" ").slice(0, 2).join(" ")})`,
                }}
              >
                {/* Icon */}
                <div className="flex items-center justify-center mb-4 text-[#B37C1C]">
                  {slide.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-display font-bold text-[#0F1A35] mb-2 text-center">
                  {slide.title}
                </h3>
                <p className="text-sm text-[#0F1A35]/75 text-center leading-relaxed">
                  {slide.description}
                </p>

                {/* Indicator dot */}
                <div className="flex justify-center gap-1 mt-4 pt-4 border-t border-[#B37C1C]/10">
                  {content.slides.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setCurrentSlide(dotIdx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        dotIdx === currentSlide
                          ? "bg-[#B37C1C] w-6"
                          : "bg-[#B37C1C]/30 hover:bg-[#B37C1C]/50"
                      }`}
                      aria-label={`Go to slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Navigation Arrows (visible on desktop) */}
        <div className="hidden md:flex absolute inset-y-0 left-0 right-0 items-center justify-between pointer-events-none px-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={prevSlide}
            className="pointer-events-auto p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextSlide}
            className="pointer-events-auto p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryHero;
