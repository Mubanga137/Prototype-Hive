import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import GigRadarSidebar from "@/components/gig-radar/layout/GigRadarSidebar";
import { Menu, MapPin, Zap, PhoneOff, Phone } from "lucide-react";
import HoneycombBackground from "@/components/HoneycombBackground";

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
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroup = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState("40%");
  const [selectedBounty, setSelectedBounty] = useState<BountyCard | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Location & gig services
  const {
    location,
    isOnline,
    setIsOnline,
    locationStatus,
    permissionDenied,
    accuracy,
  } = useLocationService();

  const { gigs, acceptGig } = useGigSimulation(location, isOnline);

  const mapCenter = location || LUSAKA_CENTER;
  const userRole = user?.role || "gig_worker";

  // Convert gigs to bounty cards
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

  // Update map markers
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
          <div class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white shadow-xl hover:scale-110 transition-transform cursor-pointer" style="box-shadow: 0 0 20px rgba(212, 165, 116, 0.6);">
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

  // Draw polyline for route
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

  // Pan to user when online
  useEffect(() => {
    if (mapRef.current && location && isOnline) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true });
    }
  }, [location, isOnline]);

  const handleAcceptBounty = (bountyId: string) => {
    acceptGig(bountyId);
    setSelectedBounty(null);
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden" style={{ backgroundColor: "#FFFBF2" }}>
      <HoneycombBackground />

      {/* Sidebar */}
      <GigRadarSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header Section */}
        <header className="h-16 border-b flex items-center px-6" style={{ backgroundColor: "#FFFBF2", borderColor: "#D4A574", backdropFilter: "blur(10px)" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg mr-4 transition-all"
            style={{ backgroundColor: "#F5F0E8" }}
          >
            <Menu size={24} style={{ color: "#0F1A35" }} />
          </motion.button>

          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl" style={{ color: "#0F1A35" }}>
                🐝 THE HIVE
              </h1>
              <p className="text-xs" style={{ color: "#999" }}>Logistics Terminal</p>
            </div>

            {/* Status Pill */}
            <motion.div
              animate={{ scale: isOnline ? 1 : 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                backgroundColor: isOnline ? "#E8F5E9" : "#FFF3E0",
                border: `1px solid ${isOnline ? "#4CAF50" : "#D4A574"}`,
              }}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? "bg-green-500" : "bg-orange-500"}`}></span>
              <span className="text-xs font-bold" style={{ color: isOnline ? "#2E7D32" : "#E65100" }}>
                {isOnline ? "🟢 ONLINE" : "⚫ OFFLINE"}
              </span>
            </motion.div>

            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full ml-4 flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#D4A574" }}>
              {user?.email?.[0].toUpperCase() || "H"}
            </div>
          </div>
        </header>

        {/* Map Container - 60% of remaining space */}
        <div className="flex-[0.6] relative overflow-hidden rounded-b-3xl mx-2 mb-2" style={{ backgroundColor: "#f0f0f0" }}>
          <MapContainer
            ref={mapRef}
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
              maxZoom={19}
            />

            {/* User location marker - Pulsing gold */}
            {location && isOnline && (
              <Marker
                position={[location.lat, location.lng]}
                icon={L.divIcon({
                  className: "user-location-marker",
                  html: `
                    <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
                      <div class="absolute w-full h-full rounded-full border-2 border-white shadow-lg" style="background: linear-gradient(135deg, #D4A574 0%, #B37C1C 100%);"></div>
                      <div class="absolute w-3 h-3 bg-white rounded-full" style="box-shadow: 0 0 12px rgba(212, 165, 116, 0.8); animation: pulse 2s infinite;"></div>
                    </div>
                  `,
                  iconSize: [48, 48],
                  iconAnchor: [24, 24],
                })}
              >
                <Popup>Your Location</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (location && mapRef.current) {
                  mapRef.current.flyTo([location.lat, location.lng], 15, { animate: true, duration: 0.8 });
                }
              }}
              className="w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: "#FFFBF2", color: "#0F1A35" }}
            >
              <MapPin size={20} />
            </motion.button>
          </div>
        </div>

        {/* Bottom Drawer - Available Bounties */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="flex-[0.4] relative rounded-t-3xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: "#FFFBF2", borderTop: "1px solid #D4A57420" }}
        >
          {/* Drawer Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 rounded-full" style={{ backgroundColor: "#D4A574" }}></div>
          </div>

          {/* Header */}
          <div className="px-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: "#D4A57420" }}>
            <h2 className="text-lg font-display font-bold flex items-center gap-2" style={{ color: "#0F1A35" }}>
              📍 Available Bounties
              <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: "#D4A57420", color: "#B37C1C" }}>
                {bounties.length} available
              </span>
            </h2>
          </div>

          {/* Horizontal Carousel */}
          <div className="flex-1 overflow-x-auto snap-x snap-mandatory px-6 py-4" style={{ scrollBehavior: "smooth" }}>
            <div className="flex gap-4 pb-2">
              {bounties.map((bounty, idx) => (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedBounty(bounty)}
                  className="flex-shrink-0 w-80 rounded-2xl p-4 cursor-pointer transition-all snap-start border"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: selectedBounty?.id === bounty.id ? "#B37C1C" : "#D4A57420",
                    boxShadow: selectedBounty?.id === bounty.id ? "0 8px 24px rgba(212, 165, 116, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.05)",
                  }}
                  whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(212, 165, 116, 0.2)" }}
                >
                  {/* Top: Pickup Location */}
                  <p className="font-bold text-sm mb-3" style={{ color: "#0F1A35" }}>
                    {bounty.pickup}
                  </p>

                  {/* Middle: Distance & Time */}
                  <div className="flex gap-4 mb-4 pb-4 border-b" style={{ borderColor: "#D4A57420" }}>
                    <div className="text-xs" style={{ color: "#999" }}>
                      <p style={{ color: "#666" }}>Distance</p>
                      <p className="font-semibold mt-1" style={{ color: "#0F1A35" }}>
                        {bounty.distance}
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "#999" }}>
                      <p style={{ color: "#666" }}>Est. Time</p>
                      <p className="font-semibold mt-1" style={{ color: "#0F1A35" }}>
                        {bounty.time}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-xs" style={{ color: "#999" }}>Payout</p>
                    <p className="text-xl font-bold" style={{ color: "#B37C1C" }}>
                      {bounty.price}
                    </p>
                  </div>

                  {/* Action Button - Gold to Black Gradient */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptBounty(bounty.id);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)",
                    }}
                  >
                    <Zap size={16} /> ACCEPT BOUNTY
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Online Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOnline(!isOnline)}
        disabled={locationStatus === "requesting"}
        className="fixed bottom-8 right-8 px-6 py-3 rounded-full font-bold text-white shadow-2xl flex items-center gap-2 transition-all z-50"
        style={{
          background: isOnline ? "linear-gradient(135deg, #D4A574 0%, #B37C1C 100%)" : "#0F1A35",
        }}
      >
        {isOnline ? <PhoneOff size={18} /> : <Phone size={18} />}
        <span>{isOnline ? "Go Offline" : "Go Online"}</span>
        {isOnline && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
      </motion.button>
    </div>
  );
};

export default GigRadar;
