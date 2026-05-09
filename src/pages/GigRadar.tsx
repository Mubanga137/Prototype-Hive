import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import GigRadarTopBar from "@/components/gig-radar/layout/GigRadarTopBar";
import GigRadarSidebar from "@/components/gig-radar/layout/GigRadarSidebar";
import MapControlsPanel from "@/components/gig-radar/MapControlsPanel";
import BottomGigSheet from "@/components/gig-radar/BottomGigSheet";
import GigDetailCard from "@/components/gig-radar/GigDetailCard";
import LocationPermissionPrompt from "@/components/gig-radar/LocationPermissionPrompt";
import QuickStatsOverlay from "@/components/gig-radar/QuickStatsOverlay";
import { Loader2 } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;

const GigRadar = () => {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroup = useRef<L.LayerGroup | null>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [selectedGig, setSelectedGig] = useState<GigMarker | null>(null);
  const [showGigDetail, setShowGigDetail] = useState(false);

  // Location & gig services
  const {
    location,
    isOnline,
    setIsOnline,
    locationStatus,
    permissionDenied,
    setPermissionDenied,
    accuracy,
  } = useLocationService();

  const { gigs, acceptGig } = useGigSimulation(location, isOnline);

  const mapCenter = location || LUSAKA_CENTER;
  const userRole = user?.role || "gig_worker";

  // Update map markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (!markerLayerGroup.current) {
      markerLayerGroup.current = L.layerGroup().addTo(mapRef.current);
    }

    markerLayerGroup.current.clearLayers();

    gigs.forEach((gig) => {
      const isSelected = selectedGig?.id === gig.id;
      const baseColor =
        gig.type === "delivery"
          ? "from-blue-500 to-blue-600"
          : gig.type === "runner"
            ? "from-green-500 to-green-600"
            : "from-purple-500 to-purple-600";

      const icon = L.divIcon({
        className: "gig-marker",
        html: `
          <style>
            @keyframes pulse-ring {
              0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
              70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
              100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
            }
            .gig-marker-selected {
              animation: pulse-ring 2s infinite;
            }
          </style>
          <div class="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all transform ${
            isSelected
              ? 'scale-125 ring-2 ring-yellow-400 gig-marker-selected'
              : 'hover:scale-110 cursor-pointer'
          } bg-gradient-to-br ${baseColor}">
            <span class="text-white font-bold text-base drop-shadow-lg">
              ${gig.price.replace('K', '')}
            </span>
          </div>
        `,
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });

      const marker = L.marker([gig.lat, gig.lng], { icon });

      marker.on("click", () => {
        setSelectedGig(gig);
        setShowGigDetail(true);
        mapRef.current?.flyTo([gig.lat, gig.lng], 16, { animate: true, duration: 1 });
      });

      markerLayerGroup.current?.addLayer(marker);
    });
  }, [gigs, selectedGig]);

  // Pan to user when online
  useEffect(() => {
    if (mapRef.current && location && isOnline) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true });
    }
  }, [location, isOnline]);

  const handleAcceptGig = (gigId: string) => {
    acceptGig(gigId);
    setShowGigDetail(false);
    setSelectedGig(null);
  };

  return (
    <div className="relative w-full h-screen flex bg-black overflow-hidden">
      {/* Sidebar */}
      <GigRadarSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <GigRadarTopBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          locationStatus={locationStatus}
          isOnline={isOnline}
        />

        {/* Map container */}
        <div className="flex-1 relative">
          <MapContainer
            ref={mapRef}
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* User location */}
            {location && isOnline && (
              <>
                <Marker
                  position={[location.lat, location.lng]}
                  icon={L.divIcon({
                    className: "user-marker",
                    html: `
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-3 border-white shadow-2xl">
                        <div class="w-5 h-5 bg-blue-200 rounded-full animate-pulse"></div>
                      </div>
                    `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                  })}
                >
                  <Popup>Your Location</Popup>
                </Marker>
                {accuracy && (
                  <Circle
                    center={[location.lat, location.lng]}
                    radius={accuracy}
                    pathOptions={{
                      color: "rgba(59, 130, 246, 0.3)",
                      fill: true,
                      fillColor: "rgba(59, 130, 246, 0.08)",
                      weight: 2,
                    }}
                  />
                )}
              </>
            )}
          </MapContainer>

          {/* Permission prompt */}
          {permissionDenied && (
            <LocationPermissionPrompt
              onRetry={() => setPermissionDenied(false)}
            />
          )}

          {/* Map controls */}
          <MapControlsPanel
            mapRef={mapRef}
            userLocation={location}
            isOnline={isOnline}
          />

          {/* Quick stats */}
          <QuickStatsOverlay
            gigs={gigs}
            isOnline={isOnline}
          />
        </div>
      </div>

      {/* Bottom gig sheet */}
      <BottomGigSheet
        gigs={gigs}
        isExpanded={bottomSheetExpanded}
        onExpandedChange={setBottomSheetExpanded}
        onSelectGig={(gig) => {
          setSelectedGig(gig);
          setShowGigDetail(true);
        }}
        isOnline={isOnline}
      />

      {/* Gig detail card */}
      {showGigDetail && selectedGig && (
        <GigDetailCard
          gig={selectedGig}
          onClose={() => {
            setShowGigDetail(false);
            setSelectedGig(null);
          }}
          onAccept={() => handleAcceptGig(selectedGig.id)}
          userRole={userRole}
        />
      )}

      {/* Online toggle (floating) */}
      <div className="fixed bottom-6 left-6 z-30">
        <button
          onClick={() => setIsOnline(!isOnline)}
          disabled={locationStatus === "requesting"}
          className={`px-6 py-3 rounded-full font-bold text-white shadow-2xl flex items-center gap-2 transition-all transform hover:scale-105 ${
            isOnline
              ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          } ${locationStatus === "requesting" ? "opacity-75" : ""}`}
        >
          {locationStatus === "requesting" && (
            <Loader2 size={18} className="animate-spin" />
          )}
          <span>{isOnline ? "Go Offline" : "Go Online"}</span>
          {isOnline && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
        </button>
        {locationStatus === "ready" && (
          <p className="text-xs text-green-400 mt-1 ml-2">● Live</p>
        )}
      </div>
    </div>
  );
};

export default GigRadar;
