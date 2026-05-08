import { motion, AnimatePresence } from "framer-motion";
import { MapPin, DollarSign, Clock, X, Zap, AlertCircle } from "lucide-react";
import { NearbyGig } from "@/hooks/useNearbyGigs";
import { useGigRouting, formatRouteDistance } from "@/hooks/useGigRouting";

interface GigPreviewSheetProps {
  gig: NearbyGig | null;
  open: boolean;
  onClose: () => void;
  onAccept: (gigId: number) => Promise<void>;
  agentLat?: number | null;
  agentLng?: number | null;
  isLoading?: boolean;
}

const GigPreviewSheet = ({
  gig,
  open,
  onClose,
  onAccept,
  agentLat,
  agentLng,
  isLoading = false,
}: GigPreviewSheetProps) => {
  // Get route info to pickup location
  const { route, loading: routeLoading, error: routeError } = useGigRouting(
    agentLat ?? null,
    agentLng ?? null,
    gig?.pickup_lat ?? null,
    gig?.pickup_lng ?? null,
    open && !!gig
  );

  if (!gig) return null;

  const handleAccept = async () => {
    await onAccept(gig.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl z-50 md:fixed md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-96 md:rounded-2xl"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>

            {/* Content */}
            <div className="space-y-4">
              {/* Title */}
              <div className="pr-8">
                <h2 className="text-xl font-bold" style={{ color: "hsl(220,55%,13%)" }}>
                  Gig #{gig.id}
                </h2>
                <p className="text-sm" style={{ color: "hsl(220,20%,46%)" }}>
                  {gig.title}
                </p>
              </div>

              {/* Divider */}
              <div
                className="h-px"
                style={{ background: "hsl(38,40%,85%)" }}
              />

              {/* Route info */}
              <div className="space-y-3">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "hsl(38,73%,40%,0.1)" }}
                  >
                    <MapPin
                      size={16}
                      style={{ color: "hsl(38,73%,40%)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220,20%,46%)" }}>
                      Pickup Location
                    </p>
                    <p
                      className="text-sm font-medium mt-1"
                      style={{ color: "hsl(220,55%,13%)" }}
                    >
                      Coordinates: {gig.pickup_lat.toFixed(4)}, {gig.pickup_lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Dropoff */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "hsl(38,73%,40%,0.1)" }}
                  >
                    <MapPin
                      size={16}
                      style={{ color: "hsl(38,73%,40%)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220,20%,46%)" }}>
                      Dropoff Location
                    </p>
                    <p
                      className="text-sm font-medium mt-1"
                      style={{ color: "hsl(220,55%,13%)" }}
                    >
                      Coordinates: {gig.dropoff_lat.toFixed(4)}, {gig.dropoff_lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div
                className="h-px"
                style={{ background: "hsl(38,40%,85%)" }}
              />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {/* Distance */}
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: "hsl(38,73%,40%,0.06)" }}
                >
                  <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                    Distance
                  </p>
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: "hsl(38,73%,40%)" }}
                  >
                    {routeLoading ? "..." : route ? formatRouteDistance(route.distance) : gig.distance_estimate}
                  </p>
                </div>

                {/* Time estimate */}
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: "hsl(38,73%,40%,0.06)" }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock size={12} style={{ color: "hsl(220,20%,46%)" }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                    To Pickup
                  </p>
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: "hsl(38,73%,40%)" }}
                  >
                    {routeLoading ? "..." : route ? route.eta.split(" ")[0] : "N/A"}
                  </p>
                </div>

                {/* Payout */}
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: "hsl(38,73%,40%,0.06)" }}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign size={12} style={{ color: "hsl(220,20%,46%)" }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "hsl(220,20%,46%)" }}>
                    Payout
                  </p>
                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: "hsl(38,73%,40%)" }}
                  >
                    ZMW {gig.payout}
                  </p>
                </div>
              </div>

              {/* Route error warning */}
              {routeError && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "hsl(0,95%,90%)" }}>
                  <AlertCircle size={16} style={{ color: "hsl(0,95%,40%)", flexShrink: 0, marginTop: "2px" }} />
                  <p className="text-xs" style={{ color: "hsl(0,95%,30%)" }}>
                    {routeError}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div
                className="h-px"
                style={{ background: "hsl(38,40%,85%)" }}
              />

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border font-semibold transition-all"
                  style={{
                    borderColor: "hsl(38,73%,40%,0.3)",
                    color: "hsl(38,73%,40%)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{
                    background: "hsl(38,73%,40%)",
                    color: "hsl(39,100%,97%)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-current" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> Accept Gig
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GigPreviewSheet;
