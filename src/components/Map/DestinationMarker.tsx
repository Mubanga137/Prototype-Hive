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
          width="44"
          height="58"
          viewBox="0 0 44 58"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))' }}
        >
          <defs>
            <linearGradient id="lollipopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="100%" stopColor="#8B5A1C" />
            </linearGradient>
          </defs>
          <line x1="22" y1="36" x2="22" y2="56" stroke="#B37C1C" strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="22" r="18" fill="url(#lollipopGrad)" />
          <circle cx="22" cy="22" r="12" fill="white" />
          <circle cx="22" cy="22" r="7" fill="#B37C1C" />
        </svg>
        {label && (
          <div className="absolute -bottom-7 bg-[#B37C1C] text-[#FFFBF2] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-md border border-[#8B5A1C]">
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
