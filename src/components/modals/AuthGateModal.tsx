import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, UserPlus } from "lucide-react";
import { createPortal } from "react-dom";

interface AuthGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueAsGuest: () => void;
  onSignIn: () => void;
  title?: string;
  description?: string;
}

const AuthGateModal = ({
  open,
  onOpenChange,
  onContinueAsGuest,
  onSignIn,
  title = "Continue to Order",
  description = "Choose how you'd like to proceed",
}: AuthGateModalProps) => {
  if (typeof document === "undefined") return null;

  const handleContinueAsGuest = () => {
    onOpenChange(false);
    onContinueAsGuest();
  };

  const handleSignIn = () => {
    onOpenChange(false);
    onSignIn();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[150] bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 z-[151] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-6 space-y-3">
                <button
                  onClick={handleContinueAsGuest}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg border border-primary/30 bg-primary/5 text-primary font-semibold hover:bg-primary/10 transition-colors"
                >
                  <UserPlus size={18} />
                  Continue as Guest
                </button>

                <button
                  onClick={handleSignIn}
                  className="btn-gold w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg font-semibold"
                >
                  <LogIn size={18} />
                  Sign In / Register
                </button>
              </div>

              <div className="border-t border-border px-6 py-4">
                <p className="text-xs text-muted-foreground text-center">
                  Guest checkout is quick and secure. You can create an account anytime.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default AuthGateModal;
