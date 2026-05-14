import { ZoomIn, ZoomOut, Navigation2 } from "lucide-react";
import type { Location } from "@/types/gig-radar";
import { MapRef } from "react-map-gl";
import { useRef } from "react";

interface MapControlsProps {
  mapRef: React.RefObject<MapRef | null>;
  userLocation: Location | null;
}

export const MapControls = ({ mapRef, userLocation }: MapControlsProps) => {
  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom?.();
      if (currentZoom) mapRef.current.zoomIn?.();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut?.();
    }
  };

  const handleCenterMap = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14,
        duration: 1500,
      });
    }
  };

  return (
    <div className="absolute bottom-24 right-4 flex flex-col gap-2 z-40">
      <button
        onClick={handleZoomIn}
        className="bg-black/70 hover:bg-black border border-gray-700 rounded-lg p-2 text-white transition-all"
        title="Zoom in"
      >
        <ZoomIn size={20} />
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-black/70 hover:bg-black border border-gray-700 rounded-lg p-2 text-white transition-all"
        title="Zoom out"
      >
        <ZoomOut size={20} />
      </button>
      {userLocation && (
        <button
          onClick={handleCenterMap}
          className="bg-blue-600 hover:bg-blue-700 border border-gray-700 rounded-lg p-2 text-white transition-all"
          title="Center on my location"
        >
          <Navigation2 size={20} />
        </button>
      )}
    </div>
  );
};

export default MapControls;
