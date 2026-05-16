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
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        {/* Simple red circular lollipop pin */}
        <svg
          width="40"
          height="52"
          viewBox="0 0 40 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))',
            cursor: 'pointer',
          }}
        >
          {/* Stick/stem */}
          <line
            x1="20" y1="28"
            x2="20" y2="50"
            stroke="#DC2626"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Circle - Red */}
          <circle
            cx="20" cy="20" r="18"
            fill="#EF4444"
          />
        </svg>

        {label && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-1 bg-[#0F1A35] text-[#FFFBF2] px-2 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-md"
          >
            {label}
          </motion.div>
        )}
      </div>
    </Marker>
  );
};

export default DestinationMarker;
