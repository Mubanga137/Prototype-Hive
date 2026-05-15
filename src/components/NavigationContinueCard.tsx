import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Clock, Navigation2, ChevronRight, AlertCircle } from 'lucide-react';
import { mapboxRoutingService } from '@/services/mapboxRoutingService';

interface NavigationContinueCardProps {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupName?: string;
  dropoffName?: string;
  onNavigateClick?: () => void;
  isLoading?: boolean;
}

interface RouteData {
  distance: number; // in meters
  duration: number; // in seconds
  instructions: Array<{
    instruction: string;
    distance: number;
    bearing: number;
    maneuver?: {
      type: string;
      modifier?: string;
    };
  }>;
}

const GOLD = '#B37C1C';
const NAVY = '#0F1A35';
const IVORY = '#FFFBF2';

export const NavigationContinueCard = ({
  pickupLat = -15.3875,
  pickupLng = 28.3228,
  dropoffLat = -15.4,
  dropoffLng = 28.35,
  pickupName = 'Pickup Location',
  dropoffName = 'Drop-off Location',
  onNavigateClick,
  isLoading = false,
}: NavigationContinueCardProps) => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);

  useEffect(() => {
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const route = await mapboxRoutingService.getRoute(
          pickupLng,
          pickupLat,
          dropoffLng,
          dropoffLat
        );

        if (route) {
          // For getRoute, we need to use getFullRoute to get steps
          const fullRoute = await mapboxRoutingService.getFullRoute(
            pickupLng,
            pickupLat,
            dropoffLng,
            dropoffLat
          );
          if (!fullRoute) return;

          const leg = fullRoute.legs?.[0];
          const steps = leg?.steps || [];
          
          const instructions = steps.map((step: any) => ({
            instruction: step.maneuver?.instruction || step.name || 'Continue',
            distance: step.distance,
            bearing: step.maneuver?.bearing || 0,
            maneuver: step.maneuver,
          }));

          setRouteData({
            distance: fullRoute.durationSeconds ? parseInt(fullRoute.distance) * 1000 : 2500,
            duration: fullRoute.durationSeconds || 900,
            instructions,
          });
        }
      } catch (err) {
        console.error('Error fetching route:', err);
        setError('Unable to fetch directions');
        // Fallback mock data
        setRouteData({
          distance: 2500,
          duration: 900,
          instructions: [
            {
              instruction: 'Head northeast on Great North Rd',
              distance: 500,
              bearing: 45,
              maneuver: { type: 'straight' },
            },
            {
              instruction: 'Turn right on Cairo Rd',
              distance: 800,
              bearing: 90,
              maneuver: { type: 'turn', modifier: 'right' },
            },
            {
              instruction: 'Turn left on Kafue Rd',
              distance: 1200,
              bearing: 0,
              maneuver: { type: 'turn', modifier: 'left' },
            },
          ],
        });
      }
      setLoading(false);
    };

    fetchRoute();
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const currentInstruction = routeData?.instructions[currentInstructionIndex];

  // Maneuver arrow icons
  const getManeuverIcon = () => {
    if (!currentInstruction?.maneuver) return null;
    
    const type = currentInstruction.maneuver.type?.toLowerCase();
    const modifier = currentInstruction.maneuver.modifier?.toLowerCase();

    const iconProps = {
      size: 24,
      color: GOLD,
      strokeWidth: 2.5,
    };

    if (type === 'turn' && modifier?.includes('left')) {
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 16L24 16M16 8L8 16L16 24" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scaleX(-1) translate(-32 0)" />
        </svg>
      );
    }

    if (type === 'turn' && modifier?.includes('right')) {
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 16L8 16M16 8L24 16L16 24" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // Default: straight/continue
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4L16 28M11 18L16 28L21 18" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1a2a4a 100%)`,
        border: `2px solid ${GOLD}`,
      }}
    >
      {/* Header with logo and title */}
      <div className="px-6 py-4 border-b" style={{ borderColor: GOLD }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: GOLD }}
          >
            <Navigation size={20} color={NAVY} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: IVORY }}>
              CONTINUE YOUR JOURNEY
            </h3>
            <p className="text-xs" style={{ color: `${IVORY}99` }}>
              {error ? '⚠️ Navigation' : '🗺️ Active Route'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 py-5 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <>
            {/* Route summary - distance and ETA */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className="rounded-lg p-3 flex flex-col items-center justify-center"
                style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}50` }}
              >
                <p className="text-xs" style={{ color: `${GOLD}99` }}>
                  Distance
                </p>
                <p className="text-lg font-bold" style={{ color: GOLD }}>
                  {routeData ? formatDistance(routeData.distance) : '-'}
                </p>
              </motion.div>
              <motion.div
                className="rounded-lg p-3 flex flex-col items-center justify-center"
                style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}50` }}
              >
                <p className="text-xs flex items-center gap-1" style={{ color: `${GOLD}99` }}>
                  <Clock size={12} /> ETA
                </p>
                <p className="text-lg font-bold" style={{ color: GOLD }}>
                  {routeData ? formatDuration(routeData.duration) : '-'}
                </p>
              </motion.div>
            </div>

            {/* Pickup and Dropoff locations */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                {/* Gold lollipop pin for pickup */}
                <svg
                  width="28"
                  height="36"
                  viewBox="0 0 28 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F4D4A8" />
                      <stop offset="100%" stopColor="#B37C1C" />
                    </linearGradient>
                  </defs>
                  <line x1="14" y1="22" x2="14" y2="34" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="14" cy="14" r="12" fill="url(#goldGrad1)" />
                  <circle cx="14" cy="14" r="8" fill={IVORY} stroke={GOLD} strokeWidth="1" />
                  <circle cx="14" cy="14" r="4" fill={GOLD} />
                </svg>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: `${IVORY}80` }}>
                    PICKUP
                  </p>
                  <p className="text-sm font-bold" style={{ color: IVORY }}>
                    {pickupName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {/* Gold lollipop pin for dropoff */}
                <svg
                  width="28"
                  height="36"
                  viewBox="0 0 28 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F4D4A8" />
                      <stop offset="100%" stopColor="#B37C1C" />
                    </linearGradient>
                  </defs>
                  <line x1="14" y1="22" x2="14" y2="34" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="14" cy="14" r="12" fill="url(#goldGrad2)" />
                  <circle cx="14" cy="14" r="8" fill={IVORY} stroke={GOLD} strokeWidth="1" />
                  <circle cx="14" cy="14" r="5" fill={GOLD} opacity="0.7" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: `${IVORY}80` }}>
                    DROP-OFF
                  </p>
                  <p className="text-sm font-bold" style={{ color: IVORY }}>
                    {dropoffName}
                  </p>
                </div>
              </div>
            </div>

            {/* Directional Guidance */}
            {routeData && routeData.instructions.length > 0 && (
              <motion.div
                className="rounded-lg p-4 flex items-start gap-3"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}15 0%, ${GOLD}05 100%)`,
                  border: `1px solid ${GOLD}40`,
                }}
              >
                <div className="flex-shrink-0">
                  {getManeuverIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase font-bold" style={{ color: GOLD }}>
                    Next Step ({currentInstructionIndex + 1} of {routeData.instructions.length})
                  </p>
                  <p className="text-sm font-semibold mt-1 leading-snug" style={{ color: IVORY }}>
                    {currentInstruction?.instruction}
                  </p>
                  <p className="text-xs mt-2" style={{ color: `${IVORY}80` }}>
                    📍 {formatDistance(currentInstruction?.distance || 0)}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step navigation */}
            {routeData && routeData.instructions.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentInstructionIndex(Math.max(0, currentInstructionIndex - 1))
                  }
                  disabled={currentInstructionIndex === 0}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                  style={{
                    background: `${GOLD}20`,
                    color: GOLD,
                    border: `1px solid ${GOLD}40`,
                  }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() =>
                    setCurrentInstructionIndex(
                      Math.min(
                        routeData.instructions.length - 1,
                        currentInstructionIndex + 1
                      )
                    )
                  }
                  disabled={currentInstructionIndex === routeData.instructions.length - 1}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                  style={{
                    background: `${GOLD}20`,
                    color: GOLD,
                    border: `1px solid ${GOLD}40`,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Button */}
      <motion.button
        onClick={onNavigateClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, #a3691a 100%)`,
          color: NAVY,
          borderTop: `1px solid ${GOLD}`,
        }}
      >
        <Navigation2 size={18} />
        START IN-APP NAVIGATION
        <ChevronRight size={18} />
      </motion.button>
    </motion.div>
  );
};

export default NavigationContinueCard;
