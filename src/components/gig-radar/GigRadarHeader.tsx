interface GigRadarHeaderProps {
  locationStatus: "idle" | "requesting" | "ready" | "error";
}

export const GigRadarHeader = ({ locationStatus }: GigRadarHeaderProps) => {
  const getStatusText = () => {
    switch (locationStatus) {
      case "ready":
        return "Live location active";
      case "requesting":
        return "Requesting location...";
      case "error":
        return "Location unavailable";
      default:
        return "Go online to receive gigs";
    }
  };

  const getStatusColor = () => {
    switch (locationStatus) {
      case "ready":
        return "text-green-500";
      case "requesting":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <header className="bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">Gig Radar</h1>
          <p className={`text-xs mt-1 ${getStatusColor()}`}>{getStatusText()}</p>
        </div>
      </div>
    </header>
  );
};

export default GigRadarHeader;
