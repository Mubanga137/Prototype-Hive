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
          width="36"
          height="48"
          viewBox="0 0 36 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 0C9.16 0 2 7.16 2 16c0 10 16 32 16 32s16-22 16-32c0-8.84-7.16-16-16-16z"
            fill="#B37C1C"
          />
          <circle cx="18" cy="16" r="6" fill="white" />
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

export default WorkerMarker;
