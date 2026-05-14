import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface GoOnlineOverlayProps {
  isOnline: boolean;
  onOnline: () => void;
  onLocationAcquired?: (lat: number, lng: number) => void;
}

export const GoOnlineOverlay = ({
  isOnline,
  onOnline,
  onLocationAcquired,
}: GoOnlineOverlayProps) => {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [bulbShining, setBulbShining] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setBulbShining(true);
    } else {
      setBulbShining(false);
    }
  }, [isOnline]);

  const handleGoOnlineClick = async () => {
    if (isOnline) return;

    setIsLoadingLocation(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLoadingLocation(false);
        onLocationAcquired?.(latitude, longitude);
        onOnline();
        toast.success("✨ You're online! Location acquired.");
      },
      (error) => {
        setIsLoadingLocation(false);
        console.error("Geolocation error:", error);
        if (error.code === 1) {
          toast.error("Location permission denied. Please enable location access.");
        } else {
          toast.error("Failed to get location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
    >
      <motion.button
        onClick={handleGoOnlineClick}
        disabled={isOnline || isLoadingLocation}
        whileHover={!isOnline && !isLoadingLocation ? { scale: 1.05 } : {}}
        whileTap={!isOnline && !isLoadingLocation ? { scale: 0.95 } : {}}
        className="px-6 py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2 transition-all border backdrop-blur-md shadow-xl"
        style={{
          background: isOnline
            ? "linear-gradient(135deg, rgba(179, 124, 28, 0.15) 0%, rgba(15, 26, 53, 0.15) 100%)"
            : "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
          color: isOnline ? "#B37C1C" : "#FFFBF2",
          borderColor: isOnline ? "rgba(179, 124, 28, 0.3)" : "#B37C1C",
          borderWidth: "1px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <motion.div
          animate={bulbShining ? { 
            opacity: [1, 0.6, 1],
            scale: [1, 1.1, 1]
          } : {}}
          transition={bulbShining ? { duration: 2, repeat: Infinity } : {}}
        >
          <Lightbulb
            size={18}
            style={{
              filter: bulbShining ? "drop-shadow(0 0 8px #B37C1C)" : "none",
            }}
          />
        </motion.div>
        <span className="whitespace-nowrap">
          {isLoadingLocation ? "Acquiring location..." : isOnline ? "💡 ONLINE" : "💡 Go Online"}
        </span>
      </motion.button>

      {/* Subtle location indicator when online */}
      {isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md"
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            color: "#16A34A",
            borderColor: "rgba(34, 197, 94, 0.3)",
            borderWidth: "1px",
          }}
        >
          📍 Location tracking active
        </motion.div>
      )}
    </motion.div>
  );
};

export default GoOnlineOverlay;
