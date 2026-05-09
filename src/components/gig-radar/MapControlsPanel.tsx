import { useEffect } from "react";
import L from "leaflet";
import { ZoomIn, ZoomOut, Navigation2, RotateCcw } from "lucide-react";
import type { Location } from "@/types/gig-radar";

interface MapControlsPanelProps {
  mapRef: React.RefObject<L.Map | null>;
  userLocation: Location | null;
  isOnline: boolean;
}

export const MapControlsPanel = ({
  mapRef,
  userLocation,
  isOnline,
}: MapControlsPanelProps) => {
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleCenterMap = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
        animate: true,
        duration: 1,
      });
    }
  };

  return (
    <div className="absolute top-24 right-4 flex flex-col gap-2 z-40">
      <div className="flex flex-col gap-2 bg-black/50 backdrop-blur-sm p-2 rounded-xl border border-yellow-600/20">
        <button
          onClick={handleZoomIn}
          className="p-2.5 hover:bg-yellow-600/20 text-yellow-400 rounded-lg transition-all transform hover:scale-110"
          title="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <div className="h-px bg-yellow-600/10" />
        <button
          onClick={handleZoomOut}
          className="p-2.5 hover:bg-yellow-600/20 text-yellow-400 rounded-lg transition-all transform hover:scale-110"
          title="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        {isOnline && userLocation && (
          <>
            <div className="h-px bg-yellow-600/10" />
            <button
              onClick={handleCenterMap}
              className="p-2.5 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-all transform hover:scale-110"
              title="Center on my location"
            >
              <Navigation2 size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MapControlsPanel;
