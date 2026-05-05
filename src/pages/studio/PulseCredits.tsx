import { useState, useEffect } from "react";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";
import { Coins, ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  desc: string;
  date: string;
}

const PulseCredits = () => {
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    
    const fetchData = async () => {
      setLoading(true);

      // Fetch pulse credits balance
      const { data: profileData } = await supabase
        .from("profiles")
        .select("pulse_credits")
        .eq("id", profile.id)
        .single();

      if (profileData) {
        setBalance(Number(profileData.pulse_credits) || 0);
      }

      // Fetch transaction history from ledger
      const { data: ledgerData } = await supabase
        .from("hive_ledger")
        .select("id, amount, description, created_at, transaction_type")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (ledgerData && ledgerData.length > 0) {
        const txs: Transaction[] = ledgerData.map((tx: any) => ({
          id: tx.id,
          type: tx.amount > 0 ? "credit" : "debit",
          amount: tx.amount,
          desc: tx.description || "Transaction",
          date: new Date(tx.created_at).toLocaleDateString(),
        }));
        setTransactions(txs);
      }

      setLoading(false);
    };

    fetchData();
  }, [profile?.id]);

  const spentThisMonth = transactions
    .filter((tx) => {
      const date = new Date(tx.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && tx.type === "debit";
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <RetailerStudioSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Hive Credits</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your credits for promotions and boosts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Balance</span>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Coins size={18} className="text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{loading ? "—" : balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Hive Credits available</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spent This Month</span>
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowDownRight size={18} className="text-red-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{loading ? "—" : spentThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Credits used</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:flex md:items-center md:justify-center bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <button className="btn-gold flex items-center gap-2 px-6 py-3 text-sm w-full justify-center">
              <CreditCard size={16} /> Recharge Credits
            </button>
          </motion.div>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="font-display font-bold text-foreground">Transaction History</h2>
          </div>
          <div className="divide-y divide-border/30">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-secondary/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-emerald-100" : "bg-red-100"}`}>
                      {tx.type === "credit" ? <ArrowUpRight size={14} className="text-emerald-600" /> : <ArrowDownRight size={14} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.desc}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.type === "credit" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="flex justify-center py-10">
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RetailerStudioSidebar>
  );
};

export default PulseCredits;
