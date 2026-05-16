import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

interface OtpVerificationKeypadProps {
  orderId: number;
  customerName: string;
  otpType: "pickup" | "dropoff"; // Type of OTP verification
  onVerify: (otp: string) => Promise<boolean>;
  onFail: (reason: string) => Promise<boolean>;
  onCancel: () => void;
}

export const OtpVerificationKeypad = ({
  orderId,
  customerName,
  otpType,
  onVerify,
  onFail,
  onCancel,
}: OtpVerificationKeypadProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [showFailOptions, setShowFailOptions] = useState(false);
  const [failReason, setFailReason] = useState("");

  const handleOtpInput = (digit: string) => {
    if (otp.length < 4) {
      setOtp(otp + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setOtp(otp.slice(0, -1));
  };

  const handleVerify = async () => {
    if (otp.length !== 4) {
      setError("OTP must be 4 digits");
      return;
    }

    setIsVerifying(true);
    const success = await onVerify(otp);
    setIsVerifying(false);

    if (!success) {
      setError("Invalid OTP. Try again.");
      setOtp("");
    }
  };

  const handleFail = async () => {
    setIsVerifying(true);
    await onFail(failReason || "Customer unreachable");
    setIsVerifying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        style={{
          backgroundColor: "#FFFBF2",
          borderColor: "#D4A574",
          borderWidth: "2px",
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#0F1A35" }}>
            {otpType === "pickup" ? "🔒 Confirm Vendor Pickup" : "✅ Confirm Delivery"}
          </h2>
          <p style={{ color: "#0F1A35/70" }} className="text-sm">
            Order <strong>#{orderId}</strong> - <strong>{customerName}</strong>
          </p>
          <p style={{ color: "#B37C1C" }} className="text-xs font-semibold mt-2">
            {otpType === "pickup"
              ? "Request OTP from Vendor"
              : "Request Customer OTP"}
          </p>
        </div>

        {/* OTP Display */}
        <div className="mb-8">
          <label className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#0F1A35/60" }}>
            Enter 4-digit OTP
          </label>
          <div className="flex gap-3 justify-center mb-4">
            {[0, 1, 2, 3].map((idx) => (
              <motion.div
                key={idx}
                className="w-14 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-bold"
                style={{
                  borderColor: otp[idx] ? "#B37C1C" : "hsl(38,40%,85%)",
                  backgroundColor: otp[idx] ? "hsl(38,73%,40%,0.1)" : "transparent",
                  color: "#0F1A35",
                }}
                animate={{ scale: otp[idx] ? 1.05 : 1 }}
              >
                {otp[idx] || "•"}
              </motion.div>
            ))}
          </div>

          {error && (
            <motion.p className="text-sm text-red-600 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {error}
            </motion.p>
          )}
        </div>

        {/* Numeric Keypad */}
        {!showFailOptions ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <motion.button
                  key={digit}
                  onClick={() => handleOtpInput(digit.toString())}
                  disabled={isVerifying || otp.length >= 6}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-lg font-bold text-lg transition-all"
                  style={{
                    backgroundColor: "#F5F0E8",
                    color: "#0F1A35",
                    borderColor: "#D4A574",
                    borderWidth: "1px",
                  }}
                >
                  {digit}
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div></div>
              <motion.button
                onClick={() => handleOtpInput("0")}
                disabled={isVerifying || otp.length >= 6}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 rounded-lg font-bold text-lg transition-all col-span-1"
                style={{
                  backgroundColor: "#F5F0E8",
                  color: "#0F1A35",
                  borderColor: "#D4A574",
                  borderWidth: "1px",
                }}
              >
                0
              </motion.button>
              <motion.button
                onClick={handleBackspace}
                disabled={isVerifying || otp.length === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-4 rounded-lg font-bold transition-all"
                style={{
                  backgroundColor: "#F5F0E8",
                  color: "#0F1A35",
                  borderColor: "#D4A574",
                  borderWidth: "1px",
                }}
              >
                ←
              </motion.button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                onClick={handleVerify}
                disabled={isVerifying || otp.length !== 4}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: otp.length === 4 ? "linear-gradient(135deg, #B37C1C 0%, #1a1a2e 100%)" : "hsl(38,40%,85%)",
                  color: otp.length === 4 ? "white" : "#0F1A35",
                }}
              >
                <Check size={18} />
                {otpType === "pickup" ? "Confirm Pickup" : "Confirm Delivery"}
              </motion.button>

              <motion.button
                onClick={() => setShowFailOptions(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all border-2"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "#D4A574",
                  color: "#0F1A35",
                }}
              >
                <X size={18} />
                Fail
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#0F1A35/70" }} className="text-sm mb-4">
              Mark as failed?
            </p>

            <textarea
              placeholder="Reason (optional): Customer unreachable, address not found, etc."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              className="w-full p-3 rounded-lg text-sm mb-4 border-2 focus:outline-none"
              style={{
                borderColor: "#D4A574",
                backgroundColor: "#F5F0E8",
                color: "#0F1A35",
              }}
              rows={3}
            />

            <div className="flex gap-3">
              <motion.button
                onClick={handleFail}
                disabled={isVerifying}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-lg font-bold transition-all"
                style={{
                  backgroundColor: "#E53E3E",
                  color: "white",
                }}
              >
                Confirm Fail
              </motion.button>

              <motion.button
                onClick={() => {
                  setShowFailOptions(false);
                  setFailReason("");
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-lg font-bold transition-all border-2"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "#D4A574",
                  color: "#0F1A35",
                }}
              >
                Cancel
              </motion.button>
            </div>
          </>
        )}

        {/* Close Button */}
        <motion.button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-lg transition-all"
          style={{ backgroundColor: "#F5F0E8" }}
          whileHover={{ scale: 1.1 }}
        >
          <X size={20} style={{ color: "#0F1A35" }} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
