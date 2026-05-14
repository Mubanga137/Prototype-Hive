import React from 'react';
import { Marker } from 'react-map-gl';

interface DestinationMarkerProps {
  lng: number;
  lat: number;
  label?: string;
  type?: 'pickup' | 'dropoff';
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({
  lng,
  lat,
  label,
  type = 'dropoff',
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        <svg
          width="40"
          height="52"
          viewBox="0 0 40 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="20" y1="32" x2="20" y2="52" stroke="#B37C1C" strokeWidth="4" />
          <circle cx="20" cy="20" r="16" fill="#B37C1C" />
          <circle cx="20" cy="20" r="10" fill="white" />
        </svg>
        {label && (
          <div className="absolute -bottom-8 bg-[#B37C1C] text-[#FFFBF2] px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
