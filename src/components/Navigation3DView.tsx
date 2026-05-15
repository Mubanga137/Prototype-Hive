import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import MapboxMapComponent from '@/components/Map/MapboxMapComponent';
import ChevronMarker from '@/components/Map/ChevronMarker';
import DestinationMarker from '@/components/Map/DestinationMarker';
import { MapRef, Source, Layer } from 'react-map-gl';
import { mapboxRoutingService } from '@/services/mapboxRoutingService';

interface Navigation3DViewProps {
  userLat: number;
  userLng: number;
  userBearing: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupName?: string;
  dropoffName?: string;
  isPickupDone?: boolean;
  onClose: () => void;
  onStepUpdate?: (stepIndex: number, instruction: string) => void;
}

interface Instruction {
  instruction: string;
  distance: number;
  maneuver?: {
    type: string;
    modifier?: string;
  };
}

const GOLD = '#B37C1C';
const NAVY = '#0F1A35';
const IVORY = '#FFFBF2';

export const Navigation3DView = ({
  userLat,
  userLng,
  userBearing,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupName = 'Pickup',
  dropoffName = 'Drop-off',
  isPickupDone = false,
  onClose,
  onStepUpdate,
}: Navigation3DViewProps) => {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch route and instructions
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const startLng = isPickupDone ? pickupLng : userLng;
        const startLat = isPickupDone ? pickupLat : userLat;
        const endLng = dropoffLng;
        const endLat = dropoffLat;

        const route = await mapboxRoutingService.getRoute(
          [startLng, startLat],
          [endLng, endLat]
        );

        if (route && route.legs && route.legs[0]) {
          const leg = route.legs[0];
          const steps = leg.steps || [];

          const instructionsList = steps.map((step: any) => ({
            instruction: step.maneuver?.instruction || step.name || 'Continue',
            distance: step.distance,
            maneuver: step.maneuver,
          }));

          setInstructions(instructionsList);
          setRouteGeometry(
            route.geometry?.coordinates as [number, number][] || null
          );
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      }
      setLoading(false);
    };

    fetchRoute();
  }, [userLat, userLng, pickupLat, pickupLng, dropoffLat, dropoffLng, isPickupDone]);

  // Update current step based on proximity
  useEffect(() => {
    if (instructions.length > 0 && onStepUpdate) {
      const instruction = instructions[currentStepIndex];
      onStepUpdate(currentStepIndex, instruction.instruction);
    }
  }, [currentStepIndex, instructions, onStepUpdate]);

  const currentInstruction = instructions[currentStepIndex];

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getManeuverArrow = () => {
    if (!currentInstruction?.maneuver) return null;

    const type = currentInstruction.maneuver.type?.toLowerCase();
    const modifier = currentInstruction.maneuver.modifier?.toLowerCase();

    const arrowProps = {
      width: '48px',
      height: '48px',
      viewBox: '0 0 48 48',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    };

    if (type === 'turn' && modifier?.includes('left')) {
      return (
        <svg {...arrowProps} style={{ transform: 'scaleX(-1)' }}>
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

    if (type === 'turn' && modifier?.includes('right')) {
      return (
        <svg {...arrowProps}>
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

    // Default: straight
    return (
      <svg {...arrowProps}>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* 3D Pitched Map - Full Screen */}
      <div className="flex-1 relative overflow-hidden">
        <MapboxMapComponent
          initialLat={userLat}
          initialLng={userLng}
          initialZoom={18}
          pitch={70}
          bearing={userBearing}
          style="mapbox://styles/mapbox/navigation-night-v1"
          disableControls={true}
        >
          {/* User position marker - gold arrow */}
          <ChevronMarker
            lng={userLng}
            lat={userLat}
            bearing={userBearing}
            label="You"
          />

          {/* Destination marker - gold lollipop pin */}
          {!isPickupDone && (
            <DestinationMarker
              lng={pickupLng}
              lat={pickupLat}
              label={pickupName}
              type="pickup"
            />
          )}

          <DestinationMarker
            lng={dropoffLng}
            lat={dropoffLat}
            label={dropoffName}
            type="dropoff"
          />

          {/* Route polyline */}
          {routeGeometry && (
            <Source
              id="route"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeGeometry,
                },
              }}
            >
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': GOLD,
                  'line-width': 5,
                  'line-opacity': 0.9,
                  'line-blur': 1,
                }}
              />
            </Source>
          )}
        </MapboxMapComponent>

        {/* Close button */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{
            background: GOLD,
            color: NAVY,
          }}
        >
          <X size={24} />
        </motion.button>

        {/* Sound toggle */}
        <motion.button
          onClick={() => setSoundEnabled(!soundEnabled)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-4 left-4 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{
            background: soundEnabled ? GOLD : `${GOLD}50`,
            color: NAVY,
          }}
        >
          {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </motion.button>
      </div>

      {/* Top Navigation HUD - Turn-by-turn guidance */}
      <AnimatePresence>
        {currentInstruction && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="px-4 py-3 flex items-center gap-4 backdrop-blur-md shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, #1a2a4a 100%)`,
              borderBottom: `2px solid ${GOLD}`,
            }}
          >
            {/* Maneuver arrow */}
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg" style={{ background: `${GOLD}20` }}>
              {getManeuverArrow()}
            </div>

            {/* Instruction text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase" style={{ color: GOLD }}>
                {currentInstruction.maneuver?.type || 'Continue'}
              </p>
              <p className="text-sm font-semibold leading-snug" style={{ color: IVORY }}>
                {currentInstruction.instruction}
              </p>
            </div>

            {/* Distance */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs" style={{ color: `${IVORY}80` }}>
                DISTANCE
              </p>
              <p className="text-lg font-bold" style={{ color: GOLD }}>
                {formatDistance(currentInstruction.distance)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD - Step navigation and summary */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="px-4 py-4 backdrop-blur-md shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${NAVY}dd 0%, #1a2a4add 100%)`,
          borderTop: `2px solid ${GOLD}`,
        }}
      >
        {/* Step counter and navigation */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase" style={{ color: `${IVORY}80` }}>
            Step {currentStepIndex + 1} of {instructions.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="w-8 h-8 rounded flex items-center justify-center transition-all disabled:opacity-20"
              style={{ background: `${GOLD}30`, color: GOLD }}
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={() =>
                setCurrentStepIndex(
                  Math.min(instructions.length - 1, currentStepIndex + 1)
                )
              }
              disabled={currentStepIndex === instructions.length - 1}
              className="w-8 h-8 rounded flex items-center justify-center transition-all disabled:opacity-20"
              style={{ background: `${GOLD}30`, color: GOLD }}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Route info grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ background: `${GOLD}15` }}>
            <p className="text-xs" style={{ color: `${IVORY}80` }}>
              FROM
            </p>
            <p className="text-xs font-bold" style={{ color: IVORY }}>
              {isPickupDone ? pickupName : 'Your Location'}
            </p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: `${GOLD}15` }}>
            <p className="text-xs" style={{ color: `${IVORY}80` }}>
              TO
            </p>
            <p className="text-xs font-bold" style={{ color: IVORY }}>
              {dropoffName}
            </p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: `${GOLD}15` }}>
            <p className="text-xs" style={{ color: `${IVORY}80` }}>
              STATUS
            </p>
            <p className="text-xs font-bold" style={{ color: GOLD }}>
              🗺️ NAVIGATING
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Navigation3DView;
