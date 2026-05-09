import { MapPin } from "lucide-react";

interface LocationPermissionPromptProps {
  onRetry: () => void;
}

export const LocationPermissionPrompt = ({ onRetry }: LocationPermissionPromptProps) => {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm mx-4 border border-gray-700">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full mx-auto mb-4">
          <MapPin size={24} className="text-blue-400" />
        </div>
        <h3 className="text-white font-bold text-lg text-center mb-2">
          Location Access Required
        </h3>
        <p className="text-gray-300 text-sm text-center mb-6">
          We need your location to show nearby gigs. Please enable location access in your
          browser settings.
        </p>
        <button
          onClick={onRetry}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default LocationPermissionPrompt;
