import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, Navigation, CheckCircle2, AlertTriangle, Plus, Minus, Package, Truck, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBatchRoutingStateMachine } from "@/hooks/gig-radar/useBatchRoutingStateMachine";
import { useMultiLegRouting } from "@/hooks/gig-radar/useMultiLegRouting";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { OtpVerificationKeypad } from "./OtpVerificationKeypad";
import { BatchedOrder } from "@/utils/orderClustering";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { toast } from "sonner";

interface CommandCenterProps {
  batch: BatchedOrder;
  riderLat: number;
  riderLng: number;
  onClose?: () => void;
}

type OperationMode = "pickup" | "delivery" | "complete";

const UserMarker = ({ lat, lng }: { lat: number; lng: number }) => {
  return (
    <Marker
      position={[lat, lng]}
      icon={L.divIcon({
        className: "user-location-marker",
        html: `
          <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
            <div class="absolute w-full h-full rounded-full border-2 border-white" style="background: linear-gradient(135deg, #B37C1C 0%, #8B6914 100%); box-shadow: 0 0 20px rgba(179, 124, 28, 0.8);"></div>
            <div class="absolute w-3 h-3 bg-white rounded-full" style="box-shadow: 0 0 12px rgba(179, 124, 28, 0.8); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })}
    />
  );
};

const PickupLocationMarker = ({ lat, lng }: { lat: number; lng: number }) => {
  return (
    <Marker
      position={[lat, lng]}
      icon={L.divIcon({
        className: "pickup-marker",
        html: `
          <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-white" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); box-shadow: 0 0 20px rgba(5, 150, 105, 0.6);">
            <span class="text-white font-bold text-lg">📦</span>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })}
    />
  );
};

