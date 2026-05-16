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
        {/* Standard red circular lollipop pin for all destinations */}
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
            {/* Red gradient for pin circle */}
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B6B" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
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
            stroke="#991B1B"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#glowPin)"
          />

          {/* Outer circle - Red */}
          <circle
            cx="26" cy="26" r="22"
            fill="url(#redGradient)"
            filter="url(#glowPin)"
          />

          {/* Inner white circle */}
          <circle
            cx="26" cy="26" r="16"
            fill="#FFFBF2"
            stroke="#EF4444"
            strokeWidth="1.5"
          />

          {/* Center marker badge - lighter red for dropoff, darker for pickup */}
          <circle
            cx="26" cy="26" r="9"
            fill={isPickup ? '#991B1B' : '#FCA5A5'}
            opacity={isPickup ? 1 : 0.8}
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
            className="absolute top-full mt-2 bg-[#0F1A35] text-[#FFFBF2] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border border-[#EF4444]"
          >
            {label}
          </motion.div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
