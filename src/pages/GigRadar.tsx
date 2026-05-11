import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import GigRadarSidebar from "@/components/gig-radar/layout/GigRadarSidebar";
import { Menu, MapPin, Zap, Phone, PhoneOff, X, ChevronRight } from "lucide-react";
import HoneycombBackground from "@/components/HoneycombBackground";
import hiveLogo from "@/assets/hive-logo.jpeg";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;

interface BountyCard {
  id: string;
  lat: number;
  lng: number;
  pickup: string;
  distance: string;
  time: string;
  price: string;
  type: "delivery" | "runner" | "task";
}

const GigRadar = () => {
  const { user, profile } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroup = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<BountyCard | null>(null);

  const { location, isOnline, setIsOnline, locationStatus } = useLocationService();
  const { gigs, acceptGig } = useGigSimulation(location, isOnline);

  const mapCenter = location || LUSAKA_CENTER;
  const userRole = user?.role || "gig_worker";

  const bounties: BountyCard[] = gigs.map((gig, idx) => ({
    id: gig.id,
    lat: gig.lat,
    lng: gig.lng,
    pickup: `📍 ${["Central Market", "Lusaka Tech Hub", "Embassy Area", "Kabulonga"][idx % 4]}`,
    distance: `${(Math.random() * 8 + 0.5).toFixed(1)} km`,
    time: `${Math.floor(Math.random() * 20 + 10)} min`,
    price: gig.price,
    type: gig.type,
  }));

  useEffect(() => {
    if (!mapRef.current) return;

    if (!markerLayerGroup.current) {
      markerLayerGroup.current = L.layerGroup().addTo(mapRef.current);
    }

    markerLayerGroup.current.clearLayers();

    bounties.forEach((bounty) => {
      const icon = L.divIcon({
        className: "bounty-marker",
        html: `
          <div class="flex items-center justify-center w-12 h-12 rounded-full border-2 border-white transition-transform hover:scale-110 cursor-pointer" style="background: linear-gradient(135deg, #B37C1C 0%, #8B6914 100%); box-shadow: 0 0 20px rgba(179, 124, 28, 0.6);">
            <span class="text-white font-bold text-sm drop-shadow-lg">⚡</span>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([bounty.lat, bounty.lng], { icon });
      marker.on("click", () => {
        setSelectedBounty(bounty);
        mapRef.current?.flyTo([bounty.lat, bounty.lng], 16, { animate: true, duration: 0.8 });
      });

      markerLayerGroup.current?.addLayer(marker);
    });
  }, [bounties, selectedBounty]);

  useEffect(() => {
    if (!mapRef.current || !location || bounties.length === 0) return;

    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
    }

    const routePoints: [number, number][] = [
      [location.lat, location.lng],
      ...bounties.slice(0, 3).map(b => [b.lat, b.lng] as [number, number]),
    ];

    polylineRef.current = L.polyline(routePoints, {
      color: "#0F1A35",
      weight: 3,
      opacity: 0.8,
      dashArray: "8, 6",
    }).addTo(mapRef.current);
  }, [location, bounties]);

  useEffect(() => {
    if (mapRef.current && location && isOnline) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true });
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

      {/* Sidebar */}
      <div className="flex h-full w-full relative z-30 lg:z-20">
        <GigRadarSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative z-10">
          {/* Top Header - Premium Glassmorphic Design */}
          <header
            className="h-16 border-b flex items-center px-4 sm:px-6 shrink-0 backdrop-blur-sm sticky top-0 z-20"
            style={{
              backgroundColor: "rgba(255, 251, 242, 0.85)",
              borderColor: "hsl(38,40%,85%)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
            }}
          >
            {/* Left: Logo & Hamburger */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg lg:hidden transition-all"
                style={{ backgroundColor: "#F5F0E8" }}
              >
                <Menu size={20} style={{ color: "#0F1A35" }} />
              </motion.button>

              {/* Platform Logo - Visible on mobile and desktop */}
              <div className="flex items-center gap-2">
                <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover" />
                <div className="hidden sm:block">
                  <p className="font-display font-bold text-sm" style={{ color: "#0F1A35" }}>
                    THE HIVE
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Status Pill */}
            <div className="flex-1 flex justify-center">
              <motion.div
                animate={{ scale: isOnline ? 1 : 0.95 }}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all"
                style={{
                  backgroundColor: isOnline ? "rgba(76, 175, 80, 0.12)" : "rgba(212, 165, 116, 0.12)",
                  border: `1px solid ${isOnline ? "hsl(120, 61%, 50%, 0.3)" : "hsl(38, 73%, 40%, 0.3)"}`,
                  color: isOnline ? "#2E7D32" : "#B37C1C",
                }}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-600"} animate-pulse`}></span>
                <span>{isOnline ? "🟢 ONLINE" : "⚫ OFFLINE"}</span>
              </motion.div>
            </div>

            {/* Right: Gig Worker Avatar & Name */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <p className="text-xs sm:text-sm font-semibold" style={{ color: "#0F1A35" }}>
                  {profile?.full_name || user?.email?.split("@")[0] || "Gig Worker"}
                </p>
                <p className="text-[10px]" style={{ color: "#0F1A35/60" }}>
                  Active Gig Worker
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 border-2 transition-all"
                style={{
                  backgroundColor: "#B37C1C",
                  borderColor: "rgba(179, 124, 28, 0.3)",
                }}
              >
                {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || "H"}
              </div>
            </div>
          </header>

          {/* Map Container - 60% */}
          <div className="flex-[0.6] relative overflow-hidden rounded-b-2xl sm:rounded-b-3xl mx-1 sm:mx-2 mb-1 sm:mb-2" style={{ backgroundColor: "#f0f0f0" }}>
            <MapContainer
              ref={mapRef}
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={DEFAULT_ZOOM}
              className="w-full h-full"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/positron/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />

              {location && isOnline && (
                <Marker
                  position={[location.lat, location.lng]}
                  icon={L.divIcon({
                    className: "user-location-marker",
                    html: `
                      <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
                        <div class="absolute w-full h-full rounded-full border-2 border-white" style="background: linear-gradient(135deg, #B37C1C 0%, #8B6914 100%); box-shadow: 0 0 20px rgba(179, 124, 28, 0.8);"></div>
                        <div class="absolute w-3 h-3 bg-white rounded-full" style="box-shadow: 0 0 12px rgba(179, 124, 28, 0.8); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                      </div>
                    `,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24],
                  })}
                />
              )}
            </MapContainer>

            {/* Recenter Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (location && mapRef.current) {
                  mapRef.current.flyTo([location.lat, location.lng], 15, { animate: true, duration: 0.8 });
                }
              }}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: "#FFFBF2", color: "#0F1A35" }}
            >
              <MapPin size={20} />
            </motion.button>
          </div>

          {/* Bottom Drawer - 40% - Premium Slide-up Sheet */}
          <motion.div
            ref={bottomSheetRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            layout
            animate={{
              height: sheetExpanded ? "100%" : "auto",
            }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="flex-[0.4] relative rounded-t-2xl sm:rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              backgroundColor: "#FFFBF2",
              borderTop: "1px solid hsl(38,40%,85%)",
            }}
          >
            {/* Drag Handle */}
            <motion.div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div
                className="w-12 h-1 rounded-full transition-all"
                style={{
                  backgroundColor: "#D4A574",
                  opacity: 0.5,
                }}
              ></div>
            </motion.div>

            {/* Header */}
            <div
              className="px-4 sm:px-6 pb-3 sm:pb-4 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: "hsl(38,40%,85%)" }}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-bold" style={{ color: "#0F1A35" }}>
                  📍 Available Bounties
                </h2>
                <span
                  className="text-xs sm:text-sm px-2 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: "hsl(38,73%,40%,0.12)",
                    color: "#B37C1C",
                  }}
                >
                  {bounties.length} Active
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSheetExpanded(!sheetExpanded)}
                className="p-1.5 rounded-lg lg:hidden transition-all"
                style={{ backgroundColor: "#F5F0E8" }}
              >
                <ChevronRight
                  size={20}
                  style={{
                    color: "#0F1A35",
                    transform: sheetExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                  }}
                />
              </motion.button>
            </div>

            {/* Carousel - Horizontal Scroll */}
            <div
              className="flex-1 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 py-4 scrollbar-hide"
              style={{ scrollBehavior: "smooth" }}
            >
              <div className="flex gap-4 pb-2">
                {bounties.length > 0 ? (
                  bounties.map((bounty, idx) => (
                    <motion.div
                      key={bounty.id}
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", damping: 20 }}
                      onClick={() => setSelectedBounty(bounty)}
                      className="flex-shrink-0 w-72 rounded-2xl p-5 sm:p-6 cursor-pointer transition-all snap-start border overflow-hidden flex flex-col"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: selectedBounty?.id === bounty.id ? "#B37C1C" : "hsl(38,40%,85%)",
                        borderWidth: selectedBounty?.id === bounty.id ? "2px" : "1px",
                        boxShadow:
                          selectedBounty?.id === bounty.id
                            ? "0 16px 40px rgba(179, 124, 28, 0.25), 0 0 20px rgba(179, 124, 28, 0.15)"
                            : "0 4px 16px rgba(0, 0, 0, 0.08)",
                      }}
                      whileHover={{
                        y: -6,
                        boxShadow: "0 16px 40px rgba(179, 124, 28, 0.25), 0 0 20px rgba(179, 124, 28, 0.15)",
                      }}
                    >
                      {/* Location Header */}
                      <div className="flex items-start justify-between mb-4">
                        <p className="font-bold text-base" style={{ color: "#0F1A35" }}>
                          {bounty.pickup}
                        </p>
                        <span
                          className="text-xs px-2 py-1 rounded-lg font-semibold whitespace-nowrap"
                          style={{
                            backgroundColor: "hsl(38,73%,40%,0.12)",
                            color: "#B37C1C",
                          }}
                        >
                          {bounty.type}
                        </span>
                      </div>

                      {/* Distance & Time Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b" style={{ borderColor: "hsl(38,40%,85%)" }}>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999" }}>
                            Distance
                          </p>
                          <p className="font-bold text-base mt-1" style={{ color: "#0F1A35" }}>
                            {bounty.distance}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999" }}>
                            Est. Time
                          </p>
                          <p className="font-bold text-base mt-1" style={{ color: "#0F1A35" }}>
                            {bounty.time}
                          </p>
                        </div>
                      </div>

                      {/* Payout Section */}
                      <div className="mb-5">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999" }}>
                          Payout
                        </p>
                        <p className="text-3xl font-bold mt-2" style={{ color: "#B37C1C" }}>
                          {bounty.price}
                        </p>
                      </div>

                      {/* Premium Gradient Action Button - Full Width */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptBounty(bounty.id);
                        }}
                        className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 mt-auto text-sm sm:text-base"
                        style={{
                          background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
                        }}
                      >
                        <Zap size={18} />
                        <span>ACCEPT BOUNTY</span>
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="w-full flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-2" style={{ color: "#0F1A35" }}>
                        No Bounties Available
                      </p>
                      <p style={{ color: "#0F1A35/60" }}>
                        Check back soon for new delivery opportunities
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Online Toggle - Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOnline(!isOnline)}
        disabled={locationStatus === "requesting"}
        className="fixed bottom-8 right-8 px-5 sm:px-6 py-3 rounded-full font-bold text-white shadow-2xl flex items-center gap-2 transition-all z-40 text-sm sm:text-base"
        style={{
          background: isOnline ? "linear-gradient(135deg, #B37C1C 0%, #8B6914 100%)" : "#0F1A35",
        }}
      >
        {isOnline ? <PhoneOff size={18} /> : <Phone size={18} />}
        <span className="hidden sm:inline">{isOnline ? "Go Offline" : "Go Online"}</span>
        {isOnline && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
      </motion.button>
    </div>
  );
};

export default GigRadar;
