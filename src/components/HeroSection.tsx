import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import NavigationContinueCard from "./NavigationContinueCard";
import Navigation3DView from "./Navigation3DView";

const HeroSection = () => {
  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);

  return (
    <section className="relative z-10 flex flex-col items-center text-center px-4 pt-16 pb-12 md:pt-24 md:pb-20 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary border border-primary/20 text-sm font-medium text-muted-foreground mb-8"
      >
        📍 Connecting local businesses with customers.
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-6"
      >
        Empowering Entrepreneurs and Elevating Your{" "}
        <span className="text-primary">Everyday Shopping</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
      >
        Where smart entrepreneurship meets a better way to shop.
      </motion.p>

      <motion.a
        href="#marketplace"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="btn-gold flex items-center gap-2 text-lg px-10 py-4"
      >
        <ShoppingCart size={20} />
        SHOP WITH THE HIVE
      </motion.a>

      {/* Navigation Continue Card Demo */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-16"
      >
        <NavigationContinueCard
          pickupLat={-15.3875}
          pickupLng={28.3228}
          dropoffLat={-15.4}
          dropoffLng={28.35}
          pickupName="Hive HQ - Cairo Rd"
          dropoffName="Your Location"
          onNavigateClick={() => {
            setShowNavigation(true);
            setNavigationActive(true);
          }}
        />
      </motion.div>

      {/* 3D Navigation View Modal - Only render when needed */}
      {navigationActive && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><p style={{color: '#FFFBF2'}}>Loading navigation...</p></div>}>
          <Navigation3DView
            userLat={-15.3875}
            userLng={28.3228}
            userBearing={45}
            pickupLat={-15.3875}
            pickupLng={28.3228}
            dropoffLat={-15.4}
            dropoffLng={28.35}
            pickupName="Hive HQ"
            dropoffName="Your Location"
            isPickupDone={false}
            onClose={() => setNavigationActive(false)}
          />
        </Suspense>
      )}
    </section>
  );
};

export default HeroSection;
