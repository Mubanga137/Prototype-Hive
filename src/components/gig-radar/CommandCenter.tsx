import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, Navigation, CheckCircle2, AlertTriangle, Plus, Minus, Package, Truck, Clock, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBatchRoutingStateMachine } from "@/hooks/gig-radar/useBatchRoutingStateMachine";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { OtpVerificationKeypad } from "./OtpVerificationKeypad";
import { BatchedOrder } from "@/utils/orderClustering";
import { toast } from "sonner";

interface CommandCenterProps {
  batch: BatchedOrder;
  riderLat: number;
  riderLng: number;
  onClose?: () => void;
}

type OperationMode = "pickup" | "delivery" | "complete";

export const CommandCenter = ({
  batch,
  riderLat,
  riderLng,
  onClose,
}: CommandCenterProps) => {
  const { profile } = useAuth();
  const { state, initializeBatch, confirmPickup, verifyOTP, failOrder } = useBatchRoutingStateMachine();
  const { location } = useLocationService();
  const [mode, setMode] = useState<OperationMode>("pickup");
  const [showOtpKeypad, setShowOtpKeypad] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);

  // Use auth user ID (UUID) as rider identifier
  const riderUserId = profile?.id || "";

  // Initialize batch
  useEffect(() => {
    if (state.status === "idle" && riderUserId) {
      initializeBatch(batch, riderUserId);
    }
  }, [riderUserId]);


  const handlePickupConfirm = async () => {
    await confirmPickup();
    setMode("delivery");
    toast.success("Pickup confirmed! Starting deliveries...");
  };

  const handleOtpSubmit = async (otp: string): Promise<boolean> => {
    if (!state.currentStep?.orderId) return false;
    const success = await verifyOTP(otp, state.currentStep.orderId);
    if (success) {
      setShowOtpKeypad(false);
    }
    return success;
  };

  const handleFailOrder = async (reason: string): Promise<boolean> => {
    if (!state.currentStep?.orderId) return false;
    const success = await failOrder(state.currentStep.orderId, reason);
    if (success) {
      setShowOtpKeypad(false);
    }
    return success;
  };


  if (!state.currentStep) {
    return null;
  }

  const isComplete = state.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 overflow-hidden flex flex-col"
      style={{ backgroundColor: "#FFFBF2" }}
    >
      {/* Keep the Hive Header visible */}
      <header
        className="h-16 border-b flex items-center justify-between px-4 sm:px-6 shrink-0"
        style={{
          backgroundColor: "rgba(255, 251, 242, 0.95)",
          borderColor: "#D4A574",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "#0F1A35" }}>
            <Truck size={20} style={{ color: "#B37C1C" }} />
            Active Delivery
          </h2>
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)", borderColor: "#0F1A35", color: "#FFFBF2" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FFFBF2" }} />
            <span>
              {mode === "pickup" ? "PICKUP" : "DELIVERY"}
            </span>
          </div>
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          className="p-2 rounded-lg transition-all"
          style={{ backgroundColor: "#F5F0E8" }}
        >
          <X size={20} style={{ color: "#0F1A35" }} />
        </motion.button>
      </header>

      {/* Main Content with gold/ivory border */}
      <div
        className="flex-1 flex overflow-hidden m-2 rounded-2xl"
        style={{
          backgroundColor: "#FFFBF2",
          border: "1px solid #D4A574",
          boxShadow: "0 8px 32px rgba(179, 124, 28, 0.15)",
        }}
      >
        {/* LEFT: Map Panel */}
        <div className="flex-[0.65] lg:flex-[0.65] relative overflow-hidden flex flex-col" style={{ backgroundColor: "#F5F0E8" }}>
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <p style={{ color: "#666" }}>Map view goes here</p>
          </div>

          {/* Zoom Controls + Route Info Pill (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-3">
            {/* Zoom Controls */}
            <div className="inline-flex bg-white rounded-full shadow-lg border border-gray-200 p-0.5">
              <motion.button
                onClick={handleZoomIn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-full"
                style={{ color: "#B37C1C" }}
                title="Zoom in"
              >
                <Plus size={12} />
              </motion.button>
              <motion.button
                onClick={handleZoomOut}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-full"
                style={{ color: "#B37C1C" }}
                title="Zoom out"
              >
                <Minus size={12} />
              </motion.button>
            </div>

            {/* Route Info Pill - Gold and Black Gradient */}
            {routeInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3 py-2 rounded-full shadow-lg flex items-center gap-2 border"
                style={{
                  background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
                  color: "#FFFBF2",
                  backdropFilter: "blur(4px)",
                  borderColor: "#0F1A35",
                  borderWidth: "1px",
                }}
              >
                <Navigation size={13} />
                <span className="text-xs font-bold">
                  {routeInfo.distance} • {routeInfo.eta}
                </span>
              </motion.div>
            )}
          </div>

          {/* Recenter Button (top-right of map) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (mapRef) {
                mapRef.flyTo([riderLat, riderLng], 16, { duration: 0.5 });
              }
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center z-20 transition-all"
            style={{ backgroundColor: "#FFFBF2", color: "#0F1A35" }}
            title="Recenter map on your location"
          >
            <MapPin size={20} />
          </motion.button>
        </div>

        {/* RIGHT: Task Panel */}
        <div
          className="flex-[0.35] lg:flex-[0.35] overflow-hidden flex flex-col relative"
          style={{
            backgroundColor: "#FFFBF2",
            borderLeft: "1px solid #D4A574",
          }}
        >
          {/* Header */}
          <div className="px-2 sm:px-3 py-1 border-b" style={{ borderColor: "#D4A574" }}>
            {/* Store/Order Pills - Slim and compact */}
            <div className="flex gap-1.5 flex-wrap mb-1">
              {mode === "pickup" && (
                <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold border" style={{ backgroundColor: "rgba(179, 124, 28, 0.1)", borderColor: "#B37C1C", color: "#B37C1C" }}>
                  <Store size={11} />
                  <span className="whitespace-nowrap">{batch.pickupSmeNam}</span>
                </div>
              )}

              {mode === "delivery" && state.currentStep?.type === "dropoff" && (
                <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold border" style={{ backgroundColor: "rgba(179, 124, 28, 0.1)", borderColor: "#B37C1C", color: "#B37C1C" }}>
                  <Package size={11} />
                  <span className="whitespace-nowrap">Order #{state.currentStep.orderId}</span>
                </div>
              )}
            </div>

            {/* Title and Step */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(179, 124, 28, 0.15)" }}
              >
                <Store size={12} style={{ color: "#B37C1C" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold leading-tight" style={{ color: "#0F1A35" }}>
                  {mode === "pickup" && "Pickup"}
                  {mode === "delivery" && "Delivery"}
                  {mode === "complete" && "Done"}
                </h3>
                <p className="text-xs leading-tight" style={{ color: "#0F1A35/60" }}>
                  Step {state.currentStepIndex + 1} of {state.steps.length - 1}
                </p>
              </div>
            </div>
          </div>

          {/* Steps List - Mobile Scrollable */}
          <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-0.5">
              {state.steps.map((step, idx) => {
                const isCurrentStep = idx === state.currentStepIndex;
                const isCompleted = step.status === "completed";
                const isFailed = step.status === "failed";

                if (step.type === "complete") return null;

                return (
                  <motion.div
                    key={step.stepId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2 sm:p-2.5 rounded-lg transition-all border"
                    style={{
                      backgroundColor: isCurrentStep ? "rgba(179, 124, 28, 0.12)" : isCompleted ? "rgba(34, 197, 94, 0.08)" : "#FFFFFF",
                      borderColor: isCurrentStep ? "#B37C1C" : isCompleted ? "#22C55E" : isFailed ? "#EF4444" : "#D4A574",
                      borderWidth: isCurrentStep ? "1px" : "1px",
                    }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Step Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
                        ) : isFailed ? (
                          <AlertTriangle size={16} style={{ color: "#EF4444" }} />
                        ) : isCurrentStep ? (
                          step.type === "pickup" ? (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Store size={16} style={{ color: "#B37C1C" }} />
                            </motion.div>
                          ) : (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: "#B37C1C" }}
                            >
                              <span className="text-xs font-bold text-white">{idx}</span>
                            </motion.div>
                          )
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: "#D4A574", color: "#0F1A35" }}
                          >
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        {step.type === "pickup" ? (
                          <>
                            <p className="font-bold text-xs" style={{ color: isCurrentStep ? "#B37C1C" : "#0F1A35" }}>
                              {batch.pickupSmeNam}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "#0F1A35/60" }}>
                              Collect {batch.orderCount} item{batch.orderCount !== 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-xs" style={{ color: isCurrentStep ? "#B37C1C" : "#0F1A35" }}>
                              {step.customerName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone size={11} style={{ color: "#0F1A35/60" }} />
                              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                                {step.customerPhone}
                              </p>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "#0F1A35/60" }}>
                              Order #{step.orderId}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-2 sm:px-3 py-1 border-t space-y-1 relative z-50" style={{ borderColor: "#D4A574" }}>
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-center p-2.5 sm:p-3 rounded-lg border" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: "#22C55E" }}>
                    <p className="text-sm font-bold" style={{ color: "#16A34A" }}>
                      All Done!
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#16A34A/70" }}>
                      {batch.orderCount} deliveries completed
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-1.5 rounded-lg font-bold text-white text-xs"
                    style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)" }}
                  >
                    Return to Map
                  </motion.button>
                </motion.div>
              ) : state.currentStep.type === "pickup" && state.currentStep.status === "pending" ? (
                <motion.div key="pickup-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs mb-2" style={{ color: "#0F1A35/70" }}>
                    Arrive at {batch.pickupSmeNam} and collect all items.
                  </p>
                  <motion.button
                    onClick={handlePickupConfirm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-1.5 rounded-lg font-bold text-white text-xs"
                    style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)" }}
                  >
                    Confirm Pickup
                  </motion.button>
                </motion.div>
              ) : state.currentStep.type === "dropoff" && state.currentStep.status === "pending" ? (
                <motion.div key="delivery-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="rounded-lg p-1.5 border text-xs" style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)", borderColor: "#0F1A35", color: "#FFFBF2" }}>
                    <p className="font-bold" style={{ color: "#FFFBF2/70" }}>
                      Delivery #{state.currentStepIndex}
                    </p>
                    <p className="font-bold" style={{ color: "#FFFBF2" }}>
                      {state.currentStep.customerName}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowOtpKeypad(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-1.5 rounded-lg font-bold text-white text-xs"
                    style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)" }}
                  >
                    Verify OTP
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* OTP Keypad Modal */}
      <AnimatePresence>
        {showOtpKeypad && state.currentStep.type === "dropoff" && (
          <OtpVerificationKeypad
            orderId={state.currentStep.orderId || 0}
            customerName={state.currentStep.customerName || ""}
            onVerify={handleOtpSubmit}
            onFail={handleFailOrder}
            onCancel={() => setShowOtpKeypad(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
