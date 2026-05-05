import { AlertCircle, MapPin } from "lucide-react";

interface GPSTransmitterStatusProps {
  isTransmitting: boolean;
  hasPermission: boolean | null;
  permissionError: string | null;
  isOnline: boolean;
}

/**
 * GPS Transmitter Status Indicator
 * Shows:
 * - Green pulsating dot when actively transmitting location
 * - Red warning banner if location permissions are blocked
 */
export const GPSTransmitterStatus = ({
  isTransmitting,
  hasPermission,
  permissionError,
  isOnline,
}: GPSTransmitterStatusProps) => {
  // Show warning banner if permissions are denied
  if (!isOnline) {
    return null;
  }

  if (hasPermission === false && permissionError) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg border mb-4"
        style={{
          background: "hsl(0, 100%, 97%)",
          borderColor: "hsl(0, 100%, 40%)",
        }}
      >
        <AlertCircle
          size={18}
          style={{ color: "hsl(0, 100%, 40%)", flexShrink: 0 }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold"
            style={{ color: "hsl(0, 100%, 40%)" }}
          >
            Location Access Required
          </p>
          <p
            className="text-[11px] leading-snug"
            style={{ color: "hsl(0, 100%, 30%)" }}
          >
            {permissionError}
          </p>
        </div>
      </div>
    );
  }

  // Show transmitting indicator when location is being sent
  if (isOnline && isTransmitting) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
        style={{
          background: "hsl(38, 73%, 40%, 0.08)",
          border: "1px solid hsl(38, 73%, 40%, 0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          {/* Pulsating Gold/Green dot */}
          <div className="relative w-3 h-3">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: "hsl(38, 73%, 40%)" }}
            />
            <div
              className="absolute inset-1 rounded-full"
              style={{ background: "hsl(120, 100%, 40%)" }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <MapPin
              size={14}
              style={{ color: "hsl(38, 73%, 40%)" }}
            />
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: "hsl(38, 73%, 40%)" }}
            >
              Transmitting GPS…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
