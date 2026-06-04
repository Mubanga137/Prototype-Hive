import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HoneycombBackground from "@/components/HoneycombBackground";
import ShoppingGrid from "@/components/ShoppingGrid";
import FeaturedVendors from "@/components/FeaturedVendors";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

const Index = () => {
  try {
    return (
      <div className="min-h-screen relative">
        <HoneycombBackground />
        <Header />
        <HeroSection />
        <ShoppingGrid />
        <FeaturedVendors />
        <FeaturesSection />
        <Footer />
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8 text-red-600">
        <h1>Error rendering page</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default Index;
