import { useState, useEffect } from "react";

interface GuestTrackingState {
  isGuest: boolean;
  trackingToken: string | null;
  hasValidToken: boolean;
}

/**
 * Hook to get guest tracking token from localStorage
 * Expects: JSON array of tokens [uuid1, uuid2, ...]
 * Most recent token is at index 0
 */
export const useGuestTracking = (): GuestTrackingState => {
  const [state, setState] = useState<GuestTrackingState>({
    isGuest: false,
    trackingToken: null,
    hasValidToken: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hive_guest_active_cart");

      if (!stored) {
        setState({
          isGuest: false,
          trackingToken: null,
          hasValidToken: false,
        });
        return;
      }

      let trackingToken: string | null = null;

      try {
        const parsed = JSON.parse(stored);

        // PRIMARY: Array format (standard)
        if (Array.isArray(parsed)) {
          trackingToken = parsed.find((t) => typeof t === "string" && t.length >= 36) || null;
        }
        // FALLBACK: Object format (migration from old code)
        else if (parsed?.trackingTokens && Array.isArray(parsed.trackingTokens)) {
          trackingToken = parsed.trackingTokens.find((t: any) => typeof t === "string" && t.length >= 36) || null;
        } else if (parsed?.mostRecent && typeof parsed.mostRecent === "string") {
          trackingToken = parsed.mostRecent.length >= 36 ? parsed.mostRecent : null;
        }
        // LAST RESORT: Direct string token
        else if (typeof parsed === "string" && parsed.length >= 36) {
          trackingToken = parsed;
        }
      } catch {
        // Try as direct string
        if (typeof stored === "string" && stored.length >= 36) {
          trackingToken = stored;
        }
      }

      setState({
        isGuest: !!trackingToken,
        trackingToken: trackingToken,
        hasValidToken: !!trackingToken,
      });
    } catch (error) {
      console.error("[useGuestTracking] Error reading guest token:", error);
      setState({
        isGuest: false,
        trackingToken: null,
        hasValidToken: false,
      });
    }
  }, []);

  return state;
};
