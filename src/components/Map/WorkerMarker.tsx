import React from 'react';
import { Marker } from 'react-map-gl';

interface WorkerMarkerProps {
  lng: number;
  lat: number;
  label?: string;
}

export const WorkerMarker: React.FC<WorkerMarkerProps> = ({
  lng,
  lat,
  label,
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        <svg
          width="40"
          height="54"
          viewBox="0 0 40 54"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.25))' }}
        >
          <defs>
            <linearGradient id="teardropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="100%" stopColor="#8B5A1C" />
            </linearGradient>
          </defs>
          <path
            d="M20 2C10.06 2 2 10.06 2 20c0 11 18 32 18 32s18-21 18-32c0-9.94-8.06-18-18-18z"
            fill="url(#teardropGrad)"
          />
          <circle cx="20" cy="18" r="7" fill="white" />
          <circle cx="20" cy="18" r="4" fill="#B37C1C" />
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

export default WorkerMarker;
