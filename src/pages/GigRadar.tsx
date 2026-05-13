import { useEffect, useState, useRef } from "react";
import { MapRef } from "react-map-gl";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import { useOrderClustering } from "@/hooks/gig-radar/useOrderClustering";
import { useMixedFleetRole } from "@/hooks/useMixedFleetRole";
import GigRadarSidebar from "@/components/gig-radar/layout/GigRadarSidebar";
import { BountyCard } from "@/components/gig-radar/BountyCard";
import { CommandCenter } from "@/components/gig-radar/CommandCenter";
import { Menu, MapPin, Zap, Phone, PhoneOff, X, ChevronRight, MapPinned, Lightbulb, Car, Footprints } from "lucide-react";
import HoneycombBackground from "@/components/HoneycombBackground";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { BatchedOrder } from "@/utils/orderClustering";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MapComponent from "@/components/Map/MapComponent";
import CustomMarker from "@/components/Map/CustomMarker";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;
const OSRM_API = "https://router.project-osrm.org";

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

interface RouteData {
  routes: Array<{
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
  }>;
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
      setSelectedBatch(batch);
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

  // Fetch OSRM route when bounty is selected
  useEffect(() => {
    if (!selectedBounty || !location) {
      setRouteGeometry(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const profile = isRider ? "driving" : "foot";
        const sme_lat = selectedBounty.sme_lat || selectedBounty.lat;
        const sme_lng = selectedBounty.sme_lng || selectedBounty.lng;
        const customer_lat = selectedBounty.customer_lat || selectedBounty.lat;
        const customer_lng = selectedBounty.customer_lng || selectedBounty.lng;

        // Leg 1: Worker to pickup
        const leg1Url = `${OSRM_API}/route/v1/${profile}/${location.lng},${location.lat};${sme_lng},${sme_lat}?overview=full&geometries=geojson`;
        const leg1Response = await fetch(leg1Url);
        const leg1Data: RouteData = await leg1Response.json();

        if (!leg1Data.routes || leg1Data.routes.length === 0) throw new Error("No route found for leg 1");

        // Leg 2: Pickup to customer
        const leg2Url = `${OSRM_API}/route/v1/${profile}/${sme_lng},${sme_lat};${customer_lng},${customer_lat}?overview=full&geometries=geojson`;
        const leg2Response = await fetch(leg2Url);
        const leg2Data: RouteData = await leg2Response.json();

        if (!leg2Data.routes || leg2Data.routes.length === 0) throw new Error("No route found for leg 2");

        // Combine geometries
        const totalCoords = [
          ...leg1Data.routes[0].geometry.coordinates,
          ...leg2Data.routes[0].geometry.coordinates.slice(1),
        ];

        const totalDistance = ((leg1Data.routes[0].distance + leg2Data.routes[0].distance) / 1000).toFixed(1);
        const totalDuration = Math.round((leg1Data.routes[0].duration + leg2Data.routes[0].duration) / 60);

        setRouteGeometry(totalCoords as [number, number][]);
        setRouteETAMap(new Map([[selectedBounty.id, { eta: `${totalDuration}m`, distance: `${totalDistance}km` }]]));
      } catch (error) {
        console.warn("[GigRadar] OSRM route error:", error);
        toast.error("Failed to fetch route");
      }
    };

    fetchRoute();
  }, [selectedBounty, location, isRider]);

  useEffect(() => {
    if (mapRef.current && location && isOnline) {
      mapRef.current.easeTo({
        center: [location.lng, location.lat],
        duration: 1000,
      });
    }
  }, [location, isOnline]);

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
            <MapComponent
              ref={mapRef}
              initialLat={mapCenter.lat}
              initialLng={mapCenter.lng}
              initialZoom={DEFAULT_ZOOM}
            >
              {location && isOnline && <CustomMarker lng={location.lng} lat={location.lat} label="You" />}

              {bounties.map((bounty) => (
                <motion.div
                  key={bounty.id}
                  onClick={() => {
                    setSelectedBounty(bounty);
                    mapRef.current?.flyTo({ center: [bounty.lng, bounty.lat], zoom: 16, duration: 800 });
                  }}
                  className="cursor-pointer"
                >
                  <CustomMarker lng={bounty.lng} lat={bounty.lat} isPulsing={false} />
                </motion.div>
              ))}

              {routeGeometry && (
                <source key="route-source" id="route-source" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: routeGeometry }, properties: {} }}>
                  <layer id="route-layer" type="line" paint={{ "line-color": "#0F1A35", "line-width": 5 }} />
                </source>
              )}
            </MapComponent>

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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              {selectedBounty ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-lg" style={{ color: "#0F1A35" }}>
                      Bounty Details
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedBounty(null)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#F5F0E8" }}
                    >
                      <X size={20} style={{ color: "#0F1A35" }} />
                    </motion.button>
                  </div>

                  <BountyCard
                    bounty={selectedBounty}
                    routeETA={routeETAMap.get(selectedBounty.id)}
                    onAccept={() => handleAcceptBounty(selectedBounty.id)}
                  />
                </>
              ) : (
                <CommandCenter
                  batches={batches}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onClaimBatch={handleClaimBatch}
                  isLoading={isClustering}
                  bounties={bounties}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {showActiveNav && selectedBatch && (
        <div className="absolute inset-0 z-50">
          <ActiveNavigationModal
            batch={selectedBatch}
            onClose={() => {
              setShowActiveNav(false);
              setSelectedBatch(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

interface ActiveNavigationModalProps {
  batch: BatchedOrder;
  onClose: () => void;
}

const ActiveNavigationModal: React.FC<ActiveNavigationModalProps> = ({ batch, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className="w-full h-full bg-black/50 flex items-center justify-center p-4"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-2xl p-6 w-full max-w-md"
      style={{ backgroundColor: "#FFFBF2" }}
    >
      <h3 className="font-display font-bold text-xl mb-4" style={{ color: "#0F1A35" }}>
        📍 Active Navigation
      </h3>
      <p className="text-sm mb-6">Batch with {batch.orderCount} orders</p>
      <button
        onClick={onClose}
        className="btn-gold w-full rounded-lg py-3 font-semibold text-white"
      >
        Close
      </button>
    </motion.div>
  </motion.div>
);

export default GigRadar;
