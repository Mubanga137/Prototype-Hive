import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface OnlineToggleCTAProps {
  isOnline: boolean;
  onToggleOnline: (val: boolean) => void;
  hasPermission: boolean | null;
  permissionError: string | null;
  isTransmitting: boolean;
  locationStatus: "locating" | "tracking" | "error" | "idle";
  isLoading?: boolean;
}

const OnlineToggleCTA = ({
  isOnline,
  onToggleOnline,
  hasPermission,
  permissionError,
  isTransmitting,
  locationStatus,
  isLoading = false,
}: OnlineToggleCTAProps) => {
  const [showPermissionDeniedModal, setShowPermissionDeniedModal] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleGoOnline = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setIsRetrying(true);

    navigator.geolocation.getCurrentPosition(
      () => {
        setIsRetrying(false);
        onToggleOnline(true);
      },
      (error) => {
        setIsRetrying(false);

        if (error.code === 1) {
          // Permission denied
          setShowPermissionDeniedModal(true);
        } else if (error.code === 2) {
          toast.error("Location services unavailable. Enable location on device.");
        } else if (error.code === 3) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Could not get location");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [onToggleOnline]);

  const handleRetryPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setIsRetrying(true);

    navigator.geolocation.getCurrentPosition(
      () => {
        setIsRetrying(false);
        setShowPermissionDeniedModal(false);
        onToggleOnline(true);
      },
      (error) => {
        setIsRetrying(false);
        if (error.code === 1) {
          toast.error("Location still denied. Please check your browser settings.");
        } else {
          toast.error("Could not get location");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [onToggleOnline]);

  const handleGoOffline = useCallback(() => {
    onToggleOnline(false);
  }, [onToggleOnline]);

  // Determine button state and styling
  const isLoadingState = isLoading || isRetrying || locationStatus === "locating";
  const isErrorState = hasPermission === false && !isLoadingState;

  return (
    <>
      {/* Permission Denied Modal */}
      <AnimatePresence>
        {showPermissionDeniedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPermissionDeniedModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-white rounded-3xl p-6 max-w-sm shadow-lg"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "hsl(0,100%,40%,0.1)" }}>
                  <MapPin size={24} style={{ color: "hsl(0,100%,40%)" }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "hsl(220,55%,13%)" }}>Location needed</h2>
                  <p className="text-sm mt-1" style={{ color: "hsl(220,20%,46%)" }}>
                    Enable location access to go online and start receiving gigs.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetryPermission}
                  disabled={isRetrying}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: "hsl(38,73%,40%)" }}
                >
                  {isRetrying ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <MapPin size={16} />
                      Enable Location
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPermissionDeniedModal(false)}
                  className="w-full py-3 rounded-xl font-semibold transition-all border"
                  style={{
                    borderColor: "hsl(38,40%,85%)",
                    color: "hsl(220,55%,13%)",
                  }}
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main CTA Button — Fixed Bottom Center */}
      <motion.div
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-sm"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isOnline ? (
          // ONLINE STATE
          <motion.button
            onClick={handleGoOffline}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, hsl(120,100%,35%) 0%, hsl(120,80%,40%) 100%)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-white"
            />
            Go Offline
          </motion.button>
        ) : isLoadingState ? (
          // LOADING STATE
          <motion.div
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 text-white"
            style={{ background: "hsl(38,73%,40%,0.6)" }}
          >
            <Loader size={20} className="animate-spin" />
            {locationStatus === "locating" ? "Getting location..." : "Enabling..."}
          </motion.div>
        ) : isErrorState ? (
          // ERROR STATE - Permission denied
          <motion.button
            onClick={handleGoOnline}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center gap-3"
            style={{ background: "hsl(0,100%,40%)" }}
          >
            <AlertCircle size={20} />
            Enable Location
          </motion.button>
        ) : (
          // DEFAULT STATE - "Go Online"
          <motion.button
            onClick={handleGoOnline}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-lg flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg, hsl(38,73%,40%) 0%, hsl(38,73%,35%) 100%)" }}
          >
            <MapPin size={20} />
            Go Online
          </motion.button>
        )}
      </motion.div>
    </>
  );
};

export default OnlineToggleCTA;
