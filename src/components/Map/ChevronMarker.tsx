import React from 'react';
import { Marker } from 'react-map-gl';

interface ChevronMarkerProps {
  lng: number;
  lat: number;
  bearing?: number; // 0-360 degrees; direction marker should point
  label?: string;
}

export const ChevronMarker: React.FC<ChevronMarkerProps> = ({
  lng,
  lat,
  bearing = 0,
  label,
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex flex-col items-center">
        {/* Chevron/Arrow pointer - rotates with bearing */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.3s ease-out',
          }}
        >
          <defs>
            <linearGradient id="chevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B37C1C" />
              <stop offset="100%" stopColor="#8B5A1C" />
            </linearGradient>
          </defs>
          {/* Chevron/Arrowhead shape pointing up */}
          <path
            d="M 20 4 L 32 18 L 26 18 L 20 11 L 14 18 L 8 18 Z"
            fill="url(#chevronGrad)"
            stroke="#FFFBF2"
            strokeWidth="1.5"
          />
          {/* Inner white circle for contrast */}
          <circle cx="20" cy="24" r="6" fill="#FFFBF2" />
          <circle cx="20" cy="24" r="3" fill="#B37C1C" />
        </svg>

        {label && (
          <div className="absolute top-12 bg-[#B37C1C] text-[#FFFBF2] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-md border border-[#8B5A1C]">
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default ChevronMarker;
