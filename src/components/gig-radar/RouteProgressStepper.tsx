import { motion, AnimatePresence } from "framer-motion";
import { Check, Phone, MapPin, AlertCircle } from "lucide-react";
import { RouteStep } from "@/hooks/gig-radar/useBatchRoutingStateMachine";

interface RouteProgressStepperProps {
  steps: RouteStep[];
  currentStepIndex: number;
  onStepClick?: (stepIndex: number) => void;
}

export const RouteProgressStepper = ({
  steps,
  currentStepIndex,
  onStepClick,
}: RouteProgressStepperProps) => {
  const getStepIcon = (step: RouteStep, isActive: boolean) => {
    if (step.status === "completed") {
      return <Check size={20} className="text-white" />;
    }
    if (step.status === "failed") {
      return <AlertCircle size={20} className="text-white" />;
    }
    if (step.type === "pickup") {
      return <MapPin size={20} className={isActive ? "text-white" : "#0F1A35"} />;
    }
    if (step.type === "dropoff") {
      return <Phone size={20} className={isActive ? "text-white" : "#0F1A35"} />;
    }
    return <Check size={20} className={isActive ? "text-white" : "#0F1A35"} />;
  };

  const getStepTitle = (step: RouteStep) => {
    if (step.type === "pickup") {
      return `Step ${step.index}: Pickup`;
    }
    if (step.type === "dropoff") {
      return `Step ${step.index}: Dropoff #${step.index}`;
    }
    return `Complete`;
  };

  const getStepSubtitle = (step: RouteStep) => {
    if (step.type === "dropoff") {
      return `${step.customerName} • ${step.customerPhone}`;
    }
    if (step.type === "pickup") {
      return "Collect all items";
    }
    return "Route finished";
  };

  return (
    <div className="flex flex-col gap-0">
      <AnimatePresence>
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isPassed = idx < currentStepIndex;
          const isFailed = step.status === "failed";
          const isCompleted = step.status === "completed";

          return (
            <motion.div
              key={step.stepId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className="absolute left-6 top-16 h-12 w-1"
                  style={{
                    backgroundColor: isPassed ? "#B37C1C" : isActive ? "#B37C1C" : "hsl(38,40%,85%)",
                  }}
                />
              )}

              {/* Step card */}
              <motion.div
                onClick={() => onStepClick?.(idx)}
                className={`relative p-4 rounded-2xl transition-all cursor-pointer ${
                  isActive ? "ring-2" : ""
                }`}
                style={{
                  backgroundColor:
                    isActive || isPassed || isCompleted ? "rgba(179, 124, 28, 0.1)" : "#FFFFFF",
                  borderColor: isActive ? "#B37C1C" : isFailed ? "#E53E3E" : "hsl(38,40%,85%)",
                  borderWidth: isActive ? "2px" : "1px",
                  ringColor: "#B37C1C",
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex gap-4">
                  {/* Icon circle */}
                  <motion.div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      background:
                        isCompleted || isPassed
                          ? "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)"
                          : isActive
                            ? "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)"
                            : isFailed
                              ? "#E53E3E"
                              : "#F5F0E8",
                      color: isCompleted || isPassed || isActive || isFailed ? "white" : "#0F1A35",
                      boxShadow: isActive ? "0 4px 12px rgba(179, 124, 28, 0.3)" : "none",
                    }}
                    animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {getStepIcon(step, isActive)}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-sm mb-1"
                      style={{
                        color: isFailed ? "#E53E3E" : "#0F1A35",
                      }}
                    >
                      {getStepTitle(step)}
                    </h3>
                    <p
                      className="text-xs leading-tight mb-2 truncate"
                      style={{ color: "#0F1A35/60" }}
                    >
                      {getStepSubtitle(step)}
                    </p>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <motion.span
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{
                            backgroundColor: "#B37C1C",
                            color: "white",
                          }}
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          Current Step
                        </motion.span>
                      )}
                      {isCompleted && (
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{
                            backgroundColor: "rgba(34, 197, 94, 0.2)",
                            color: "#16A34A",
                          }}
                        >
                          ✅ Completed
                        </span>
                      )}
                      {isFailed && (
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{
                            backgroundColor: "rgba(229, 62, 62, 0.2)",
                            color: "#E53E3E",
                          }}
                        >
                          ⚠️ Failed
                        </span>
                      )}
                      {step.otpAttempts > 0 && step.type === "dropoff" && (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#0F1A35/50" }}
                        >
                          Attempts: {step.otpAttempts}/3
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
