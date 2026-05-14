import React from 'react';
import { Marker } from 'react-map-gl';
import { motion } from 'framer-motion';

interface CustomMarkerProps {
  lng: number;
  lat: number;
  isPulsing?: boolean;
  label?: string;
}

export const CustomMarker: React.FC<CustomMarkerProps> = ({
  lng,
  lat,
  isPulsing = true,
  label,
}) => {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative flex items-center justify-center">
        {isPulsing && (
          <motion.div
            className="absolute w-12 h-12 rounded-full"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ backgroundColor: "rgba(179, 124, 28, 0.3)" }}
          />
        )}
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 0C9.37 0 4 5.37 4 12c0 8 12 28 12 28s12-20 12-28c0-6.63-5.37-12-12-12z"
            fill="#B37C1C"
          />
          <circle cx="16" cy="12" r="5" fill="white" />
        </svg>
      </div>
      {label && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white/90 px-2 py-1 rounded text-xs font-semibold text-[#0F1A35] whitespace-nowrap">
          {label}
        </div>
      )}
    </Marker>
  );
};

export default CustomMarker;
