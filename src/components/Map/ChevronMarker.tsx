import React from 'react';
import { Marker } from 'react-map-gl';

interface ChevronMarkerProps {
  lng: number;
  lat: number;
  bearing?: number;
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
        {/* Subtle pulsing glow background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: '56px',
            height: '56px',
            background: 'radial-gradient(circle, rgba(179, 124, 28, 0.25) 0%, rgba(179, 124, 28, 0.05) 100%)',
            animation: 'pulse 3s ease-in-out infinite',
            zIndex: 0,
          }}
        />

        {/* Premium gold arrowhead with depth */}
        <svg
          width="52"
          height="52"
          viewBox="0 0 52 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 8px rgba(179, 124, 28, 0.3))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.15s ease-out',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id="chevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="50%" stopColor="#B37C1C" />
              <stop offset="100%" stopColor="#8B5A1A" />
            </linearGradient>
            <filter id="chevronShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
            </filter>
          </defs>

          {/* Main arrowhead body */}
          <path
            d="M 26 4 L 46 38 L 26 30 L 6 38 Z"
            fill="url(#chevronGrad)"
            stroke="#FFFBF2"
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#chevronShadow)"
          />

          {/* Inner highlight for depth */}
          <path
            d="M 26 8 L 40 35 L 26 28 L 12 35 Z"
            fill="#FFFBF2"
            opacity="0.15"
            strokeLinejoin="round"
          />

          {/* Center dot accent */}
          <circle cx="26" cy="32" r="4" fill="#FFFBF2" opacity="0.9" />
        </svg>

        {label && (
          <div
            className="absolute top-12 bg-[#B37C1C] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border border-[#8B5A1A]"
            style={{
              backdropFilter: 'blur(4px)',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </Marker>
  );
};

export default ChevronMarker;
