import { X, MapPin, Clock, Zap, Navigation2, AlertCircle } from "lucide-react";
import type { GigMarker } from "@/types/gig-radar";

interface GigDetailCardProps {
  gig: GigMarker;
  onClose: () => void;
  onAccept: () => void;
  userRole: string;
}

export const GigDetailCard = ({
  gig,
  onClose,
  onAccept,
  userRole,
}: GigDetailCardProps) => {
  const getRoleLabel = () => {
    switch (userRole) {
      case "rider":
        return "Delivery";
      case "runner":
        return "Running";
      default:
        return "Task";
    }
  };

  const timeRemaining = Math.max(
    0,
    Math.ceil((gig.expiresAt - Date.now()) / 1000)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Card */}
      <div className="fixed inset-0 flex items-end z-50">
        <div className="w-full max-w-md mx-auto bg-gradient-to-br from-gray-800 via-gray-900 to-black border border-yellow-600/20 rounded-3xl shadow-2xl p-6 m-4 animate-in slide-in-from-bottom-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-yellow-600/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400 hover:text-yellow-400" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                  gig.type === "delivery"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                    : gig.type === "runner"
                      ? "bg-gradient-to-br from-green-500 to-green-600"
                      : "bg-gradient-to-br from-purple-500 to-purple-600"
                }`}
              >
                {gig.type === "delivery"
                  ? "📦"
                  : gig.type === "runner"
                    ? "🏃"
                    : "🏢"}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {gig.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {getRoleLabel()} Gig
                </p>
              </div>
            </div>

            {/* Price highlight */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Payout
              </p>
              <p className="text-4xl font-bold text-yellow-400">{gig.price}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <MapPin size={16} />
                <span>Distance</span>
              </div>
              <p className="text-white font-bold text-lg">
                {gig.distance.toFixed(1)} km
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock size={16} />
                <span>ETA</span>
              </div>
              <p className="text-white font-bold text-lg">{gig.eta}</p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Zap size={16} />
                <span>Urgency</span>
              </div>
              <p
                className={`font-bold text-lg ${
                  timeRemaining < 10
                    ? "text-red-400"
                    : timeRemaining < 30
                      ? "text-yellow-400"
                      : "text-green-400"
                }`}
              >
                {timeRemaining}s left
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Navigation2 size={16} />
                <span>Type</span>
              </div>
              <p className="text-white font-bold text-lg capitalize">
                {gig.type}
              </p>
            </div>
          </div>

          {/* Warning if expiring soon */}
          {timeRemaining < 10 && (
            <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3 mb-6 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                This gig is expiring soon! Accept now to secure it.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onAccept}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Accept Gig
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-700/50"
            >
              View Later
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GigDetailCard;
