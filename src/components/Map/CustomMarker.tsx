import React from 'react';
import { Marker } from 'react-map-gl';
import { MapPin } from 'lucide-react';

interface CustomMarkerProps {
  lng: number;
  lat: number;
  isPulsing?: boolean;
  label?: string;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
  lng,
  lat,
  isPulsing = true,
  label,
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex items-center justify-center">
        <div className="w-8 h-8 flex items-center justify-center">
          <MapPin size={32} color="#B37C1C" fill="#B37C1C" />
        </div>
      </div>
      {label && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white/90 px-2 py-1 rounded text-xs font-semibold text-[#0F1A35] whitespace-nowrap">
          {label}
        </div>
      )}
    </Marker>
  );
};

export default CustomMarker;
