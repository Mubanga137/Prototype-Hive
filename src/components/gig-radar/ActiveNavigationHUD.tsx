import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, MapPin, Package, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { BatchedOrder } from "@/utils/orderClustering";

interface Step {
  id: string;
  number: number;
  type: "pickup" | "delivery";
  location: string;
  details: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  eta?: string;
}

interface ActiveNavigationHUDProps {
  batch: BatchedOrder;
  onClose: () => void;
  currentStepIndex?: number;
}

export const ActiveNavigationHUD = ({
  batch,
  onClose,
  currentStepIndex = 0,
}: ActiveNavigationHUDProps) => {
  // Build steps from batch
  const steps: Step[] = [
    {
      id: "pickup",
      number: 1,
      type: "pickup",
      location: batch.pickupSmeNam,
      details: `Collect ${batch.orderCount} item${batch.orderCount !== 1 ? "s" : ""}`,
      status: currentStepIndex === 0 ? "in_progress" : "pending",
      eta: "5 mins",
    },
    ...batch.dropoffs.map((dropoff, idx) => ({
      id: `delivery-${dropoff.orderId}`,
      number: idx + 2,
      type: "delivery" as const,
      location: dropoff.customer,
      details: `Order #${dropoff.orderId} • ${dropoff.phone.slice(-4)}`,
      status: currentStepIndex > idx + 1 ? "completed" : currentStepIndex === idx + 1 ? "in_progress" : "pending",
      eta: idx === 0 ? "15 mins" : undefined,
    })),
  ];

  const totalDistance = "4.5 km";
  const totalETA = "35 mins";
  const totalPayout = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
  }).format(batch.totalEstimate);

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
              {batch.orderCount} orders • Step {currentStepIndex + 1} of {steps.length}
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
              {totalPayout}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center">
              <MapPin size={16} style={{ color: "#B37C1C", marginBottom: "4px" }} />
              <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                {totalDistance}
              </p>
              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                Distance
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Clock size={16} style={{ color: "#B37C1C", marginBottom: "4px" }} />
              <p className="text-xs font-bold" style={{ color: "#0F1A35" }}>
                {totalETA}
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

        {/* Vertical Stepper */}
        <div className="px-4 sm:px-6 flex-1">
          <h3 className="font-bold text-sm mb-4" style={{ color: "#0F1A35" }}>
            Mission Steps
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
                const isCompleted = step.status === "completed";

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative pl-10 pb-2"
                  >
                    {/* Step Indicator */}
                    <div className="absolute left-0 top-0">
                      <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                        animate={isCurrentStep ? { scale: [1, 1.1, 1] } : {}}
                        transition={isCurrentStep ? { duration: 1.5, repeat: Infinity } : {}}
                        style={{
                          backgroundColor: isCurrentStep
                            ? "#B37C1C"
                            : isCompleted
                              ? "#22C55E"
                              : "#F5F0E8",
                          borderColor: isCurrentStep
                            ? "#B37C1C"
                            : isCompleted
                              ? "#22C55E"
                              : "#D4A574",
                          color: isCurrentStep || isCompleted ? "#FFFBF2" : "#0F1A35",
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={16} />
                        ) : isCurrentStep ? (
                          step.type === "pickup" ? (
                            <Package size={16} />
                          ) : (
                            <MapPin size={16} />
                          )
                        ) : (
                          <span className="text-xs font-bold">{step.number}</span>
                        )}
                      </motion.div>
                    </div>

                    {/* Step Content */}
                    <motion.div
                      className="p-3 rounded-lg border transition-all"
                      style={{
                        backgroundColor: isCurrentStep
                          ? "rgba(179, 124, 28, 0.1)"
                          : isCompleted
                            ? "rgba(34, 197, 94, 0.08)"
                            : "#FFFFFF",
                        borderColor: isCurrentStep
                          ? "#B37C1C"
                          : isCompleted
                            ? "#22C55E"
                            : "#D4A574",
                      }}
                      whileHover={isCurrentStep ? { scale: 1.02 } : {}}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-bold uppercase tracking-wide"
                              style={{
                                color: isCurrentStep ? "#B37C1C" : "#0F1A35/70",
                              }}
                            >
                              {step.type === "pickup" ? "PICKUP" : "DELIVERY"}
                            </span>
                            {isCurrentStep && (
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
                          </div>
                          <p className="font-bold text-sm mb-1" style={{ color: "#0F1A35" }}>
                            {step.location}
                          </p>
                          <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                            {step.details}
                          </p>
                          {step.eta && (
                            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#B37C1C" }}>
                              <Clock size={12} />
                              ETA: {step.eta}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 sm:px-6 py-4 border-t space-y-3" style={{ borderColor: "#D4A574" }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
              boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)",
            }}
          >
            <Navigation size={16} />
            🗺️ NAVIGATE
          </motion.button>
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
            Return to Map
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ActiveNavigationHUD;