const DropoffMarker = ({ lat, lng, index }: { lat: number; lng: number; index: number }) => {
  return (
    <Marker
      position={[lat, lng]}
      icon={L.divIcon({
        className: "dropoff-marker",
        html: `
          <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-white" style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);">
            <span class="text-white font-bold text-sm">${index}</span>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })}
    />
  );
};

const MapController = ({ riderLat, riderLng, mode }: { riderLat: number; riderLng: number; mode: OperationMode }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      const offsetLat = riderLat + (mode === "delivery" ? 0.002 : 0);
      map.flyTo([offsetLat, riderLng], map.getZoom(), { duration: 0.5 });
    }
  }, [map, riderLat, riderLng, mode]);

  return null;
};

export const CommandCenter = ({
  batch,
  riderLat,
  riderLng,
  onClose,
}: CommandCenterProps) => {
  const { profile } = useAuth();
  const { state, initializeBatch, confirmPickup, verifyOTP, failOrder } = useBatchRoutingStateMachine();
  const { drawMultiLegRoute } = useMultiLegRouting();
  const { location } = useLocationService();
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [mode, setMode] = useState<OperationMode>("pickup");
  const [showOtpKeypad, setShowOtpKeypad] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; eta: string } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(16);

  const riderId = profile?.id ? parseInt(profile.id as string) : 0;

  // Initialize batch
  useEffect(() => {
    if (state.status === "idle") {
      initializeBatch(batch, riderId);
    }
  }, []);

  // Draw route
  useEffect(() => {
    if (!mapRef || state.status === "idle") return;

    const currentLoc = location || { lat: riderLat, lng: riderLng };
    drawMultiLegRoute(batch, currentLoc.lat, currentLoc.lng, mapRef, (data) => {
      const distanceKm = (data.totalDistance / 1000).toFixed(1);
      const etaMin = Math.ceil(data.totalDuration / 60);
      setRouteInfo({ distance: `${distanceKm} km`, eta: `${etaMin} min` });
    });
  }, [mapRef, state.status, location, riderLat, riderLng, batch, drawMultiLegRoute]);

  // Track zoom level
  useEffect(() => {
    if (!mapRef) return;
    const handleZoom = () => setCurrentZoom(mapRef.getZoom());
    mapRef.on("zoom", handleZoom);
    return () => {
      mapRef.off("zoom", handleZoom);
    };
  }, [mapRef]);

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

  const handleZoomIn = () => {
    if (mapRef && currentZoom < 20) {
      mapRef.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef && currentZoom > 2) {
      mapRef.setZoom(currentZoom - 1);
    }
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
          <MapContainer
            center={[riderLat, riderLng]}
            zoom={16}
            style={{ height: "100%", width: "100%", flex: 1 }}
            ref={setMapRef}
            className="z-10"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            <MapController riderLat={riderLat} riderLng={riderLng} mode={mode} />

            {/* User marker */}
            <UserMarker lat={riderLat} lng={riderLng} />

            {/* Pickup marker (pickup mode) */}
            {mode === "pickup" && batch.pickupLoc && (
              <PickupLocationMarker lat={batch.pickupLoc.lat} lng={batch.pickupLoc.lng} />
            )}

            {/* Dropoff markers (delivery mode) */}
            {mode === "delivery" &&
              batch.dropoffs.map((dropoff, idx) => (
                <DropoffMarker key={`dropoff-${idx}`} lat={dropoff.loc.lat} lng={dropoff.loc.lng} index={idx + 1} />
              ))}
          </MapContainer>

          {/* Zoom Controls + Route Info Pill (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-3">
            {/* Zoom Controls */}
            <div className="flex flex-col gap-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <motion.button
                onClick={handleZoomIn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 hover:bg-gray-100 transition-colors"
                style={{ color: "#B37C1C" }}
                title="Zoom in"
              >
                <Plus size={18} />
              </motion.button>
              <div className="w-6 h-px" style={{ backgroundColor: "#E8DCC8" }} />
              <motion.button
                onClick={handleZoomOut}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 hover:bg-gray-100 transition-colors"
                style={{ color: "#B37C1C" }}
                title="Zoom out"
              >
                <Minus size={18} />
              </motion.button>
            </div>

            {/* Route Info Pill - Gold and Black */}
            {routeInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border"
                style={{
                  backgroundColor: "#B37C1C",
                  color: "#FFFBF2",
                  backdropFilter: "blur(4px)",
                  borderColor: "#0F1A35",
                  borderWidth: "1px",
                }}
              >
                <Navigation size={14} />
                <span className="text-sm font-bold">
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
          <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: "#D4A574" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)",
                  }}
                >
                  {mode === "pickup" ? (
                    <Package size={16} className="text-white" />
                  ) : mode === "delivery" ? (
                    <Truck size={16} className="text-white" />
                  ) : (
                    <CheckCircle2 size={16} className="text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold" style={{ color: "#0F1A35" }}>
                    {mode === "pickup" && "Pickup"}
                    {mode === "delivery" && "Delivery"}
                    {mode === "complete" && "Done"}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#0F1A35/60" }}>
                    Step {state.currentStepIndex + 1} of {state.steps.length - 1}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Badge - Gold and Black gradient */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)", borderColor: "#0F1A35", color: "#FFFBF2" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FFFBF2" }} />
              <span>
                {mode === "pickup" ? "PICKUP" : "DELIVERY"}
              </span>
            </div>
          </div>

          {/* Steps List - Mobile Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-2">
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
                    className="p-3 sm:p-4 rounded-lg transition-all border"
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
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: "#B37C1C" }}
                          />
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
                            <p className="font-bold text-sm" style={{ color: isCurrentStep ? "#B37C1C" : "#0F1A35" }}>
                              {batch.pickupSmeNam}
                            </p>
                            <p className="text-xs mt-1" style={{ color: "#0F1A35/60" }}>
                              Collect {batch.orderCount} item{batch.orderCount !== 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-sm" style={{ color: isCurrentStep ? "#B37C1C" : "#0F1A35" }}>
                              {step.customerName}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Phone size={12} style={{ color: "#0F1A35/60" }} />
                              <p className="text-xs" style={{ color: "#0F1A35/60" }}>
                                {step.customerPhone}
                              </p>
                            </div>
                            <p className="text-xs mt-1" style={{ color: "#0F1A35/60" }}>
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
          <div className="px-4 sm:px-6 py-4 border-t" style={{ borderColor: "#D4A574" }}>
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-center p-3 sm:p-4 rounded-lg mb-3 border" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: "#22C55E" }}>
                    <p className="text-base sm:text-lg font-bold" style={{ color: "#16A34A" }}>
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
                    className="w-full py-2.5 sm:py-3 rounded-lg font-bold text-white text-sm sm:text-base"
                    style={{ background: "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" }}
                  >
                    Return to Map
                  </motion.button>
                </motion.div>
              ) : state.currentStep.type === "pickup" && state.currentStep.status === "pending" ? (
                <motion.div key="pickup-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs sm:text-sm mb-3" style={{ color: "#0F1A35/70" }}>
                    Arrive at {batch.pickupSmeNam} and collect all items.
                  </p>
                  <motion.button
                    onClick={handlePickupConfirm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 sm:py-3 rounded-lg font-bold text-white text-sm sm:text-base"
                    style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}
                  >
                    Confirm Pickup
                  </motion.button>
                </motion.div>
              ) : state.currentStep.type === "dropoff" && state.currentStep.status === "pending" ? (
                <motion.div key="delivery-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="rounded-lg p-2.5 sm:p-3 mb-3 border" style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", borderColor: "#3B82F6" }}>
                    <p className="text-xs font-bold" style={{ color: "#1D4ED8" }}>
                      Delivery #{state.currentStepIndex}
                    </p>
                    <p className="text-sm font-bold mt-1" style={{ color: "#0F1A35" }}>
                      {state.currentStep.customerName}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowOtpKeypad(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 sm:py-3 rounded-lg font-bold text-white text-sm sm:text-base"
                    style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" }}
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
