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

      {/* Carousel Container - Horizontal Layout */}
      <div className="relative px-6 md:px-8 pb-8">
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl p-8 md:p-12 bg-gradient-to-br from-[#B37C1C]/15 to-[#FFFBF2]/10 border border-[#B37C1C]/20 min-h-[280px] flex flex-col justify-between"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                {/* Left: Content */}
                <div className="flex-1">
                  {/* Icon */}
                  <div className="flex items-center justify-start mb-6 text-[#B37C1C]">
                    {content.slides[currentSlide].icon}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-[#0F1A35] mb-3">
                    {content.slides[currentSlide].title}
                  </h3>
                  <p className="text-sm md:text-base text-[#0F1A35]/70 leading-relaxed max-w-lg">
                    {content.slides[currentSlide].description}
                  </p>
                </div>

                {/* Right: Spacer for balance */}
                <div className="hidden md:block flex-shrink-0 w-24" />
              </div>

              {/* Pagination dots at bottom */}
              <div className="flex gap-2 mt-8">
                {content.slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`transition-all rounded-full ${
                      idx === currentSlide
                        ? "bg-[#B37C1C] w-8 h-2"
                        : "bg-[#B37C1C]/30 hover:bg-[#B37C1C]/50 w-2 h-2"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <div className="flex gap-2 mt-6 justify-end">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={prevSlide}
            className="p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextSlide}
            className="p-2 rounded-full bg-[#B37C1C] text-white hover:bg-[#0F1A35] transition-colors"
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
