import { useState } from "react";
import { Users, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SquadPromoEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  discountType: "percentage" | "fixed";
  onDiscountTypeChange: (type: "percentage" | "fixed") => void;
  discountValue: number;
  onDiscountValueChange: (value: number) => void;
  squadSize: number;
  onSquadSizeChange: (size: number) => void;
  timerLimit: number; // minutes
  onTimerLimitChange: (minutes: number) => void;
}

export const SquadPromoEditor = ({
  enabled,
  onEnabledChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  squadSize,
  onSquadSizeChange,
  timerLimit,
  onTimerLimitChange,
}: SquadPromoEditorProps) => {
  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 rounded-2xl border border-border/60 p-5 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(135deg, hsl(39,100%,97%,0.4), hsl(220,55%,13%,0.03))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(38,73%,40%,0.12)" }}
          >
            <Users size={20} style={{ color: "hsl(38,73%,40%)" }} />
          </div>
          <div>
            <h3
              className="text-sm font-bold"
              style={{ color: "hsl(220,55%,13%)" }}
            >
              🤝 Hive Squad Purchasing
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(220,20%,46%)" }}>
              Bulk buyer incentive for fast marketing
            </p>
          </div>
          <button
            type="button"
            className="ml-auto flex-shrink-0"
            aria-label="Help"
            title="Allow customers to buy at a lower price if they form a squad to buy in bulk. Great for fast marketing campaigns."
          >
            <HelpCircle
              size={16}
              style={{ color: "hsl(220,20%,46%)" }}
              className="hover:text-foreground transition-colors"
            />
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between py-3 px-3 rounded-xl border border-border/40 bg-card/30">
        <span
          className="text-sm font-semibold"
          style={{ color: "hsl(220,55%,13%)" }}
        >
          Enable Squad Purchasing
        </span>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className={`w-12 h-7 rounded-full flex items-center transition-all ${
            enabled ? "bg-primary" : "bg-muted"
          }`}
          style={{
            background: enabled ? "hsl(38,73%,40%)" : "hsl(220,20%,46%,0.2)",
          }}
        >
          <motion.div
            className="w-6 h-6 rounded-full bg-background mx-0.5"
            animate={{ x: enabled ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </button>
      </div>

      {/* Configuration rows — revealed when enabled */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-4 pt-2"
          >
            {/* Discount Type Toggle */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Discount Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "fixed", label: "Manual ZMW Reduction" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onDiscountTypeChange(value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      discountType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Value Input */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Discount Value {discountType === "percentage" ? "(%)" : "(ZMW)"}
              </label>
              <input
                type="number"
                min="0"
                step={discountType === "percentage" ? "1" : "0.01"}
                max={discountType === "percentage" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                placeholder={
                  discountType === "percentage" ? "e.g., 15" : "e.g., 500"
                }
                className={inputClass}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {discountType === "percentage"
                  ? "Each squad member pays this % less"
                  : "Each squad member pays this ZMW amount less"}
              </p>
            </div>

            {/* Squad Size Input */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Squad Size (Minimum buyers)
              </label>
              <input
                type="number"
                min="2"
                max="999"
                value={squadSize}
                onChange={(e) => onSquadSizeChange(parseInt(e.target.value) || 2)}
                placeholder="How many buyers to unlock?"
                className={inputClass}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Default: 2. Customers must coordinate to reach this count.
              </p>
            </div>

            {/* Timer Limit Input */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Time Limit (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={timerLimit / 60}
                onChange={(e) => onTimerLimitChange((parseInt(e.target.value) || 24) * 60)}
                placeholder="e.g., 24"
                className={inputClass}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Squad members have this much time to coordinate and complete purchase.
              </p>
            </div>

            {/* Preview */}
            <div
              className="mt-4 p-3 rounded-xl border border-border/40"
              style={{ background: "hsl(220,55%,13%,0.03)" }}
            >
              <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase">
                Preview
              </p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: "hsl(220,20%,46%)" }}>Squad minimum:</span>
                  <span
                    className="font-semibold"
                    style={{ color: "hsl(220,55%,13%)" }}
                  >
                    {squadSize} buyers
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "hsl(220,20%,46%)" }}>Discount per buyer:</span>
                  <span
                    className="font-semibold"
                    style={{ color: "hsl(38,73%,40%)" }}
                  >
                    {discountType === "percentage"
                      ? `${discountValue}%`
                      : `ZMW ${discountValue.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: "hsl(220,20%,46%)" }}>Window:</span>
                  <span
                    className="font-semibold"
                    style={{ color: "hsl(220,55%,13%)" }}
                  >
                    {timerLimit / 60}h
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SquadPromoEditor;
