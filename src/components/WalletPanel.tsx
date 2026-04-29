import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Send, Download, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Plus, Minus, Eye, EyeOff, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

export interface WalletTransaction {
  id: string;
  type: "deposit" | "withdrawal" | "payment" | "refund";
  amount: number;
  date: string;
  description: string;
  status: "completed" | "pending" | "failed";
}

interface WalletPanelProps {
  balance: number;
  userRole?: "customer" | "vendor" | "gig_worker" | "wholesaler";
  onDeposit?: (amount: number) => void;
  onWithdraw?: (amount: number) => void;
  transactions?: WalletTransaction[];
}

const WalletPanel = ({
  balance,
  userRole = "customer",
  onDeposit,
  onWithdraw,
  transactions = [],
}: WalletPanelProps) => {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw">(
    "overview"
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText("THE-HIVE-WALLET-001");
    setCopied(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    onDeposit?.(amount);
    setDepositAmount("");
    setActiveTab("overview");
    toast.success(`ZMW ${amount} deposited successfully!`);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    onWithdraw?.(amount);
    setWithdrawAmount("");
    setActiveTab("overview");
    toast.success(`Withdrawal of ZMW ${amount} requested!`);
  };

  const roleLabels = {
    customer: "Account Balance",
    vendor: "Seller Balance",
    gig_worker: "Earnings Balance",
    wholesaler: "Wholesale Balance",
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZM", {
      style: "currency",
      currency: "ZMW",
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-2xl border border-primary/30 p-6 md:p-8 mb-6 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                {roleLabels[userRole]}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                  {showBalance ? formatCurrency(balance) : "••••••"}
                </h3>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  {showBalance ? (
                    <Eye size={20} className="text-muted-foreground" />
                  ) : (
                    <EyeOff size={20} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40">
              <Wallet size={28} className="text-primary" />
            </div>
          </div>

          {/* Wallet Address */}
          <div className="bg-card/50 rounded-xl p-4 mb-6 border border-border/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
              Wallet Address
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-foreground bg-secondary/50 px-3 py-2 rounded-lg">
                THE-HIVE-WALLET-001
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-primary" />
                ) : (
                  <Copy size={16} className="text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("deposit")}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold transition-colors hover:bg-primary/90"
            >
              <Download size={18} /> Add Funds
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("withdraw")}
              className="flex items-center justify-center gap-2 bg-primary/20 text-primary rounded-xl py-3 font-semibold border border-primary/30 hover:bg-primary/30 transition-colors"
            >
              <Send size={18} /> Withdraw
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <AnimatePresence mode="wait">
        {activeTab === "deposit" && (
          <motion.div
            key="deposit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-display font-bold text-foreground mb-4">
              Add Funds to Your Wallet
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Amount (ZMW)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ZMW
                  </span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Quick amounts:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmount(String(amt))}
                      className="py-2 px-3 rounded-lg bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 text-xs font-semibold text-foreground transition-colors"
                    >
                      ZMW {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-700">
                💳 Select your payment method and complete the transaction securely.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDeposit}
                  className="flex-1 btn-gold py-3 rounded-xl text-sm font-semibold"
                >
                  <Plus size={16} className="inline mr-2" /> Add Funds
                </button>
                <button
                  onClick={() => setActiveTab("overview")}
                  className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "withdraw" && (
          <motion.div
            key="withdraw"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-display font-bold text-foreground mb-4">
              Withdraw Funds
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Withdrawal Amount (ZMW)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ZMW
                  </span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Available balance: {formatCurrency(balance)}
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-700">
                ⏱️ Withdrawals are processed within 2-3 business days to your registered bank account.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleWithdraw}
                  className="flex-1 btn-gold py-3 rounded-xl text-sm font-semibold"
                >
                  <Minus size={16} className="inline mr-2" /> Request Withdrawal
                </button>
                <button
                  onClick={() => setActiveTab("overview")}
                  className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History */}
      {transactions && transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> Recent Transactions
          </h3>

          <div className="space-y-3">
            {transactions.slice(0, 10).map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-border transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === "deposit" || tx.type === "refund"
                      ? "bg-emerald-500/20"
                      : "bg-red-500/20"
                  }`}>
                    {tx.type === "deposit" || tx.type === "refund" ? (
                      <ArrowDownLeft size={18} className="text-emerald-600" />
                    ) : (
                      <ArrowUpRight size={18} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground capitalize">
                      {tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    tx.type === "deposit" || tx.type === "refund"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}>
                    {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                    tx.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-700"
                      : tx.status === "pending"
                      ? "bg-amber-500/20 text-amber-700"
                      : "bg-red-500/20 text-red-700"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WalletPanel;
