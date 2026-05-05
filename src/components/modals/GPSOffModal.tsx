import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, MapPin, X } from "lucide-react";

interface GPSOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

const GPSOffModal = ({
  isOpen,
  onClose,
  errorMessage = "📍 Device Location Off: Please turn on your phone GPS to connect.",
}: GPSOffModalProps) => {
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDismissing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setDismissing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm rounded-2xl shadow-2xl pointer-events-auto relative overflow-hidden"
              style={{
                backgroundColor: "#FFFBF2", // Ivory
              }}
            >
              {/* Animated top accent bar */}
              <div
                className="h-1 w-full"
                style={{
                  background: "linear-gradient(90deg, #B37C1C 0%, #D4A574 50%, #B37C1C 100%)",
                  backgroundSize: "200% 100%",
                  animation: "slideGradient 2s ease-in-out infinite",
                }}
              />

              {/* Header section */}
              <div className="p-6 pb-4 border-b border-gold/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <MapPin
                        size={24}
                        className="text-gold"
                        style={{ color: "#B37C1C" }}
                      />
                    </motion.div>
                    <h2 className="text-lg font-bold" style={{ color: "#0F1A35" }}>
                      Location Required
                    </h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Icon with animation */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex justify-center mb-4"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(179, 124, 28, 0.1)",
                    }}
                  >
                    <AlertCircle size={32} style={{ color: "#B37C1C" }} />
                  </div>
                </motion.div>

                {/* Error message */}
                <p className="text-center text-sm leading-relaxed" style={{ color: "#0F1A35" }}>
                  {errorMessage}
                </p>

                {/* Instructions */}
                <div
                  className="mt-4 p-3 rounded-xl"
                  style={{ background: "rgba(179, 124, 28, 0.08)" }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: "#0F1A35" }}>
                    How to enable location:
                  </p>
                  <ol className="text-xs space-y-1" style={{ color: "#0F1A35" }}>
                    <li>1. Open your phone's Settings</li>
                    <li>2. Go to Location / GPS settings</li>
                    <li>3. Enable Location services</li>
                    <li>4. Return and try again</li>
                  </ol>
                </div>
              </div>

              {/* Footer / Action */}
              <div className="p-4 bg-foreground/5 border-t border-gold/10">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "#B37C1C",
                    color: "#FFFBF2",
                    boxShadow: "0 4px 12px rgba(179, 124, 28, 0.3)",
                  }}
                >
                  Got It
                </button>
              </div>

              {/* Decorative pulse corner */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(179, 124, 28, 0.3) 0%, transparent 70%)",
                }}
              />
            </div>
          </motion.div>

          {/* CSS for gradient animation */}
          <style>{`
            @keyframes slideGradient {
              0%, 100% {
                background-position: 0% center;
              }
              50% {
                background-position: 100% center;
              }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default GPSOffModal;
