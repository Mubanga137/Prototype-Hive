import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PricingTier {
  id: string;
  orders: number;
  price: number;
  popular?: boolean;
  description: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: "tier-1",
    orders: 50,
    price: 10,
    description: "Perfect for starting out",
  },
  {
    id: "tier-2",
    orders: 100,
    price: 20,
    popular: true,
    description: "Our most popular choice",
  },
  {
    id: "tier-3",
    orders: 150,
    price: 150,
    description: "Quarterly unlimited scaling",
  },
];

type CheckoutState = "idle" | "processing" | "success";

const RechargeStore = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRecharge = async (tier: PricingTier) => {
    if (!user) {
      toast.error("Please log in to recharge capacity");
      return;
    }

    setSelectedTier(tier.id);
    setCheckoutState("processing");

    // Simulate MoMo checkout flow (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      // Update order_capacity in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ order_capacity: (profile?.order_capacity ?? 50) + tier.orders })
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to recharge capacity. Please try again.");
        setCheckoutState("idle");
        return;
      }

      setCheckoutState("success");
      const newCapacity = (profile?.order_capacity ?? 50) + tier.orders;
      setSuccessMessage(
        `✅ Capacity Recharged! You now have ${newCapacity} orders.`
      );

      // Refresh profile to update sidebar
      await refreshProfile();

      // Auto-redirect after 1.5 seconds
      setTimeout(() => {
        navigate(profile?.role === "vendor" ? "/retailer-studio" : "/gig-radar");
      }, 1500);
    } catch (err) {
      console.error("Recharge error:", err);
      toast.error("An error occurred. Please try again.");
      setCheckoutState("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF2] via-white to-[#FFFBF2]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FFFBF2]/80 backdrop-blur-sm border-b border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </motion.button>
          <h1 className="text-2xl font-display font-bold text-foreground">Scale Your Operations</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {checkoutState === "success" ? (
          // Success State
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
              className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <p className="text-xl font-semibold text-foreground text-center">{successMessage}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting you back...</p>
          </motion.div>
        ) : (
          <>
            {/* Pricing Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {pricingTiers.map((tier, idx) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`relative rounded-2xl border-2 transition-all ${
                    selectedTier === tier.id && checkoutState === "processing"
                      ? "border-primary ring-2 ring-primary/30"
                      : tier.popular
                      ? "border-primary"
                      : "border-primary/20"
                  } ${tier.popular ? "shadow-xl" : "shadow-lg"}`}
                  style={{
                    background: tier.popular ? "linear-gradient(135deg, #FFFBF2 0%, #FFF8F0 100%)" : "#FFFBF2",
                  }}
                >
                  {/* Popular Ribbon */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        MOST POPULAR
                      </motion.div>
                    </div>
                  )}

                  <div className="p-6 flex flex-col h-full">
                    {/* Order Amount */}
                    <div className="mb-2">
                      <p className="text-4xl font-display font-bold text-foreground">{tier.orders}</p>
                      <p className="text-sm text-muted-foreground">Order Bundle</p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-6 flex-1">{tier.description}</p>

                    {/* Price */}
                    <div className="mb-6 border-t border-primary/10 pt-6">
                      <p className="text-3xl font-bold text-foreground">
                        ZMW <span style={{ color: "#B37C1C" }}>{tier.price}</span>
                      </p>
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      onClick={() => handleRecharge(tier)}
                      disabled={checkoutState === "processing"}
                      whileHover={{ scale: checkoutState === "processing" ? 1 : 1.02 }}
                      whileTap={{ scale: checkoutState === "processing" ? 1 : 0.98 }}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        checkoutState === "processing" && selectedTier === tier.id
                          ? "bg-primary/50 text-white cursor-not-allowed"
                          : "bg-primary hover:bg-primary/90 text-white"
                      }`}
                    >
                      {checkoutState === "processing" && selectedTier === tier.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        "Pay securely via Mobile Money"
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-amber-50 border border-primary/20 rounded-xl p-6 text-center"
            >
              <p className="text-sm text-foreground">
                📱 <span className="font-semibold">Secure MoMo Payment</span> — Your transaction is protected. Each order you process will deduct 1 from your capacity.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default RechargeStore;
