import { useState, useEffect, useMemo } from "react";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";
import { TrendingUp, Gift, Users, Zap, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RewardMetrics {
  totalOrders: number;
  totalSales: number;
  hiveReelLinkSales: number;
  referralLinkShares: number;
  earnedCredits: number;
  pendingRewards: number;
}

const GrowthIncentives = () => {
  const { user, currentStore } = useAuth();
  const [metrics, setMetrics] = useState<RewardMetrics>({
    totalOrders: 0,
    totalSales: 0,
    hiveReelLinkSales: 0,
    referralLinkShares: 0,
    earnedCredits: 0,
    pendingRewards: 0,
  });
  const [copied, setCopied] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!currentStore) return;
      setLoading(true);

      // Fetch orders to count sales
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount, created_at")
        .eq("sme_id", currentStore.id);

      const totalOrders = orders?.length || 0;
      const totalSales = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // For now, estimate: 20% of orders come from Hive Reel links
      const hiveReelLinkSales = Math.floor(totalOrders * 0.2);
      
      // Estimate referral link shares (based on order growth)
      const referralLinkShares = Math.floor(totalOrders * 0.05);

      // Earn 2 credits per Hive Reel sale + 5 zero-fee sales from referral
      const hiveReelCredits = hiveReelLinkSales * 2;
      const referralCredits = referralLinkShares * 5;
      const earnedCredits = hiveReelCredits + referralCredits;

      // Calculate pending rewards (credits yet to be claimed)
      const pendingRewards = Math.max(0, earnedCredits - 50); // Assume 50 already claimed

      setMetrics({
        totalOrders,
        totalSales,
        hiveReelLinkSales,
        referralLinkShares,
        earnedCredits,
        pendingRewards,
      });
      setLoading(false);
    };

    loadMetrics();
  }, [currentStore]);

  const referralLink = useMemo(() => {
    if (!currentStore) return "";
    return `${window.location.origin}/ref/${currentStore.id}`;
  }, [currentStore]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label}!`);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <RetailerStudioSidebar>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Zap size={22} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Growth & Incentives</h2>
              <p className="text-sm text-muted-foreground">Earn credits and rewards by growing your store</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Rewards Overview Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  label: "Total Orders",
                  value: metrics.totalOrders,
                  icon: TrendingUp,
                  tint: "bg-emerald-50 text-emerald-700",
                },
                {
                  label: "Total Sales (ZMW)",
                  value: `${metrics.totalSales.toLocaleString()}`,
                  icon: Gift,
                  tint: "bg-blue-50 text-blue-700",
                },
                {
                  label: "Earned Credits",
                  value: metrics.earnedCredits,
                  icon: Zap,
                  tint: "bg-amber-50 text-amber-700",
                },
              ].map((card) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.tint}`}>
                      <card.icon size={16} />
                    </div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Reward Programs */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-foreground">Active Reward Programs</h3>

              {/* Hive Reel Rewards */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-50 to-blue-50/30 border border-blue-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-foreground flex items-center gap-2">
                      <span>♻️ Hive Reel Links</span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Earn +2 Credits for every sale triggered from a Hive Reel link
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-display font-bold text-blue-700">{metrics.hiveReelLinkSales}</p>
                    <p className="text-xs text-blue-600">sales from reels</p>
                  </div>
                </div>

                <div className="bg-white/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">How it works:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Create Hive Reels with product hotspots</li>
                    <li>Each order from your reel link = 2 credits</li>
                    <li>Redeem credits for discounts or bonuses</li>
                  </ul>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Estimated earnings: <span className="font-bold text-blue-700">{metrics.hiveReelLinkSales * 2} credits</span>
                  </p>
                </div>
              </motion.div>

              {/* Referral Rewards */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-purple-50/30 border border-purple-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-foreground flex items-center gap-2">
                      <span>👥 SME Referral Link</span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share to earn 5 Zero-Fee Sales & 10 Credits per successful referral
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-display font-bold text-purple-700">{metrics.referralLinkShares}</p>
                    <p className="text-xs text-purple-600">referral shares</p>
                  </div>
                </div>

                {/* Copy Referral Link */}
                <div className="bg-white/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Your Referral Link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={referralLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(referralLink, "Referral Link")}
                      className="p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                    >
                      {copied === "Referral Link" ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-white/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">How it works:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Share your referral link with other SMEs</li>
                    <li>When they sign up and make sales = 5 zero-fee transactions for you</li>
                    <li>Additional 10 credits per successful referral</li>
                  </ul>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Estimated earnings: <span className="font-bold text-purple-700">{metrics.referralLinkShares * 10} credits</span>
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Available Orders */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5"
            >
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <span>📦 Order Capacity</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Available Orders Remaining</p>
                  <p className="text-3xl font-display font-bold text-primary">
                    {currentStore?.order_capacity || 50}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recharge capacity to continue accepting orders
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => window.location.href = "/recharge"}
                    className="btn-gold px-6 py-3 text-sm font-bold"
                  >
                    Recharge Capacity
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pending Rewards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5"
            >
              <h3 className="font-display font-bold text-foreground mb-3">Pending Rewards</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credits available to claim</p>
                  <p className="text-2xl font-display font-bold text-amber-700 mt-1">
                    {metrics.pendingRewards}
                  </p>
                </div>
                <button
                  onClick={() => toast.info("Rewards claiming will be available soon!")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Claim Rewards
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </RetailerStudioSidebar>
  );
};

export default GrowthIncentives;
