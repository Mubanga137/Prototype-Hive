import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, ShieldCheck, Phone, Navigation } from "lucide-react";
import { BatchedOrder } from "@/utils/orderClustering";
import { OtpVerificationKeypad } from "./OtpVerificationKeypad";
import { toast } from "sonner";

interface MissionControlPanelProps {
  batch: BatchedOrder;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  isInAppNavigating: boolean;
  onNavigateToggle: (state: boolean) => void;
  onPickupConfirmed?: (pickupLat: number, pickupLng: number) => void;
}

interface ActiveStep {
  type: "pickup" | "dropoff";
  location: string;
  customerName?: string;
  customerPhone?: string;
  distance: string;
  estimatedTime?: string;
}

export const MissionControlPanel = ({
  batch,
  onClose,
  currentLat,
  currentLng,
  isInAppNavigating,
  onNavigateToggle,
  onPickupConfirmed,
}: MissionControlPanelProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showOtpKeypad, setShowOtpKeypad] = useState(false);
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);

  // Initialize active step
  useEffect(() => {
    const step = batch.dropoffs[currentStepIndex];
    if (currentStepIndex === 0) {
      setActiveStep({
        type: "pickup",
        location: batch.pickupSmeNam || "Pickup Location",
        distance: "calculating...",
      });
    } else if (step) {
      setActiveStep({
        type: "dropoff",
        location: step.customer,
        customerName: step.customer,
        customerPhone: step.phone,
        distance: `${(Math.random() * 3 + 0.5).toFixed(1)} km`,
        estimatedTime: `${Math.floor(Math.random() * 15 + 5)} min`,
      });
    }
  }, [currentStepIndex, batch]);

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    if (otp === "0000" || otp.length === 4) {
      setCompletedSteps((prev) => new Set([...prev, currentStepIndex]));

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < batch.dropoffs.length) {
        setCurrentStepIndex(nextIndex);
        toast.success("✅ Delivery verified! Moving to next stop.");
      } else {
        toast.success("🎉 All deliveries complete!");
      }

      setShowOtpKeypad(false);
      return true;
    }

    toast.error("❌ Invalid OTP");
    return false;
  };

  const handleNavigateClick = () => {
    onNavigateToggle(!isInAppNavigating);
    if (!isInAppNavigating) {
      toast.info("🗺️ In-app navigation enabled. Follow the blue polyline.");
    } else {
      toast.info("Navigation disabled.");
    }
  };

  const getActionButtonLabel = () => {
    if (activeStep?.type === "pickup") {
      return "🔒 CONFIRM PICKUP";
    }
    return "🛡️ VERIFY OTP";
  };

  const getMapsUrl = () => {
    if (activeStep?.type === "pickup") {
      return `https://www.google.com/maps/dir/${currentLat},${currentLng}/${batch.pickupLat || -15.3875},${batch.pickupLng || 28.3228}`;
    }
    const step = batch.dropoffs[currentStepIndex - 1];
    if (step) {
      return `https://www.google.com/maps/dir/${currentLat},${currentLng}/${step.lat || -15.3875},${step.lng || 28.3228}`;
    }
    return "https://www.google.com/maps";
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="fixed bottom-0 left-0 right-0 h-[30vh] rounded-t-3xl z-40 flex flex-col overflow-hidden shadow-2xl border-t-4"
      style={{
        backgroundColor: "#FFFBF2",
        borderColor: "#B37C1C",
      }}
    >
      {/* Header Bar */}
      <div className="h-14 px-4 sm:px-6 py-3 flex items-center justify-between border-b shrink-0" style={{ borderColor: "#D4A574" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)" }}>
            <Navigation size={16} style={{ color: "#FFFBF2" }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
              MISSION ACTIVE
            </p>
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              Step {currentStepIndex + 1} of {batch.dropoffs.length + 1}
            </p>
          </div>
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg transition-all flex-shrink-0"
          style={{ backgroundColor: "#F5F0E8" }}
        >
          <X size={16} style={{ color: "#0F1A35" }} />
        </motion.button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 flex flex-col justify-between min-h-0">
        {/* Next Stop Display */}
        <AnimatePresence mode="wait">
          {activeStep && (
            <motion.div
              key={`${activeStep.type}-${activeStep.location}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Step Type Badge */}
              <div className="flex items-center gap-2">
                <MapPin size={16} style={{ color: "#B37C1C" }} />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: activeStep.type === "pickup" ? "#0F1A35" : "#B37C1C" }}
                >
                  {activeStep.type === "pickup" ? "NEXT: PICKUP" : "NEXT: DROP-OFF"}
                </span>
              </div>

              {/* Location Name */}
              <h3 className="text-lg font-bold" style={{ color: "#0F1A35" }}>
                {activeStep.location}
              </h3>

              {/* Order Details (after pickup confirmed) */}
              {pickupConfirmed && activeStep.type === "pickup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "rgba(179, 124, 28, 0.1)", borderColor: "#D4A574", borderWidth: "1px" }}
                >
                  <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                    📦 Order Details
                  </p>
                  <p className="text-sm font-bold mt-1" style={{ color: "#B37C1C" }}>
                    Order #{batch.batchId?.slice(0, 8).toUpperCase() || "12345"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#0F1A35/70" }}>
                    {batch.orderCount} item{batch.orderCount !== 1 ? "s" : ""} ready for pickup
                  </p>
                </motion.div>
              )}

              {/* Customer Phone (if dropoff) */}
              {activeStep.customerPhone && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "#0F1A35/70" }}>
                  <Phone size={12} />
                  <span>{activeStep.customerPhone}</span>
                </div>
              )}

              {/* Distance & Time */}
              <div className="flex items-center gap-3 text-sm font-bold" style={{ color: "#B37C1C" }}>
                <span>📍 {activeStep.distance}</span>
                {activeStep.estimatedTime && <span>⏱️ {activeStep.estimatedTime}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="space-y-2 flex-shrink-0">
          {/* Primary Action */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (activeStep?.type === "pickup" && !pickupConfirmed) {
                setPickupConfirmed(true);
                onPickupConfirmed?.(batch.pickupLat || -15.3875, batch.pickupLng || 28.3228);
                toast.success("✅ Pickup confirmed! Route mapped.");
              } else if (activeStep?.type === "dropoff") {
                setShowOtpKeypad(true);
              } else if (pickupConfirmed && activeStep?.type === "pickup") {
                setCurrentStepIndex(1);
                setPickupConfirmed(false);
                toast.success("Moving to deliveries...");
              }
            }}
            className="w-full py-3 rounded-xl font-bold text-base transition-all text-white flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
              boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)",
            }}
          >
            <ShieldCheck size={18} />
            {pickupConfirmed && activeStep?.type === "pickup"
              ? "✅ PICKUP CONFIRMED"
              : getActionButtonLabel()}
          </motion.button>

          {/* Navigation Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNavigateClick}
            className="w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border"
            style={{
              backgroundColor: isInAppNavigating ? "rgba(179, 124, 28, 0.15)" : "transparent",
              borderColor: "#B37C1C",
              color: "#B37C1C",
            }}
          >
            {isInAppNavigating ? "🗺️ STOP NAV" : "🗺️ IN-APP NAV"}
          </motion.button>

          {/* Fallback Maps Link (ultra-faint) */}
          <a
            href={getMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center text-xs py-1 transition-all hover:opacity-100"
            style={{
              color: "#0F1A35",
              opacity: 0.25,
            }}
          >
            Open in Google Maps (backup)
          </a>
        </div>
      </div>

      {/* OTP Keypad Modal */}
      <AnimatePresence>
        {showOtpKeypad && (
          <OtpVerificationKeypad
            orderId={currentStepIndex}
            customerName={activeStep?.location || "Customer"}
            onVerify={handleVerifyOtp}
            onFail={async () => {
              toast.error("Delivery failed. Contact support.");
              return false;
            }}
            onCancel={() => setShowOtpKeypad(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MissionControlPanel;
