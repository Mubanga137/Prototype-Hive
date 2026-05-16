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
        {/* Simple gold arrowhead - clean, minimal design */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Simple flat gold arrowhead pointing up */}
          <path
            d="M 24 6 L 42 36 L 24 28 L 6 36 Z"
            fill="#B37C1C"
            stroke="#FFFBF2"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {label && (
          <div className="absolute top-10 bg-[#B37C1C] text-[#FFFBF2] px-2 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-md">
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default ChevronMarker;
