import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "@/hooks/useAuth";
import { useLocationService } from "@/hooks/gig-radar/useLocationService";
import { useGigSimulation } from "@/hooks/gig-radar/useGigSimulation";
import GigRadarHeader from "@/components/gig-radar/GigRadarHeader";
import OnlineToggleButton from "@/components/gig-radar/OnlineToggleButton";
import GigListPanel from "@/components/gig-radar/GigListPanel";
import LocationPermissionPrompt from "@/components/gig-radar/LocationPermissionPrompt";
import MapControls from "@/components/gig-radar/MapControls";
import { Loader2 } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

const LUSAKA_CENTER = { lat: -15.3875, lng: 28.3228 };
const DEFAULT_ZOOM = 14;

const GigRadar = () => {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerGroup = useRef<L.LayerGroup | null>(null);

  // Location service
  const {
    location,
    isOnline,
    setIsOnline,
    locationStatus,
    permissionDenied,
    setPermissionDenied,
    accuracy,
  } = useLocationService();

  // Gig simulation
  const { gigs, acceptGig } = useGigSimulation(location, isOnline);

  // Map center: user location or fallback
  const mapCenter = location || LUSAKA_CENTER;

  useEffect(() => {
    if (!mapRef.current) return;

    // Ensure marker layer exists
    if (!markerLayerGroup.current) {
      markerLayerGroup.current = L.layerGroup().addTo(mapRef.current);
    }

    // Clear old markers
    markerLayerGroup.current.clearLayers();

    // Add gig markers
    gigs.forEach((gig) => {
      const icon = L.divIcon({
        className: "gig-marker",
        html: `
          <div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg 
            ${
              gig.type === "delivery"
                ? "bg-blue-500"
                : gig.type === "runner"
                  ? "bg-green-500"
                  : "bg-purple-500"
            }">
            <span class="text-white font-bold text-sm">$</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([gig.lat, gig.lng], { icon }).bindPopup(
        `<div class="text-sm">
          <p class="font-bold">${gig.title}</p>
          <p>${gig.distance.toFixed(1)} km</p>
          <p class="text-green-600 font-bold">${gig.price}</p>
        </div>`
      );

      marker.on("click", () => {
        acceptGig(gig.id);
      });

      markerLayerGroup.current?.addLayer(marker);
    });
  }, [gigs]);

  // Pan to user location when online (gentle, no forced zoom)
  useEffect(() => {
    if (mapRef.current && location && isOnline) {
      mapRef.current.panTo([location.lat, location.lng], { animate: true });
    }
  }, [location, isOnline]);

  return (
    <div className="relative w-full h-screen flex flex-col bg-black">
      {/* Header */}
      <GigRadarHeader locationStatus={locationStatus} />

      {/* Main map container */}
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={true}
          zoomAnimation={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* User location marker and accuracy circle */}
          {location && isOnline && (
            <>
              <Marker
                position={[location.lat, location.lng]}
                icon={L.divIcon({
                  className: "user-marker",
                  html: `
                    <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg">
                      <div class="w-4 h-4 bg-blue-300 rounded-full animate-pulse"></div>
                    </div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
              >
                <Popup>Your Location</Popup>
              </Marker>
              {accuracy && (
                <Circle
                  center={[location.lat, location.lng]}
                  radius={accuracy}
                  pathOptions={{
                    color: "rgba(59, 130, 246, 0.2)",
                    fill: true,
                    fillColor: "rgba(59, 130, 246, 0.1)",
                    weight: 1,
                  }}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Permission denied prompt overlay */}
        {permissionDenied && (
          <LocationPermissionPrompt
            onRetry={() => setPermissionDenied(false)}
          />
        )}

        {/* Map controls (zoom, center) */}
        <MapControls
          mapRef={mapRef}
          userLocation={location}
        />
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-6 px-4">
        <div className="flex gap-4 items-center justify-between max-w-2xl mx-auto">
          {/* Online/Offline toggle (LEFT) */}
          <div className="flex-1">
            <OnlineToggleButton
              isOnline={isOnline}
              isLoading={locationStatus === "requesting"}
              onClick={() => setIsOnline(!isOnline)}
              role={user?.role || "gig_worker"}
            />
          </div>

          {/* Location status indicator */}
          <div className="flex-shrink-0 text-xs text-gray-400">
            {locationStatus === "requesting" && (
              <div className="flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                <span>Locating...</span>
              </div>
            )}
            {locationStatus === "ready" && isOnline && (
              <span className="text-green-500">● Live</span>
            )}
            {locationStatus === "idle" && (
              <span className="text-gray-500">● Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Gig list panel (scrollable at bottom) */}
      {isOnline && gigs.length > 0 && (
        <GigListPanel gigs={gigs} onSelectGig={acceptGig} />
      )}
    </div>
  );
};

export default GigRadar;
