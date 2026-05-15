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
        {/* Glow ring backdrop for night-mode visibility */}
        <div
          style={{
            position: 'absolute',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(179, 124, 28, 0.4) 0%, rgba(179, 124, 28, 0.1) 70%, rgba(179, 124, 28, 0) 100%)',
            animation: 'pulse 2s ease-in-out infinite',
            zIndex: -1,
          }}
        />

        {/* Gold Arrow pointer - rotates with bearing (Yango style) */}
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 0 16px rgba(179, 124, 28, 0.9)) drop-shadow(0 6px 16px rgba(0, 0, 0, 0.6))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.15s ease-out',
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4D4A8" />
              <stop offset="50%" stopColor="#D4A574" />
              <stop offset="100%" stopColor="#8B5A1C" />
            </linearGradient>
            <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer chevron/arrow shape - upward pointing */}
          <path
            d="M 28 4 L 48 28 L 38 28 L 28 12 L 18 28 L 8 28 Z"
            fill="url(#arrowGrad)"
            stroke="#FFFBF2"
            strokeWidth="2.5"
            filter="url(#arrowGlow)"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Center circle with white background */}
          <circle cx="28" cy="36" r="8" fill="#FFFBF2" stroke="#B37C1C" strokeWidth="2" />
          <circle cx="28" cy="36" r="4" fill="#B37C1C" />
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
