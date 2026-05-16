import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import MapboxMapComponent from '@/components/Map/MapboxMapComponent';
import { MapRef, Source, Layer, Marker } from 'react-map-gl';
import { mapboxRoutingService } from '@/services/mapboxRoutingService';
import { GoldArrowheadIcon, RedLocationPinIcon } from '@/components/Map/ExactNavigationIcons';

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
  const mapRef = useRef<MapRef>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Fetch route and instructions
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const startLng = isPickupDone ? pickupLng : userLng;
        const startLat = isPickupDone ? pickupLat : userLat;
        const endLng = dropoffLng;
        const endLat = dropoffLat;

        const route = await mapboxRoutingService.getFullRoute(
          startLng,
          startLat,
          endLng,
          endLat
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
          setRouteGeometry(route.coordinates);
          setTotalDistance(route.distance ? parseInt(route.distance) * 1000 : leg.distance || 0);
          setTotalDuration(route.durationSeconds || leg.duration || 0);
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full border-4 mx-auto mb-4"
                style={{
                  borderColor: '#374151',
                  borderTopColor: GOLD,
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
              <p style={{ color: IVORY }}>Loading navigation...</p>
            </div>
          </div>
        ) : null}
        <div style={{ width: '100%', height: '100%' }}>
          <MapboxMapComponent
            initialLat={userLat}
            initialLng={userLng}
            initialZoom={18}
            pitch={70}
            bearing={userBearing}
            style="mapbox://styles/mapbox/navigation-night-v1"
            disableControls={true}
          >
            {/* User position marker - exact gold arrowhead */}
            <Marker longitude={userLng} latitude={userLat} anchor="center">
              <div className="flex items-center justify-center">
                <GoldArrowheadIcon bearing={userBearing} size={48} />
              </div>
            </Marker>

            {/* Destination marker - exact red location pin */}
            {!isPickupDone && (
              <Marker longitude={pickupLng} latitude={pickupLat} anchor="bottom">
                <div className="flex flex-col items-center">
                  <RedLocationPinIcon size={52} type="pickup" />
                  {pickupName && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full mt-2 bg-[#0F1A35] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border"
                      style={{ borderColor: GOLD }}
                    >
                      {pickupName}
                    </motion.div>
                  )}
                </div>
              </Marker>
            )}

            <Marker longitude={dropoffLng} latitude={dropoffLat} anchor="bottom">
              <div className="flex flex-col items-center">
                <RedLocationPinIcon size={52} type="dropoff" />
                {dropoffName && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 bg-[#0F1A35] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border"
                    style={{ borderColor: GOLD }}
                  >
                    {dropoffName}
                  </motion.div>
                )}
              </div>
            </Marker>

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
        </div>

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
            <div
              className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg"
              style={{ background: `${GOLD}20` }}
            >
              {getManeuverArrow()}
            </div>

            {/* Instruction text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase" style={{ color: GOLD }}>
                {currentInstruction.maneuver?.type || 'Continue'}
              </p>
              <p
                className="text-sm font-semibold leading-snug truncate"
                style={{ color: IVORY }}
              >
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

      {/* Bottom Ivory Panel - ETA, Distance, Routing & Directional Guidance */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="px-4 py-6 shadow-2xl"
        style={{
          background: IVORY,
          borderTop: `2px solid ${GOLD}`,
        }}
      >
        {/* Main routing info - ETA and Distance */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase" style={{ color: NAVY }}>
              Estimated Time of Arrival
            </p>
            <p className="text-2xl font-bold" style={{ color: GOLD }}>
              {formatDuration(totalDuration)}
            </p>
          </div>
          <div className="w-px h-12" style={{ background: `${NAVY}20` }}></div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold uppercase" style={{ color: NAVY }}>
              Total Distance
            </p>
            <p className="text-2xl font-bold" style={{ color: GOLD }}>
              {formatDistance(totalDistance)}
            </p>
          </div>
        </div>

        {/* Current directional guidance */}
        {currentInstruction && (
          <motion.div
            className="rounded-lg p-3 mb-4 flex items-start gap-3"
            style={{
              background: `${GOLD}15`,
              border: `1px solid ${GOLD}40`,
            }}
          >
            <div className="flex-shrink-0 text-lg">{getManeuverArrow()}</div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase" style={{ color: GOLD }}>
                Next Direction
              </p>
              <p
                className="text-sm font-semibold leading-tight mt-1"
                style={{ color: NAVY }}
              >
                {currentInstruction.instruction}
              </p>
              <p className="text-xs mt-2" style={{ color: `${NAVY}70` }}>
                📍 {formatDistance(currentInstruction.distance)} ahead
              </p>
            </div>
          </motion.div>
        )}

        {/* Step navigation */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase" style={{ color: `${NAVY}60` }}>
            Step {currentStepIndex + 1} of {instructions.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-30"
              style={{
                background: GOLD,
                color: NAVY,
              }}
            >
              ← Prev
            </button>
            <button
              onClick={() =>
                setCurrentStepIndex(
                  Math.min(instructions.length - 1, currentStepIndex + 1)
                )
              }
              disabled={currentStepIndex === instructions.length - 1}
              className="px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-30"
              style={{
                background: GOLD,
                color: NAVY,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Navigation3DView;
