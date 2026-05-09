import { Menu, Wifi, WifiOff, Clock } from "lucide-react";

interface GigRadarTopBarProps {
  onMenuClick: () => void;
  locationStatus: "idle" | "requesting" | "ready" | "error";
  isOnline: boolean;
}

export const GigRadarTopBar = ({
  onMenuClick,
  locationStatus,
  isOnline,
}: GigRadarTopBarProps) => {
  return (
    <header className="bg-gradient-to-r from-black via-gray-950 to-black border-b border-yellow-600/20 backdrop-blur-sm">
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Left: Hamburger */}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-yellow-600/10 rounded-lg transition-colors"
        >
          <Menu size={24} className="text-yellow-500" />
        </button>

        {/* Center: Title */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            Gig Radar
          </h1>
        </div>

        {/* Right: Status indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/30">
              <Wifi size={16} className="text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">
                Live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700/20 border border-gray-600/30">
              <WifiOff size={16} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-400">
                Offline
              </span>
            </div>
          )}

          {locationStatus === "requesting" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-600/20 border border-yellow-500/30">
              <Clock size={16} className="text-yellow-400 animate-spin" />
              <span className="text-xs font-semibold text-yellow-400">
                Locating
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default GigRadarTopBar;
