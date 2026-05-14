import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, MapPin, Package, CheckCircle2, AlertTriangle, Clock, Map as MapIcon, ShieldCheck, Lock } from "lucide-react";
import { BatchedOrder } from "@/utils/orderClustering";
import { optimizeRouteOrder, calculateRouteMetrics, generateNavigationUrl, RouteStop } from "@/utils/routeOptimization";
import { OtpVerificationKeypad } from "./OtpVerificationKeypad";
import { toast } from "sonner";
import type { MapRef } from "react-map-gl";

interface Step {
  id: string;
  number: number;
  type: "pickup" | "dropoff";
  location: string;
  details: string;
  customerPhone?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  eta?: string;
  distance?: string;
  isLocked: boolean;
}

interface EnhancedMissionHUDProps {
  batch: BatchedOrder;
  onClose: () => void;
  mapRef?: React.RefObject<MapRef>;
  currentLat: number;
  currentLng: number;
}

interface PayoutState {
  totalPayout: number;
  baseAmount: number;
  completedDeliveries: number;
  bonusAmount: number;
}

export const EnhancedMissionHUD = ({
  batch,
  onClose,
  mapRef,
  currentLat,
  currentLng,
}: EnhancedMissionHUDProps) => {
  // ─────────────────────────────── State ───────────────────────────────
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showOtpKeypad, setShowOtpKeypad] = useState(false);
  const [otpCustomerId, setOtpCustomerId] = useState<string>("");
  const [payout, setPayout] = useState<PayoutState>({
    totalPayout: batch.totalEstimate,
    baseAmount: batch.totalEstimate,
    completedDeliveries: 0,
    bonusAmount: 0,
  });
  const [routeMetrics, setRouteMetrics] = useState({ totalDistance: 0, estimatedDuration: 0 });
  const prevStepRef = useRef(currentStepIndex);

  // ─────────────────────────────── Initialization ───────────────────────────────
  useEffect(() => {
    // Build route stops from batch data
    const pickup: RouteStop = {
      id: "pickup",
      lat: batch.pickupLat || -15.3875,
      lng: batch.pickupLng || 28.3228,
      name: batch.pickupSmeNam,
      type: "pickup",
      items: [`${batch.orderCount} items to collect`],
    };

    const dropoffs: RouteStop[] = batch.dropoffs.map((dropoff) => ({
      id: `dropoff-${dropoff.orderId}`,
      lat: dropoff.lat || -15.3875 + Math.random() * 0.05,
      lng: dropoff.lng || 28.3228 + Math.random() * 0.05,
      name: dropoff.customer,
      type: "dropoff" as const,
      orderId: `#${dropoff.orderId}`,
      phone: dropoff.phone,
    }));

    // Optimize route using nearest-neighbor algorithm
    const optimizedDropoffs = optimizeRouteOrder(pickup, dropoffs);

    // Calculate metrics
    const metrics = calculateRouteMetrics(pickup, optimizedDropoffs);
    setRouteMetrics(metrics);

    // Build steps array
    const builtSteps: Step[] = [
      {
        id: "pickup",
        number: 1,
        type: "pickup",
        location: pickup.name,
        details: `Collect ${batch.orderCount} item${batch.orderCount !== 1 ? "s" : ""}`,
        status: "in_progress",
        eta: "5 mins",
        isLocked: false,
      },
      ...optimizedDropoffs.map((dropoff, idx) => ({
        id: dropoff.id,
        number: idx + 2,
        type: "dropoff" as const,
        location: dropoff.name,
        details: `Order ${dropoff.orderId} • ${dropoff.phone?.slice(-4)}`,
        customerPhone: dropoff.phone,
        status: "pending" as const,
        distance: idx === 0 ? `${(Math.random() * 3 + 1).toFixed(1)} km` : undefined,
        isLocked: true,
      })),
    ];

    setSteps(builtSteps);
  }, [batch]);

  // ─────────────────────────────── Step Transitions ───────────────────────────────
  useEffect(() => {
    if (currentStepIndex === prevStepRef.current) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    // Update step status
    setSteps((prev) =>
      prev.map((step, idx) => ({
        ...step,
        status: idx === currentStepIndex ? "in_progress" : idx < currentStepIndex ? "completed" : step.status,
      }))
    );

    // Unlock next step if current is completed
    if (currentStepIndex > 0 && currentStep.type === "dropoff") {
      setSteps((prev) =>
        prev.map((step, idx) => ({
          ...step,
          isLocked: idx <= currentStepIndex ? false : step.isLocked,
        }))
      );
    }

    // Update map bounds to focus on current step
    if (mapRef?.current && currentStep.type === "dropoff") {
      // Get next stop location (or current if last)
      const nextStep = steps[currentStepIndex];
      if (nextStep && currentStepIndex > 0) {
        // Focus map on region between current location and next dropoff
        // For now, simple flyTo; could be enhanced with fitBounds for all intermediate points
        mapRef.current.flyTo({
          center: [nextStep.location === batch.pickupSmeNam ? batch.pickupLng || 28.3228 : 28.3228 + Math.random() * 0.05, 
                   nextStep.location === batch.pickupSmeNam ? batch.pickupLat || -15.3875 : -15.3875 + Math.random() * 0.05],
          zoom: 16,
          duration: 800,
        });
      }
    }

    prevStepRef.current = currentStepIndex;
  }, [currentStepIndex, steps, batch, mapRef]);

  // ─────────────────────────────── Handlers ───────────────────────────────
  const handlePickupConfirm = () => {
    setCompletedSteps((prev) => new Set([...prev, "pickup"]));
    setCurrentStepIndex(1);
    toast.success("✅ Pickup confirmed! Heading to first delivery...");
  };

  const handleOtpClick = (stepId: string) => {
    setOtpCustomerId(stepId);
    setShowOtpKeypad(true);
  };

  const handleOtpSubmit = async (otp: string): Promise<boolean> => {
    if (!otpCustomerId) return false;

    // Simulate OTP verification (in real app, validate against backend)
    if (otp === "0000" || otp.length === 4) {
      // Success case
      setCompletedSteps((prev) => new Set([...prev, otpCustomerId]));

      // Calculate and add partial payout
      const pricePerDelivery = payout.baseAmount / batch.orderCount;
      setPayout((prev) => ({
        ...prev,
        completedDeliveries: prev.completedDeliveries + 1,
        bonusAmount: prev.completedDeliveries > 0 ? prev.bonusAmount + 5 : 0, // Bonus for streak
      }));

      // Move to next step
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
        toast.success(`💰 ZMW ${pricePerDelivery.toFixed(2)} released! Next delivery unlocked.`);
      } else {
        toast.success("🎉 All deliveries complete! Mission accomplished.");
      }

      setShowOtpKeypad(false);
      return true;
    } else {
      toast.error("❌ Invalid OTP. Please try again.");
      return false;
    }
  };

  const handleNavigate = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step || step.type !== "dropoff") return;

    const url = generateNavigationUrl(
      { lat: currentLat, lng: currentLng },
      {
        id: step.id,
        lat: -15.3875 + Math.random() * 0.05,
        lng: 28.3228 + Math.random() * 0.05,
        name: step.location,
        type: "dropoff",
        orderId: step.details.split(" • ")[0],
        phone: step.customerPhone,
      },
      /iPad|iPhone|iPod/.test(navigator.userAgent)
    );

    window.open(url, "_blank");
    toast.info("📍 Opening navigation...");
  };

  const formattedTotalPayout = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
  }).format(payout.totalPayout + payout.bonusAmount);

  const isAllComplete = completedSteps.size === steps.filter((s) => s.type === "dropoff").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#FFFBF2" }}
    >
      {/* Header */}
      <header
        className="h-16 border-b flex items-center justify-between px-4 sm:px-6 shrink-0"
        style={{
          backgroundColor: "rgba(255, 251, 242, 0.95)",
          borderColor: "#D4A574",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
            }}
          >
            <Navigation size={20} style={{ color: "#FFFBF2" }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "#0F1A35" }}>
              Active Mission
            </p>
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              {payout.completedDeliveries}/{batch.dropoffs.length} deliveries • Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg transition-all"
          style={{ backgroundColor: "#F5F0E8" }}
        >
          <X size={20} style={{ color: "#0F1A35" }} />
        </motion.button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Route Summary Pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-4 sm:m-6 p-4 rounded-xl border"
          style={{
            background: "linear-gradient(135deg, rgba(179, 124, 28, 0.1) 0%, rgba(15, 26, 53, 0.05) 100%)",
            borderColor: "#D4A574",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: "#0F1A35" }}>
              Route Summary
            </h3>
            <span className="text-2xl font-bold" style={{ color: "#B37C1C" }}>
              {formattedTotalPayout}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center">
              <MapPin size={16} style={{ color: "#B37C1C", marginBottom: "4px" }} />
              <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                {routeMetrics.totalDistance} km
              </p>
              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                Distance
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Clock size={16} style={{ color: "#B37C1C", marginBottom: "4px" }} />
              <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                {routeMetrics.estimatedDuration} min
              </p>
              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                ETA
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Package size={16} style={{ color: "#B37C1C", marginBottom: "4px" }} />
              <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                {batch.orderCount}
              </p>
              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                Orders
              </p>
            </div>
          </div>
        </motion.div>

        {/* Vertical Stepper with Step Locking */}
        <div className="px-4 sm:px-6 flex-1">
          <h3 className="font-bold text-sm mb-4" style={{ color: "#0F1A35" }}>
            Mission Steps (Optimized Route)
          </h3>

          <div className="space-y-2 relative">
            {/* Connecting Line */}
            <div
              className="absolute left-[15px] top-6 bottom-6 w-0.5"
              style={{
                backgroundColor: "rgba(179, 124, 28, 0.2)",
              }}
            />

            {/* Steps */}
            <AnimatePresence>
              {steps.map((step, idx) => {
                const isCurrentStep = idx === currentStepIndex;
                const isCompleted = completedSteps.has(step.id);
                const isLocked = step.isLocked && !isCompleted;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative pl-10 pb-2"
                    style={{ pointerEvents: isLocked ? "none" : "auto" }}
                  >
                    {/* Step Indicator */}
                    <div className="absolute left-0 top-0">
                      <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 relative"
                        animate={isCurrentStep && !isLocked ? { scale: [1, 1.1, 1] } : {}}
                        transition={isCurrentStep && !isLocked ? { duration: 1.5, repeat: Infinity } : {}}
                        style={{
                          backgroundColor: isCurrentStep
                            ? "#B37C1C"
                            : isCompleted
                              ? "#22C55E"
                              : isLocked
                                ? "#D4A574"
                                : "#F5F0E8",
                          borderColor: isCurrentStep
                            ? "#B37C1C"
                            : isCompleted
                              ? "#22C55E"
                              : isLocked
                                ? "#D4A574"
                                : "#D4A574",
                          opacity: isLocked ? 0.5 : 1,
                        }}
                      >
                        {isLocked ? (
                          <Lock size={14} style={{ color: "#FFFBF2" }} />
                        ) : isCompleted ? (
                          <CheckCircle2 size={16} />
                        ) : isCurrentStep ? (
                          step.type === "pickup" ? (
                            <Package size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )
                        ) : (
                          <span className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                            {step.number}
                          </span>
                        )}
                      </motion.div>
                    </div>

                    {/* Step Content */}
                    <motion.div
                      className="p-3 rounded-lg border transition-all"
                      style={{
                        backgroundColor: isLocked
                          ? "rgba(212, 165, 116, 0.05)"
                          : isCurrentStep
                            ? "rgba(179, 124, 28, 0.1)"
                            : isCompleted
                              ? "rgba(34, 197, 94, 0.08)"
                              : "#FFFFFF",
                        borderColor: isLocked
                          ? "#D4A574"
                          : isCurrentStep
                            ? "#B37C1C"
                            : isCompleted
                              ? "#22C55E"
                              : "#D4A574",
                        opacity: isLocked ? 0.5 : 1,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-bold uppercase tracking-wide"
                              style={{
                                color: isCurrentStep ? "#B37C1C" : "#0F1A35/70",
                              }}
                            >
                              {step.type === "pickup" ? "PICKUP" : "DELIVERY"}
                            </span>
                            {isCurrentStep && !isLocked && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: "rgba(179, 124, 28, 0.2)",
                                  color: "#B37C1C",
                                }}
                              >
                                Now
                              </span>
                            )}
                            {isLocked && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                style={{
                                  backgroundColor: "rgba(212, 165, 116, 0.2)",
                                  color: "#D4A574",
                                }}
                              >
                                <Lock size={11} />
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm mb-1" style={{ color: "#0F1A35" }}>
                            {step.location}
                          </p>
                          <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                            {step.details}
                          </p>
                          {step.distance && (
                            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#B37C1C" }}>
                              <MapPin size={12} />
                              {step.distance} away
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons for Active Steps */}
                      {isCurrentStep && !isLocked && (
                        <div className="mt-3 space-y-2">
                          {step.type === "pickup" ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handlePickupConfirm}
                              className="w-full py-2 rounded-lg font-bold text-white text-sm transition-all flex items-center justify-center gap-2"
                              style={{
                                background: "linear-gradient(135deg, #0F1A35 0%, #1a1a2e 100%)",
                              }}
                            >
                              <Lock size={14} />
                              🔒 CONFIRM ALL ITEMS SECURED
                            </motion.button>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleNavigate(idx)}
                                  className="py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 border"
                                  style={{
                                    backgroundColor: "transparent",
                                    borderColor: "#B37C1C",
                                    color: "#B37C1C",
                                  }}
                                >
                                  <MapIcon size={12} />
                                  🗺️ NAV
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleOtpClick(step.id)}
                                  className="py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 text-white"
                                  style={{
                                    background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
                                  }}
                                >
                                  <ShieldCheck size={12} />
                                  🛡️ OTP
                                </motion.button>
                              </div>
                              <p className="text-xs text-center mt-1" style={{ color: "#0F1A35/60" }}>
                                Verify handoff to unlock next delivery
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 sm:px-6 py-4 border-t space-y-3" style={{ borderColor: "#D4A574" }}>
          {isAllComplete ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-3 rounded-lg"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                borderColor: "#22C55E",
                border: "1px solid #22C55E",
              }}
            >
              <p className="text-sm font-bold" style={{ color: "#16A34A" }}>
                🎉 Mission Complete!
              </p>
              <p className="text-xs mt-1" style={{ color: "#16A34A/70" }}>
                All deliveries verified. Total earned: {formattedTotalPayout}
              </p>
            </motion.div>
          ) : null}

          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2 rounded-lg font-bold transition-all border"
            style={{
              backgroundColor: "#F5F0E8",
              borderColor: "#D4A574",
              color: "#0F1A35",
            }}
          >
            {isAllComplete ? "Return to Map & Collect Payment" : "Save & Exit (Progress Saved)"}
          </motion.button>
        </div>
      </div>

      {/* OTP Keypad Modal */}
      <AnimatePresence>
        {showOtpKeypad && (
          <OtpVerificationKeypad
            orderId={parseInt(otpCustomerId.split("-").pop() || "0")}
            customerName={steps.find((s) => s.id === otpCustomerId)?.location || "Customer"}
            onVerify={handleOtpSubmit}
            onFail={async () => {
              toast.error("Delivery failed. Please contact support.");
              return false;
            }}
            onCancel={() => setShowOtpKeypad(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedMissionHUD;
