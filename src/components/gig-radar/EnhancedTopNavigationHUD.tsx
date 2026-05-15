import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { mapboxRoutingService } from "@/services/mapboxRoutingService";

interface EnhancedTopNavigationHUDProps {
  destination: { lat: number; lng: number };
  currentLocation: { lat: number; lng: number };
  onClose: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
}

interface Instruction {
  instruction: string;
  distance: number;
  maneuver?: {
    type: string;
    modifier?: string;
  };
}

const GOLD = "#B37C1C";
const IVORY = "#FFFBF2";
const NAVY = "#0F1A35";

export const EnhancedTopNavigationHUD = ({
  destination,
  currentLocation,
  onClose,
  soundEnabled,
  onSoundToggle,
}: EnhancedTopNavigationHUDProps) => {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const route = await mapboxRoutingService.getFullRoute(
          currentLocation.lng,
          currentLocation.lat,
          destination.lng,
          destination.lat
        );

        if (route && route.legs && route.legs[0]) {
          const leg = route.legs[0];
          const steps = leg.steps || [];

          const instructionsList = steps.map((step: any) => ({
            instruction: step.maneuver?.instruction || step.name || "Continue",
            distance: step.distance,
            maneuver: step.maneuver,
          }));

          setInstructions(instructionsList);
        }
      } catch (err) {
        console.error("Error fetching route:", err);
      }
      setLoading(false);
    };

    fetchRoute();
  }, [currentLocation, destination]);

  const currentInstruction = instructions[currentStepIndex];

  const getManeuverArrow = () => {
    if (!currentInstruction?.maneuver) return null;

    const type = currentInstruction.maneuver.type?.toLowerCase();
    const modifier = currentInstruction.maneuver.modifier?.toLowerCase();

    const arrowStyles = {
      width: "36px",
      height: "36px",
      viewBox: "0 0 48 48",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    };

    if (type === "turn" && modifier?.includes("left")) {
      return (
        <svg {...arrowStyles} style={{ transform: "scaleX(-1)" }}>
          <path
            d="M 12 24 L 36 24 M 24 12 L 36 24 L 24 36"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (type === "turn" && modifier?.includes("right")) {
      return (
        <svg {...arrowStyles}>
          <path
            d="M 36 24 L 12 24 M 24 12 L 12 24 L 24 36"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // straight/continue
    return (
      <svg {...arrowStyles}>
        <path
          d="M 24 8 L 24 40 M 18 28 L 24 40 L 30 28"
          stroke={GOLD}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (loading || !currentInstruction) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: -120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -120, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md shadow-xl"
      style={{
        background: `linear-gradient(135deg, ${NAVY}dd 0%, #1a2a4add 100%)`,
        borderBottom: `2px solid ${GOLD}`,
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3 sm:gap-4">
        {/* Close button */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all"
          style={{ background: `${GOLD}20`, color: GOLD }}
        >
          <ChevronLeft size={20} />
        </motion.button>

        {/* Maneuver arrow */}
        <div
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg"
          style={{ background: `${GOLD}20` }}
        >
          {getManeuverArrow()}
        </div>

        {/* Instruction and distance */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase" style={{ color: GOLD }}>
            {currentInstruction.maneuver?.type || "Continue"}
          </p>
          <p
            className="text-sm font-semibold leading-snug truncate"
            style={{ color: IVORY }}
          >
            {currentInstruction.instruction}
          </p>
        </div>

        {/* Distance badge */}
        <div
          className="flex-shrink-0 px-3 py-2 rounded-lg text-center"
          style={{ background: `${GOLD}20`, minWidth: "60px" }}
        >
          <p className="text-xs" style={{ color: `${IVORY}80` }}>
            📍
          </p>
          <p className="text-sm font-bold" style={{ color: GOLD }}>
            {formatDistance(currentInstruction.distance)}
          </p>
        </div>

        {/* Sound toggle */}
        <motion.button
          onClick={onSoundToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: soundEnabled ? GOLD : `${GOLD}20`,
            color: soundEnabled ? NAVY : GOLD,
          }}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </motion.button>
      </div>

      {/* Progress bar for current instruction */}
      <motion.div
        className="h-1"
        style={{ backgroundColor: GOLD }}
        initial={{ width: 0 }}
        animate={{
          width: `${((currentStepIndex + 1) / instructions.length) * 100}%`,
        }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );
};

export default EnhancedTopNavigationHUD;
