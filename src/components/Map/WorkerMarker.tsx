import React from 'react';
import { Marker } from 'react-map-gl';

interface WorkerMarkerProps {
  lng: number;
  lat: number;
  label?: string;
  bearing?: number;
}

export const WorkerMarker: React.FC<WorkerMarkerProps> = ({
  lng,
  lat,
  label,
  bearing = 0,
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex flex-col items-center">
        <svg
          width="44"
          height="52"
          viewBox="0 0 44 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
          }}
        >
          <defs>
            {/* Golden 3D arrowhead gradient */}
            <linearGradient id="goldenArrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4D4A8" />
              <stop offset="50%" stopColor="#D4A574" />
              <stop offset="100%" stopColor="#A8705C" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="arrowGlow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main arrowhead shape (pointing up) */}
          <path
            d="M22 2 L40 48 L22 42 L4 48 Z"
            fill="url(#goldenArrowGradient)"
            filter="url(#arrowGlow)"
            stroke="#8B5A1C"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Center highlight for 3D depth */}
          <ellipse cx="22" cy="18" rx="5" ry="8" fill="white" opacity="0.4" />

          {/* Inner detail line */}
          <line x1="22" y1="4" x2="22" y2="40" stroke="white" strokeWidth="1.5" opacity="0.3" />
        </svg>
        {label && (
          <div className="absolute -bottom-8 bg-[#B37C1C] text-[#FFFBF2] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-md border border-[#8B5A1C]">
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default WorkerMarker;
