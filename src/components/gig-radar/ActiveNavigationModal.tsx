import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBatchRoutingStateMachine } from "@/hooks/gig-radar/useBatchRoutingStateMachine";
import { useMultiLegRouting } from "@/hooks/gig-radar/useMultiLegRouting";
import { RouteProgressStepper } from "./RouteProgressStepper";
import { OtpVerificationKeypad } from "./OtpVerificationKeypad";
import { BatchedOrder } from "@/utils/orderClustering";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

interface ActiveNavigationModalProps {
  batch: BatchedOrder;
  riderLat: number;
  riderLng: number;
  onClose?: () => void;
}

const MapUpdater = ({ riderLat, riderLng }: { riderLat: number; riderLng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([riderLat, riderLng], 14);
  }, [map, riderLat, riderLng]);
  return null;
};

export const ActiveNavigationModal = ({
  batch,
  riderLat,
  riderLng,
  onClose,
}: ActiveNavigationModalProps) => {
  const { profile } = useAuth();
  const { state, initializeBatch, confirmPickup, verifyOTP, failOrder } =
    useBatchRoutingStateMachine();
  const { drawMultiLegRoute } = useMultiLegRouting();
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [showOtpKeypad, setShowOtpKeypad] = useState(false);

  const riderId = profile?.id ? parseInt(profile.id as string) : 0;

  useEffect(() => {
    if (state.status === "idle") {
      initializeBatch(batch, riderId);
    }
  }, []);

  useEffect(() => {
    if (mapRef && state.status === "active_navigation") {
      drawMultiLegRoute(batch, riderLat, riderLng, mapRef);
    }
  }, [mapRef, state.status, batch, riderLat, riderLng, drawMultiLegRoute]);

  const handlePickupConfirm = async () => {
    await confirmPickup();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-40 bg-black/30 flex items-end"
    >
      <motion.div
        className="w-full h-[80vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "#FFFBF2" }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b-2 flex items-center justify-between" style={{ borderColor: "#E8DCC8" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#0F1A35" }}>
              🎯 Active Navigation
            </h2>
            <p className="text-xs" style={{ color: "#0F1A35/60" }}>
              Batch: {state.batch?.clusterId} • Step {state.currentStepIndex + 1} of {state.steps.length}
            </p>
          </div>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-lg transition-all hover:bg-black/5"
            whileHover={{ scale: 1.1 }}
          >
            <X size={20} style={{ color: "#0F1A35" }} />
          </motion.button>
        </div>

        {/* Main Content: Map + Stepper */}
        <div className="flex-1 overflow-y-auto flex gap-4 p-4">
          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden border-2" style={{ borderColor: "#D4A574" }}>
            <MapContainer
              center={[riderLat, riderLng]}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              ref={setMapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              <MapUpdater riderLat={riderLat} riderLng={riderLng} />
            </MapContainer>
          </div>

          {/* Stepper */}
          <div className="w-80 max-h-full overflow-y-auto">
            <RouteProgressStepper
              steps={state.steps}
              currentStepIndex={state.currentStepIndex}
            />
          </div>
        </div>

        {/* Action Panel */}
        <div className="px-4 py-4 border-t-2" style={{ borderColor: "#E8DCC8" }}>
          <AnimatePresence mode="wait">
            {state.currentStep.type === "pickup" && state.currentStep.status === "pending" && (
              <motion.div key="pickup-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3 className="font-bold mb-2" style={{ color: "#0F1A35" }}>
                  📍 Confirm Pickup at {state.batch?.pickupSmeNam}
                </h3>
                <p className="text-sm mb-4" style={{ color: "#0F1A35/70" }}>
                  Collect all {state.batch?.orderCount} items before proceeding.
                </p>
                <motion.button
                  onClick={handlePickupConfirm}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" }}
                >
                  ✅ Confirm Pickup
                </motion.button>
              </motion.div>
            )}

            {state.currentStep.type === "dropoff" && state.currentStep.status === "pending" && (
              <motion.div key="dropoff-verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3 className="font-bold mb-2" style={{ color: "#0F1A35" }}>
                  📦 Deliver to {state.currentStep.customerName}
                </h3>
                <p className="text-sm mb-4" style={{ color: "#0F1A35/70" }}>
                  {state.currentStep.customerPhone}
                </p>
                <motion.button
                  onClick={() => setShowOtpKeypad(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" }}
                >
                  🔒 Verify OTP
                </motion.button>
              </motion.div>
            )}

            {(state.currentStep.type === "complete" || state.status === "completed") && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  className="text-center p-4 rounded-lg mb-4"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                >
                  <p className="text-lg font-bold" style={{ color: "#16A34A" }}>
                    ✅ Batch Complete!
                  </p>
                  <p className="text-sm" style={{ color: "#16A34A/70" }}>
                    All deliveries confirmed.
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="w-full py-3 rounded-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" }}
                >
                  Close Navigation
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
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
    </motion.div>
  );
};
