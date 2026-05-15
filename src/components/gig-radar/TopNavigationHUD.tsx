import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';

interface TopNavigationHUDProps {
  nextInstruction: string;
  distance: string; // e.g., "300m"
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
  onBackClick?: () => void;
}

export const TopNavigationHUD: React.FC<TopNavigationHUDProps> = ({
  nextInstruction,
  distance,
  soundEnabled = false,
  onSoundToggle,
  onBackClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="absolute top-4 left-4 right-4 z-50 backdrop-blur-xl rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(255, 251, 242, 0.92)',
        borderColor: 'rgba(179, 124, 28, 0.4)',
      }}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Back button */}
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="flex-shrink-0 p-2 rounded-lg transition-all hover:bg-gray-200 active:scale-95"
            style={{ backgroundColor: 'rgba(179, 124, 28, 0.1)' }}
          >
            <ChevronLeft size={18} style={{ color: '#0F1A35' }} />
          </button>
        )}

        {/* Instruction text and distance */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold leading-tight mb-1 truncate"
            style={{ color: '#0F1A35' }}
          >
            {nextInstruction}
          </p>
          <p
            className="text-xs font-semibold"
            style={{ color: '#B37C1C' }}
          >
            {distance}
          </p>
        </div>

        {/* Sound toggle */}
        {onSoundToggle && (
          <button
            onClick={() => onSoundToggle(!soundEnabled)}
            className="flex-shrink-0 p-2 rounded-lg transition-all hover:bg-gray-200 active:scale-95"
            style={{
              backgroundColor: soundEnabled ? 'rgba(179, 124, 28, 0.2)' : 'rgba(179, 124, 28, 0.1)',
            }}
          >
            {soundEnabled ? (
              <Volume2 size={18} style={{ color: '#B37C1C' }} />
            ) : (
              <VolumeX size={18} style={{ color: '#0F1A35' }} />
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5" style={{ backgroundColor: 'rgba(179, 124, 28, 0.2)' }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: '#B37C1C' }}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 8, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
};

export default TopNavigationHUD;
