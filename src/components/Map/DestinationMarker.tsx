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
        {/* Yango-style gold/amber lollipop pin */}
        <svg
          width="52"
          height="66"
          viewBox="0 0 52 66"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
            cursor: 'pointer',
          }}
        >
          <defs>
            {/* Gold gradient for pin circle */}
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4D4A8" />
              <stop offset="50%" stopColor="#D4A574" />
              <stop offset="100%" stopColor="#B37C1C" />
            </linearGradient>

            {/* Glow effect */}
            <filter id="glowPin">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stick/stem of the lollipop */}
          <line
            x1="26" y1="38"
            x2="26" y2="64"
            stroke="#B37C1C"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#glowPin)"
          />

          {/* Outer circle - Gold */}
          <circle
            cx="26" cy="26" r="22"
            fill="url(#goldGradient)"
            filter="url(#glowPin)"
          />

          {/* Inner white circle */}
          <circle
            cx="26" cy="26" r="16"
            fill="#FFFBF2"
            stroke="#B37C1C"
            strokeWidth="1.5"
          />

          {/* Center marker badge */}
          <circle
            cx="26" cy="26" r="9"
            fill={isPickup ? '#B37C1C' : '#D4A574'}
            opacity={isPickup ? 1 : 0.85}
          />

          {/* Highlight for 3D depth */}
          <circle
            cx="20" cy="20" r="6"
            fill="white"
            opacity="0.4"
          />
        </svg>

        {label && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 bg-[#0F1A35] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border border-[#B37C1C]"
          >
            {label}
          </motion.div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
