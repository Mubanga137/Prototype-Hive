import { ChevronUp, MapPin, Clock, DollarSign } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

interface BottomGigSheetProps {
  gigs: GigMarker[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectGig: (gig: GigMarker) => void;
  isOnline: boolean;
}

export const BottomGigSheet = ({
  gigs,
  isExpanded,
  onExpandedChange,
  onSelectGig,
  isOnline,
}: BottomGigSheetProps) => {
  if (!isOnline || gigs.length === 0) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
        isExpanded ? "h-3/4" : "h-20"
      }`}
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0"
          onClick={() => onExpandedChange(false)}
        />
      )}

      {/* Sheet container */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-950 to-black border-t border-yellow-600/20 backdrop-blur-xl rounded-t-2xl shadow-2xl">
        {/* Handle bar */}
        <button
          onClick={() => onExpandedChange(!isExpanded)}
          className="w-full py-3 flex justify-center items-center hover:bg-yellow-600/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronUp
              size={20}
              className={`text-yellow-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            <span className="text-sm font-semibold text-gray-300">
              Available Gigs ({gigs.length})
            </span>
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="overflow-y-auto h-[calc(100%-60px)] px-4 pb-4">
            <div className="space-y-3">
              {gigs.map((gig) => (
                <button
                  key={gig.id}
                  onClick={() => onSelectGig(gig)}
                  className="w-full text-left bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-yellow-600/10 rounded-xl p-4 hover:border-yellow-500/30 hover:from-gray-800/70 hover:to-gray-900/70 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-bold group-hover:text-yellow-400 transition-colors">
                        {gig.title}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded inline-block mt-1 ${
                          gig.type === "delivery"
                            ? "bg-blue-500/20 text-blue-400"
                            : gig.type === "runner"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {gig.type === "delivery"
                          ? "Delivery"
                          : gig.type === "runner"
                            ? "Running"
                            : "Hive Node"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold text-lg">
                        {gig.price}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(gig.expiresAt - Date.now()) / 1000 > 0
                          ? `${Math.ceil((gig.expiresAt - Date.now()) / 1000)}s`
                          : "Expired"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} className="text-gray-500" />
                      <span>{gig.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-500" />
                      <span>{gig.eta}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed preview */}
        {!isExpanded && gigs.length > 0 && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-300 font-medium">Top opportunity</p>
              <p className="text-yellow-400 font-bold">{gigs[0].price}</p>
            </div>
            <p className="text-xs text-gray-500">{gigs[0].distance.toFixed(1)} km away</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomGigSheet;
