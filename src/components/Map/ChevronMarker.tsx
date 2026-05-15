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

        {/* Chevron/Arrow pointer - rotates with bearing */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 0 12px rgba(179, 124, 28, 0.8)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
            transform: `rotate(${bearing}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-out',
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id="chevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="50%" stopColor="#B37C1C" />
              <stop offset="100%" stopColor="#8B5A1C" />
            </linearGradient>
            <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Elongated triangle/chevron pointing up (velocity indicator) */}
          <path
            d="M 20 2 L 36 22 L 28 22 L 20 8 L 12 22 L 4 22 Z"
            fill="url(#chevronGrad)"
            stroke="#FFFBF2"
            strokeWidth="2"
            filter="url(#glowEffect)"
          />

          {/* Center dot for anchor point visibility */}
          <circle cx="20" cy="26" r="5" fill="#FFFBF2" stroke="#B37C1C" strokeWidth="1.5" />
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
