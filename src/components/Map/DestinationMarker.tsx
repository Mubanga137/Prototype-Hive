import React from 'react';
import { Marker } from 'react-map-gl';
import { motion } from 'framer-motion';

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
  const isPickup = type === 'pickup';

  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        {/* Premium red lollipop pin with gradient and depth */}
        <svg
          width="48"
          height="62"
          viewBox="0 0 48 62"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35)) drop-shadow(0 0 6px rgba(239, 68, 68, 0.2))',
            cursor: 'pointer',
          }}
        >
          <defs>
            {/* Red gradient for premium look */}
            <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B6B" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>

            {/* Subtle inner glow */}
            <radialGradient id="pinGlow" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#FFFBF2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFBF2" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Stem with gradient for depth */}
          <path
            d="M 24 32 Q 23 35 23 40 L 23 58 Q 23 59 24 59 L 25 59 Q 26 59 26 58 L 26 40 Q 26 35 25 32"
            fill="#B81C1C"
            stroke="#8B1515"
            strokeWidth="0.5"
          />

          {/* Main circle with gradient */}
          <circle cx="24" cy="24" r="20" fill="url(#pinGradient)" />

          {/* Inner glow/shine */}
          <circle cx="24" cy="24" r="20" fill="url(#pinGlow)" />

          {/* Highlight for 3D depth */}
          <circle cx="18" cy="16" r="7" fill="#FFFBF2" opacity="0.35" />

          {/* Inner badge circle */}
          <circle
            cx="24"
            cy="24"
            r="14"
            fill={isPickup ? '#991B1B' : '#FFFBF2'}
            opacity={isPickup ? 0.9 : 1}
          />

          {/* Center accent dot */}
          {!isPickup && (
            <circle cx="24" cy="24" r="6" fill="#EF4444" opacity="0.6" />
          )}
        </svg>

        {label && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-full mt-2 bg-[#0F1A35] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border border-[#EF4444]/30"
            style={{
              backdropFilter: 'blur(6px)',
            }}
          >
            {label}
          </motion.div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
