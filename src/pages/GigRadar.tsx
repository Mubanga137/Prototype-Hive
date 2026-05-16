import { useEffect, useState, useRef } from "react";
import { MapRef, Source, Layer } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import { useOrderClustering } from "@/hooks/gig-radar/useOrderClustering";
import { useMixedFleetRole } from "@/hooks/useMixedFleetRole";
import GigRadarSidebar from "@/components/gig-radar/layout/GigRadarSidebar";
import { BountyCard } from "@/components/gig-radar/BountyCard";
import { CommandCenter } from "@/components/gig-radar/CommandCenter";
import { GoOnlineOverlay } from "@/components/gig-radar/GoOnlineOverlay";
import { AvailableBountiesDrawer } from "@/components/gig-radar/AvailableBountiesDrawer";
import { EnhancedMissionHUD } from "@/components/gig-radar/EnhancedMissionHUD";
import { MissionControlPanel } from "@/components/gig-radar/MissionControlPanel";
import { TopNavigationHUD } from "@/components/gig-radar/TopNavigationHUD";
import { Menu, MapPin, Zap, Phone, PhoneOff, X, ChevronRight, MapPinned, Lightbulb, Car, Footprints, ShieldCheck } from "lucide-react";
import HoneycombBackground from "@/components/HoneycombBackground";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { BatchedOrder } from "@/utils/orderClustering";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MapboxMapComponent from "@/components/Map/MapboxMapComponent";
import ChevronMarker from "@/components/Map/ChevronMarker";
import DestinationMarker from "@/components/Map/DestinationMarker";
import { mapboxRoutingService, Leg } from "@/services/mapboxRoutingService";
import { optimizeRoutePath, formatCoordinatesForMapbox } from "@/utils/routeOptimizationV2";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;
const STEP_PROXIMITY_THRESHOLD = 200; // meters - auto-advance when within 200m

