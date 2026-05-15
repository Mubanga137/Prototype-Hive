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
import { Menu, MapPin, Zap, Phone, PhoneOff, X, ChevronRight, MapPinned, Lightbulb, Car, Footprints } from "lucide-react";
import HoneycombBackground from "@/components/HoneycombBackground";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { BatchedOrder } from "@/utils/orderClustering";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MapboxMapComponent from "@/components/Map/MapboxMapComponent";
import WorkerMarker from "@/components/Map/WorkerMarker";
import DestinationMarker from "@/components/Map/DestinationMarker";
import { mapboxRoutingService } from "@/services/mapboxRoutingService";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;

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

  const { location, isOnline, setIsOnline, locationStatus } = useLocationService();
  const { gigs, acceptGig } = useGigSimulation(location, isOnline);
  const { batches, isLoading: isClustering, fetchAndClusterOrders } = useOrderClustering();

  const mapCenter = location || LUSAKA_CENTER;
  const userRole = user?.role || "gig_worker";

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
      const { error } = await supabase
        .from("orders")
        .update({
          status: "in_transit",
          rider_id: user.id,
        })
        .in("id", batch.orderIds);

      if (error) throw error;

      toast.success(`✨ Batch claimed! ${batch.orderCount} orders in_transit.`);
      setClaimedBatch(batch);
      setShowActiveNav(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to claim batch";
      toast.error(message);
      console.error("[GigRadar] Claim error:", message);
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
      return;
    }

    const fetchRoute = async () => {
      try {
        // Pickup location from batch
        const pickupLat = claimedBatch.pickupLoc?.lat || LUSAKA_CENTER.lat;
        const pickupLng = claimedBatch.pickupLoc?.lng || LUSAKA_CENTER.lng;

        // Destination (first dropoff)
        const dropoffLat = claimedBatch.dropoffs[0]?.loc.lat || LUSAKA_CENTER.lat;
        const dropoffLng = claimedBatch.dropoffs[0]?.loc.lng || LUSAKA_CENTER.lng;

        // Leg 1: Worker to pickup
        const leg1Route = await mapboxRoutingService.getRoute(location.lng, location.lat, pickupLng, pickupLat);
        if (!leg1Route) throw new Error("No route found for leg 1");

        // Leg 2: Pickup to customer
        const leg2Route = await mapboxRoutingService.getRoute(pickupLng, pickupLat, dropoffLng, dropoffLat);
        if (!leg2Route) throw new Error("No route found for leg 2");

        // Combine coordinates
        const totalCoords = [
          ...leg1Route.coordinates,
          ...leg2Route.coordinates.slice(1),
        ];

        const leg1Duration = parseInt(leg1Route.eta.split(" ")[0]);
        const leg2Duration = parseInt(leg2Route.eta.split(" ")[0]);
        const totalDuration = leg1Duration + leg2Duration;
        const leg1Distance = parseFloat(leg1Route.distance.split(" ")[0]);
        const leg2Distance = parseFloat(leg2Route.distance.split(" ")[0]);
        const totalDistance = (leg1Distance + leg2Distance).toFixed(1);

        setRouteGeometry(totalCoords as [number, number][]);
        setRouteETAMap(new Map([[claimedBatch.clusterId, { eta: `⏱️ ETA: ${totalDuration}m`, distance: `📏 ${totalDistance}km` }]]));
      } catch (error) {
        console.warn("[GigRadar] Mapbox route error:", error);
        toast.error("Failed to fetch route");
      }
    };

    fetchRoute();
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

  // Lock map camera to user location during in-app navigation
  useEffect(() => {
    if (isInAppNavigating && mapRef.current && location) {
      const interval = setInterval(() => {
        if (mapRef.current && location) {
          mapRef.current.easeTo({
            center: [location.lng, location.lat],
            duration: 500,
            zoom: 17,
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isInAppNavigating, location]);

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

      {/* 70/30 SPLIT LAYOUT WHEN ACTIVE MISSION */}
      {showActiveNav && claimedBatch ? (
        <div className="flex-1 flex flex-col w-full h-screen overflow-hidden">
          {/* Top 70% - Map */}
          <div className="h-[70vh] relative overflow-hidden flex-shrink-0">
            <MapboxMapComponent
              ref={mapRef}
              initialLat={mapCenter.lat}
              initialLng={mapCenter.lng}
              initialZoom={16}
            >
              {location && isOnline && <WorkerMarker lng={location.lng} lat={location.lat} label="You" />}

              {/* Pickup marker - from SME location */}
              {claimedBatch.pickupLoc && (
                <DestinationMarker
                  lng={claimedBatch.pickupLoc.lng}
                  lat={claimedBatch.pickupLoc.lat}
                  label={claimedBatch.pickupSmeNam}
                  type="pickup"
                />
              )}

              {/* Destination marker - first dropoff */}
              {claimedBatch.dropoffs[0] && (
                <DestinationMarker
                  lng={claimedBatch.dropoffs[0].loc.lng}
                  lat={claimedBatch.dropoffs[0].loc.lat}
                  label={claimedBatch.dropoffs[0].customer}
                  type="dropoff"
                />
              )}

              {/* Route polyline (gold color via Mapbox) */}
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

            {/* Minimal Controls - only center map button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (location && mapRef.current) {
                  mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 17, duration: 800 });
                }
              }}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: "#FFFBF2", color: "#0F1A35" }}
            >
              <MapPin size={20} />
            </motion.button>
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
                {location && isOnline && <WorkerMarker lng={location.lng} lat={location.lat} label="You" />}
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
