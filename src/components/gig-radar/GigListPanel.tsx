import { MapPin, Clock, DollarSign } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

interface GigListPanelProps {
  gigs: GigMarker[];
  onSelectGig: (id: string) => void;
}

export const GigListPanel = ({ gigs, onSelectGig }: GigListPanelProps) => {
  return (
    <div className="fixed bottom-24 left-0 right-0 bg-black/90 backdrop-blur border-t border-gray-800 max-h-60 overflow-y-auto">
      <div className="px-4 py-3">
        <h3 className="text-white font-bold text-sm mb-3">
          Available Gigs ({gigs.length})
        </h3>
        <div className="space-y-2">
          {gigs.map((gig) => (
            <button
              key={gig.id}
              onClick={() => onSelectGig(gig.id)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-left hover:border-blue-500 hover:bg-gray-800 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-white font-semibold text-sm">{gig.title}</p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    gig.type === "delivery"
                      ? "bg-blue-500/20 text-blue-400"
                      : gig.type === "runner"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {gig.type}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>{gig.distance.toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{gig.eta}</span>
                </div>
                <div className="flex items-center gap-1 text-green-400 font-bold">
                  <DollarSign size={14} />
                  <span>{gig.price}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GigListPanel;