// Helper: Calculate distance between two points (Haversine formula in meters)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Get maneuver SVG arrow icon based on turn type
function getManeuverArrow(maneuverType: string, modifier?: string): JSX.Element {
  const type = maneuverType?.toLowerCase() || 'straight';
  const mod = modifier?.toLowerCase() || '';

  const arrowStyles = {
    width: '36px',
    height: '36px',
    viewBox: '0 0 48 48',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (type === 'left' || (type === 'turn' && mod.includes('left'))) {
    return (
      <svg {...arrowStyles} style={{ ...arrowStyles, transform: 'scaleX(-1)' }}>
        <path d="M 12 24 L 36 24 M 24 12 L 36 24 L 24 36" stroke="#B37C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'right' || (type === 'turn' && mod.includes('right'))) {
    return (
      <svg {...arrowStyles}>
        <path d="M 36 24 L 12 24 M 24 12 L 12 24 L 24 36" stroke="#B37C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'uturn') {
    return (
      <svg {...arrowStyles}>
        <path d="M 12 24 Q 12 12 24 12 Q 36 12 36 24 M 30 18 L 36 24 L 30 30" stroke="#B37C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // straight / continue / merge / onto / other
  return (
    <svg {...arrowStyles}>
      <path d="M 24 8 L 24 40 M 18 28 L 24 40 L 30 28" stroke="#B37C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface SimulatedBounty {
  id: string;
  lat: number;
  lng: number;
  pickup: string;
  distance: string;
  time: string;
  price: string;
  type: "delivery" | "runner" | "task";
  sme_lat?: number;
  sme_lng?: number;
  customer_lat?: number;
  customer_lng?: number;
  routeETA?: string;
  routeDistance?: string;
}

const GigRadar = () => {
  const { user, profile } = useAuth();
  const { isRider, isRunner } = useMixedFleetRole();
  const mapRef = useRef<MapRef>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(window.innerWidth >= 1024);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<SimulatedBounty | null>(null);
  const [routeETAMap, setRouteETAMap] = useState<Map<string, { eta: string; distance: string }>>(new Map());
  const [selectedBatch, setSelectedBatch] = useState<BatchedOrder | null>(null);
  const [showActiveNav, setShowActiveNav] = useState(false);
  const [viewMode, setViewMode] = useState<"bounties" | "batches">("batches");
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [claimedBatch, setClaimedBatch] = useState<BatchedOrder | null>(null);
  const [isInAppNavigating, setIsInAppNavigating] = useState(false);
  const [userBearing, setUserBearing] = useState(0); // 0-360 degrees
  const [legData, setLegData] = useState<Leg[]>([]); // Mapbox leg data for ETA display
  const [nextInstruction, setNextInstruction] = useState(""); // Turn-by-turn instruction
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track which turn instruction we're on
  const [currentManeuver, setCurrentManeuver] = useState<{ type?: string; modifier?: string } | null>(null); // Current maneuver details
  const [distanceTraveled, setDistanceTraveled] = useState(0); // Distance traveled in meters
  const [totalRouteDistance, setTotalRouteDistance] = useState(0); // Total route distance in meters
  const [totalRouteDuration, setTotalRouteDuration] = useState(0); // Total route duration in seconds
  const [isRecenterActive, setIsRecenterActive] = useState(false); // Auto-recenter flag - false = free-pan enabled
  const [routeSteps, setRouteSteps] = useState<any[]>([]); // All turn-by-turn steps from route
  const [viewState, setViewState] = useState({
    longitude: LUSAKA_CENTER.lng,
    latitude: LUSAKA_CENTER.lat,
    zoom: 17.5,
    bearing: 0,
    pitch: 0,
  });

  const { location, isOnline, setIsOnline, locationStatus } = useLocationService();
  const { gigs, acceptGig } = useGigSimulation(location, isOnline);
  const { batches, isLoading: isClustering, fetchAndClusterOrders } = useOrderClustering();

  const mapCenter = location || LUSAKA_CENTER;
  const userRole = user?.role || "gig_worker";

  // Track device heading/bearing for chevron rotation and camera bearing
  useEffect(() => {
    if (!isInAppNavigating) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Update bearing from device compass
        if (position.coords.heading !== null && position.coords.heading !== undefined) {
          const newHeading = position.coords.heading;
          setUserBearing(newHeading);

          // Update viewState bearing to follow route direction (bird's-eye effect)
          setViewState(prev => ({
            ...prev,
            bearing: newHeading,
          }));
        }
      },
      (error) => {
        console.warn("[GigRadar] Geolocation heading error:", error);
        // Fallback: try device orientation API
        if (window.DeviceOrientationEvent) {
          const handleOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha !== null && event.alpha !== undefined) {
              const heading = (360 - event.alpha) % 360;
              setUserBearing(heading);
              setViewState(prev => ({
                ...prev,
                bearing: heading,
              }));
            }
          };
          window.addEventListener('deviceorientation', handleOrientation);
          return () => window.removeEventListener('deviceorientation', handleOrientation);
        }
      },
      { enableHighAccuracy: true, maximumAge: 250 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isInAppNavigating]);

  useEffect(() => {
    if (isOnline && location) {
      fetchAndClusterOrders(location);
      const interval = setInterval(() => {
        fetchAndClusterOrders(location);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isOnline, location, fetchAndClusterOrders]);

  const handleClaimBatch = async (batch: BatchedOrder) => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // Set batch immediately for optimistic UI update
      setClaimedBatch(batch);
      setShowActiveNav(true);

      // Attempt to update DB, but don't block UI
      const { error } = await supabase
        .from("orders")
        .update({
          status: "in_transit",
          rider_id: user.id,
        })
        .in("id", batch.orderIds)
        .abortSignal(AbortSignal.timeout(8000));

      if (error) {
        // Log error but don't fail - UI is already updated
        console.warn("[GigRadar] DB update failed (non-blocking):", error);
        toast.success(`✨ Batch claimed! ${batch.orderCount} orders ready.`);
      } else {
        toast.success(`✨ Batch claimed! ${batch.orderCount} orders in_transit.`);
      }
    } catch (err: any) {
      // Still show success - batch is already claimed in UI
      const isTimeout = err?.name === "AbortError" || err?.message?.includes("timeout");
      if (isTimeout) {
        console.warn("[GigRadar] Claim timeout (non-blocking):", err);
        toast.success(`✨ Batch claimed! ${batch.orderCount} orders ready.`);
      } else {
        const message = err instanceof Error ? err.message : "Failed to claim batch";
        console.error("[GigRadar] Claim error:", message);
        toast.error(message);
      }
    }
  };

  const bounties: SimulatedBounty[] = gigs.map((gig, idx) => {
    const sme_lat = gig.lat + (Math.random() - 0.5) * 0.02;
    const sme_lng = gig.lng + (Math.random() - 0.5) * 0.02;
    const customer_lat = gig.lat + (Math.random() - 0.5) * 0.03;
    const customer_lng = gig.lng + (Math.random() - 0.5) * 0.03;

    return {
      id: gig.id,
      lat: gig.lat,
      lng: gig.lng,
      pickup: `📍 ${["Central Market", "Lusaka Tech Hub", "Embassy Area", "Kabulonga"][idx % 4]}`,
      distance: `${(Math.random() * 8 + 0.5).toFixed(1)} km`,
      time: `${Math.floor(Math.random() * 20 + 10)} min`,
      price: gig.price,
      type: gig.type,
      sme_lat,
      sme_lng,
      customer_lat,
      customer_lng,
    };
  });

  // Fetch Mapbox route when batch is claimed
  useEffect(() => {
    if (!claimedBatch || !location) {
      setRouteGeometry(null);
      setLegData([]);
      setNextInstruction("");
      return;
    }

    // Cancel previous request if still pending
    if (routeAbortControllerRef.current) {
      routeAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    routeAbortControllerRef.current = controller;

    const fetchRoute = async () => {
      try {
        const pickupLat = claimedBatch.pickupLoc?.lat || LUSAKA_CENTER.lat;
        const pickupLng = claimedBatch.pickupLoc?.lng || LUSAKA_CENTER.lng;

        // Build optimized waypoint sequence using nearest-neighbor for multi-dropoff batches
        const optimizedCoords = optimizeRoutePath(
          { lat: location.lat, lng: location.lng },
          [{ id: "pickup", lat: pickupLat, lng: pickupLng }],
          claimedBatch.dropoffs.map((d, idx) => ({
            id: d.orderId || `dropoff-${idx}`,
            lat: d.loc.lat,
            lng: d.loc.lng,
          }))
        );

        // Check if request was cancelled
        if (controller.signal.aborted) return;

        // Fetch single combined route from Mapbox with all waypoints (String of Pearls)
        const fullRoute = await mapboxRoutingService.getMultiWaypointRoute(optimizedCoords);

        // Check if request was cancelled
        if (controller.signal.aborted) return;

        if (!fullRoute) throw new Error("No route found");

        setRouteGeometry(fullRoute.coordinates as [number, number][]);
        setLegData(fullRoute.legs);
        setTotalRouteDistance(fullRoute.distance); // Store total distance in meters
        setTotalRouteDuration(fullRoute.durationSeconds); // Store total duration in seconds
        setDistanceTraveled(0); // Reset progress
        setCurrentStepIndex(0); // Reset step tracker

        // Extract ALL steps from first leg for turn-by-turn tracking
        const allSteps = fullRoute.legs[0]?.steps || [];
        setRouteSteps(allSteps);

        // Extract and display first instruction
        if (allSteps.length > 0) {
          const firstStep = allSteps[0];
          const stepName = firstStep.name || "Continue";
          const stepDistance = Math.round(firstStep.distance);
          let instruction = stepName;
          if (stepDistance > 0) {
            instruction += ` - ${stepDistance > 1000 ? (stepDistance / 1000).toFixed(1) + ' km' : stepDistance + 'm'}`;
          }
          setNextInstruction(instruction);
          if (firstStep.maneuver) {
            setCurrentManeuver({
              type: firstStep.maneuver.type,
              modifier: firstStep.maneuver.modifier,
            });
          }
        }

        const totalMinutes = Math.ceil(fullRoute.durationSeconds / 60);
        const totalDistanceKm = (fullRoute.distance / 1000).toFixed(1);

        setRouteETAMap(new Map([[claimedBatch.clusterId, {
          eta: `⏱️ ETA: ${totalMinutes}m`,
          distance: `📏 ${totalDistanceKm}km`
        }]]));
      } catch (error: any) {
        // Don't show error for aborted requests
        if (error?.name === "AbortError") {
          console.debug("[GigRadar] Route fetch cancelled");
          return;
        }
        console.warn("[GigRadar] Mapbox route error:", error);
      }
    };

    fetchRoute();

    return () => {
      controller.abort();
      routeAbortControllerRef.current = null;
    };
  }, [claimedBatch, location]);

  // Smart auto-zoom when route is resolved
  useEffect(() => {
    if (mapRef.current && routeGeometry && routeGeometry.length > 0) {
      const bounds = routeGeometry.reduce((acc, [lng, lat]) => {
        return {
          minLng: Math.min(acc.minLng, lng),
          maxLng: Math.max(acc.maxLng, lng),
          minLat: Math.min(acc.minLat, lat),
          maxLat: Math.max(acc.maxLat, lat),
        };
      }, {
        minLng: routeGeometry[0][0],
        maxLng: routeGeometry[0][0],
        minLat: routeGeometry[0][1],
        maxLat: routeGeometry[0][1],
      });

      mapRef.current.fitBounds(
        [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
        { padding: 50, duration: 800 }
      );
    }
  }, [routeGeometry]);

  useEffect(() => {
    if (mapRef.current && location && isOnline && !routeGeometry) {
      mapRef.current.easeTo({
        center: [location.lng, location.lat],
        duration: 1000,
      });
    }
  }, [location, isOnline, routeGeometry]);

  // Sync map position to rider location (respect user's manual pitch choice)
  useEffect(() => {
    if (!isInAppNavigating || !location) return;

    // Update viewState center to follow rider, preserve pitch setting
    setViewState(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
    }));
  }, [location, isInAppNavigating]);

  // Track distance traveled from route geometry
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!isInAppNavigating || !location) return;

    if (lastLocationRef.current) {
      const segmentDistance = calculateDistance(
        lastLocationRef.current.lat,
        lastLocationRef.current.lng,
        location.lat,
        location.lng
      );
      if (segmentDistance > 0.1 && segmentDistance < 100) { // Filter out GPS noise & jumps
        setDistanceTraveled(prev => prev + segmentDistance);
      }
    }
    lastLocationRef.current = location;
  }, [location, isInAppNavigating]);

  // Smart step progression: when within 200m of the next maneuver, auto-advance to next instruction
  useEffect(() => {
    if (!isInAppNavigating || !location || routeSteps.length === 0) return;

    if (currentStepIndex >= routeSteps.length) return;

    const currentStep = routeSteps[currentStepIndex];
    if (!currentStep.maneuver?.location) return;

    const distanceToNextManeuver = calculateDistance(
      location.lat,
      location.lng,
      currentStep.maneuver.location[1],
      currentStep.maneuver.location[0]
    );

    if (distanceToNextManeuver <= STEP_PROXIMITY_THRESHOLD) {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx < routeSteps.length) {
        const nextStep = routeSteps[nextIdx];
        const stepName = nextStep.name || "Continue";
        const stepDistance = Math.round(nextStep.distance);
        let instruction = stepName;
        if (stepDistance > 0) {
          instruction += ` - ${stepDistance > 1000 ? (stepDistance / 1000).toFixed(1) + ' km' : stepDistance + 'm'}`;
        }
        setNextInstruction(instruction);
        if (nextStep.maneuver) {
          setCurrentManeuver({
            type: nextStep.maneuver.type,
            modifier: nextStep.maneuver.modifier,
          });
        }
        setCurrentStepIndex(nextIdx);
      }
    }
  }, [location, isInAppNavigating, currentStepIndex, routeSteps]);

  const handleAcceptBounty = (bountyId: string) => {
    acceptGig(bountyId);
    setSelectedBounty(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!bottomSheetRef.current) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (diff > 50 && !sheetExpanded) {
      setSheetExpanded(true);
    } else if (diff < -50 && sheetExpanded) {
      setSheetExpanded(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#FFFBF2" }}>
      <HoneycombBackground />

      {/* FULL-SCREEN IMMERSIVE NAVIGATION MODE */}
      {showActiveNav && claimedBatch && isInAppNavigating ? (
        <div className="fixed inset-0 w-screen h-screen z-50 flex flex-col">
          {/* Full-screen map - completely immersive with free-pan support */}
          <MapboxMapComponent
            ref={mapRef}
            initialLat={mapCenter.lat}
            initialLng={mapCenter.lng}
            initialZoom={17.5}
            style="mapbox://styles/mapbox/navigation-night-v1"
            disableControls={false}
            viewState={viewState}
            onMove={(newViewState) => setViewState(newViewState as any)}
          >
            {location && isOnline && (
              <ChevronMarker
                lng={location.lng}
                lat={location.lat}
                bearing={userBearing}
                label={undefined}
              />
            )}

            {/* Pickup marker */}
            {claimedBatch.pickupLoc && (
              <DestinationMarker
                lng={claimedBatch.pickupLoc.lng}
                lat={claimedBatch.pickupLoc.lat}
                label={claimedBatch.pickupSmeNam}
                type="pickup"
              />
            )}

            {/* All dropoff markers */}
            {claimedBatch.dropoffs.map((dropoff, idx) => (
              <DestinationMarker
                key={dropoff.orderId || `dropoff-${idx}`}
                lng={dropoff.loc.lng}
                lat={dropoff.loc.lat}
                label={`${idx + 1}. ${dropoff.customer}`}
                type="dropoff"
              />
            ))}

            {/* Route polyline */}
            {routeGeometry && routeGeometry.length > 0 && (
              <Source
                id="mission-route"
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: routeGeometry,
                  },
                  properties: {},
                }}
              >
                <Layer
                  id="mission-route-layer"
                  type="line"
                  paint={{
                    "line-color": "#B37C1C",
                    "line-width": 5,
                    "line-opacity": 0.9,
                  }}
                />
              </Source>
            )}
          </MapboxMapComponent>

          {/* Map Controls - Top Right: Zoom + 3D/2D Toggle */}
          <div className="absolute top-6 right-6 z-60 flex flex-col gap-2">
            {/* 3D/2D Toggle Button - Location Icon */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setViewState(prev => ({
                  ...prev,
                  pitch: prev.pitch === 0 ? 60 : 0,
                }));
                if (mapRef.current) {
                  mapRef.current.setPitch(viewState.pitch === 0 ? 60 : 0);
                }
              }}
              className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: '#B37C1C',
                color: '#FFFBF2',
              }}
              title={viewState.pitch === 0 ? 'Switch to 3D view' : 'Switch to 2D view'}
            >
              <MapPinned size={22} />
            </motion.button>
          </div>

          {/* Bottom Bar - ETA, Progress & Controls (Yango/Uber Style) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-60 rounded-t-3xl backdrop-blur-xl border-t shadow-2xl"
            style={{
              backgroundColor: 'rgba(255, 251, 242, 0.98)',
              borderColor: '#B37C1C',
              maxWidth: '100vw',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              paddingTop: '1.25rem',
              paddingLeft: '1.25rem',
              paddingRight: '1.25rem',
            }}
          >
            {/* Top Row: ETA & Exit Button */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #B37C1C 0%, #8B5A1A 100%)' }}>
                  <Car size={20} style={{ color: '#FFFBF2' }} />
                </div>
                <div className="min-w-0">
                  {totalRouteDuration > 0 && (
                    <>
                      <p className="text-2xl font-black leading-none" style={{ color: '#0F1A35' }}>
                        {Math.max(Math.ceil((totalRouteDuration - (distanceTraveled / 1.39)) / 60), 0)} <span className="text-lg font-bold opacity-70">min</span>
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#0F1A35/70' }}>
                        {totalRouteDistance > 0 ? ((totalRouteDistance - distanceTraveled) / 1000).toFixed(1) : '0'} km
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Exit Navigation Button */}
              <motion.button
                onClick={() => {
                  setIsInAppNavigating(false);
                  setShowActiveNav(true);
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="p-3 rounded-full transition-all flex-shrink-0 hover:shadow-lg"
                style={{
                  backgroundColor: '#F5F0E8',
                  border: '2px solid #E8DCC8',
                }}
              >
                <X size={22} style={{ color: '#0F1A35' }} strokeWidth={3} />
              </motion.button>
            </div>

            {/* Progress Track - Linked to distance traveled */}
            <div className="mb-5">
              <div className="h-2 rounded-full" style={{ backgroundColor: '#E8E0D0' }}>
                <motion.div
                  className="h-full rounded-full flex items-center justify-end pr-1"
                  style={{ backgroundColor: '#B37C1C' }}
                  animate={{ width: `${Math.min((distanceTraveled / totalRouteDistance) * 100, 100)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FFFBF2', boxShadow: '0 2px 8px rgba(179, 124, 28, 0.6)' }} />
                </motion.div>
              </div>
            </div>

            {/* Main Action Button - Gold Emphasis */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 12px 32px rgba(179, 124, 28, 0.5)' }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 mb-3"
              style={{
                backgroundColor: '#B37C1C',
                color: '#FFFBF2',
                boxShadow: '0 8px 24px rgba(179, 124, 28, 0.4)',
                letterSpacing: '0.5px',
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.5} />
              🔒 Verify Hand-Off OTP
            </motion.button>

            {/* Secondary Cancel Link */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsInAppNavigating(false);
                  setShowActiveNav(false);
                  setClaimedBatch(null);
                }}
                className="text-sm font-semibold transition-colors"
                style={{ color: '#0F1A35/60' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F1A35'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#0F1A35/60'}
              >
                Cancel Navigation
              </button>
            </div>
          </motion.div>
        </div>
      ) : showActiveNav && claimedBatch ? (
        /* NON-IMMERSIVE ACTIVE MISSION VIEW (pre-navigation) */
        <div className="flex-1 flex flex-col w-full h-screen overflow-hidden">
          {/* Top 70% - Map */}
          <div className="h-[70vh] relative overflow-hidden flex-shrink-0">
            <MapboxMapComponent
              ref={mapRef}
              initialLat={mapCenter.lat}
              initialLng={mapCenter.lng}
              initialZoom={16}
            >
              {location && isOnline && (
                <ChevronMarker
                  lng={location.lng}
                  lat={location.lat}
                  bearing={isInAppNavigating ? userBearing : 0}
                  label={isInAppNavigating ? "You" : undefined}
                />
              )}

              {/* Pickup marker */}
              {claimedBatch.pickupLoc && (
                <DestinationMarker
                  lng={claimedBatch.pickupLoc.lng}
                  lat={claimedBatch.pickupLoc.lat}
                  label={claimedBatch.pickupSmeNam}
                  type="pickup"
                />
              )}

              {/* All dropoff markers */}
              {claimedBatch.dropoffs.map((dropoff, idx) => (
                <DestinationMarker
                  key={dropoff.orderId || `dropoff-${idx}`}
                  lng={dropoff.loc.lng}
                  lat={dropoff.loc.lat}
                  label={`${idx + 1}. ${dropoff.customer}`}
                  type="dropoff"
                />
              ))}

              {/* Route polyline */}
              {routeGeometry && routeGeometry.length > 0 && (
                <Source
                  id="mission-route"
                  type="geojson"
                  data={{
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: routeGeometry,
                    },
                    properties: {},
                  }}
                >
                  <Layer
                    id="mission-route-layer"
                    type="line"
                    paint={{
                      "line-color": "#B37C1C",
                      "line-width": 5,
                      "line-opacity": 0.8,
                    }}
                  />
                </Source>
              )}
            </MapboxMapComponent>

            {/* Map Controls - Top Right: Zoom + 3D/2D Toggle */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              {/* Recenter button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (location && mapRef.current) {
                    mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 17, duration: 800 });
                  }
                }}
                className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: "#B37C1C", color: "#FFFBF2" }}
                title="Recenter map on your location"
              >
                <MapPin size={18} />
              </motion.button>

              {/* 3D/2D Toggle Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (mapRef.current) {
                    const currentPitch = mapRef.current.getPitch();
                    const newPitch = currentPitch === 0 ? 45 : 0;
                    mapRef.current.setPitch(newPitch);
                  }
                }}
                className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: "#B37C1C", color: "#FFFBF2" }}
                title="Toggle 3D/2D view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M16.5 7.5L13 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Bottom 30% - Mission Control Panel */}
          <MissionControlPanel
            batch={claimedBatch}
            onClose={() => {
              setShowActiveNav(false);
              setClaimedBatch(null);
              setIsInAppNavigating(false);
            }}
            currentLat={location?.lat || LUSAKA_CENTER.lat}
            currentLng={location?.lng || LUSAKA_CENTER.lng}
            isInAppNavigating={isInAppNavigating}
            onNavigateToggle={setIsInAppNavigating}
            legData={legData}
          />
        </div>
      ) : (
        /* NORMAL MODE - Standard 60/40 layout */
        <div className="flex flex-1 w-full relative z-30" style={{ minHeight: 0 }}>
          <GigRadarSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

          <div className="flex-1 flex flex-col relative z-10" style={{ minHeight: 0 }}>
            <header
              className="h-16 border-b flex items-center justify-between px-4 sm:px-6 shrink-0 backdrop-blur-sm sticky top-0 z-20"
              style={{
                backgroundColor: "rgba(255, 251, 242, 0.85)",
                borderColor: "hsl(38,40%,85%)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg transition-all"
                  style={{ backgroundColor: "#F5F0E8" }}
                >
                  <Menu size={20} style={{ color: "#0F1A35" }} />
                </motion.button>

                <div className="flex items-center gap-2">
                  <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover" />
                  <p className="font-display font-bold text-sm" style={{ color: "#0F1A35" }}>
                    THE HIVE
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <GoOnlineOverlay
                  isOnline={isOnline}
                  onOnline={() => setIsOnline(true)}
                  onLocationAcquired={(lat, lng) => {
                    if (mapRef.current) {
                      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
                    }
                  }}
                />

                <div className="hidden sm:block text-right">
                  <p
                    className="text-sm font-bold tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {profile?.full_name || user?.email?.split("@")[0] || "Worker"}
                  </p>
                </div>
                <motion.div
                  className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 relative"
                  style={{
                    borderColor: "#B37C1C",
                    background: "linear-gradient(135deg, #FFFBF2 0%, #F5F0E8 100%)",
                    boxShadow: "0 4px 12px rgba(179, 124, 28, 0.25), inset 0 1px 3px rgba(255, 255, 255, 0.6)",
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#B37C1C" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M 12 12 C 16 12 18 15 18 20 L 6 20 C 6 15 8 12 12 12" />
                    </svg>
                  )}
                </motion.div>
              </div>
            </header>

            <div
              className="flex-[0.6] lg:flex-[0.6] relative overflow-hidden rounded-b-2xl sm:rounded-b-3xl mx-1 sm:mx-2 mb-1 sm:mb-2"
              style={{ backgroundColor: "#f0f0f0", minHeight: 0 }}
            >
              <MapboxMapComponent
                ref={mapRef}
                initialLat={mapCenter.lat}
                initialLng={mapCenter.lng}
                initialZoom={DEFAULT_ZOOM}
              >
                {location && isOnline && <ChevronMarker lng={location.lng} lat={location.lat} bearing={0} label="You" />}
              </MapboxMapComponent>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (location && mapRef.current) {
                    mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 800 });
                  }
                }}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: "#FFFBF2", color: "#0F1A35" }}
              >
                <MapPin size={20} />
              </motion.button>
            </div>

            <motion.div
              ref={bottomSheetRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              layout
              animate={{
                height: sheetExpanded ? "100%" : "auto",
              }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="flex-[0.4] lg:flex-[0.4] relative rounded-t-2xl sm:rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{
                backgroundColor: "#FFFBF2",
              }}
            >
              {/* Drag Handle */}
              <div className="h-1 bg-gold/30 mx-auto rounded-full mt-2 w-12" />

              {/* Content */}
              <div className="flex-1 overflow-hidden custom-scrollbar flex flex-col">
                <AnimatePresence mode="wait">
                  {!isOnline ? (
                    <motion.div
                      key="offline"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center px-4"
                    >
                      <div className="text-4xl mb-3">🔌</div>
                      <p className="font-bold text-sm mb-1" style={{ color: "#0F1A35" }}>
                        Go online to see bounties
                      </p>
                      <p className="text-xs text-center" style={{ color: "#0F1A35/60" }}>
                        Click the "Go Online" button at the top to start accepting deliveries
                      </p>
                    </motion.div>
                  ) : (
                    <AvailableBountiesDrawer
                      key="bounties"
                      batches={batches}
                      onClaimBatch={handleClaimBatch}
                      isLoading={isClustering}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GigRadar;
