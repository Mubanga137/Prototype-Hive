import { TrendingUp, Target, Clock } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

interface QuickStatsOverlayProps {
  gigs: GigMarker[];
  isOnline: boolean;
}

export const QuickStatsOverlay = ({ gigs, isOnline }: QuickStatsOverlayProps) => {
  if (!isOnline || gigs.length === 0) return null;

  const totalEarnings = gigs.reduce((sum, gig) => {
    const price = parseFloat(gig.price.replace(/[^\d.]/g, ""));
    return sum + price;
  }, 0);

  const avgDistance =
    gigs.reduce((sum, gig) => sum + gig.distance, 0) / gigs.length;

  return (
    <div className="fixed top-24 left-6 z-40 space-y-2">
      {/* Earnings potential */}
      <div className="bg-black/50 backdrop-blur-sm border border-yellow-600/20 rounded-xl p-3 w-48">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <TrendingUp size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Earnings
          </span>
        </div>
        <p className="text-2xl font-bold text-yellow-300">K{totalEarnings.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-1">{gigs.length} gigs available</p>
      </div>

      {/* Average distance */}
      <div className="bg-black/50 backdrop-blur-sm border border-emerald-600/20 rounded-xl p-3 w-48">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <Target size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Avg Distance
          </span>
        </div>
        <p className="text-2xl font-bold text-emerald-300">
          {avgDistance.toFixed(1)} km
        </p>
      </div>
    </div>
  );
};

export default QuickStatsOverlay;
