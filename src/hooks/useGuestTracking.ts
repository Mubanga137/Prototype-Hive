import { useState, useEffect } from "react";

interface GuestTrackingState {
  isGuest: boolean;
  trackingToken: string | null;
  hasValidToken: boolean;
}

/**
 * Hook to get guest tracking token from localStorage
 * Handles both single token and array of tokens
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

      // Parse stored data - could be array or single token
      let tokens: string[] = [];
      try {
        const parsed = JSON.parse(stored);
        tokens = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        tokens = [stored];
      }

      // Get the first valid token (36-char UUID format)
      const validToken = tokens.find((t) => typeof t === "string" && t.length >= 36);

      setState({
        isGuest: !!validToken,
        trackingToken: validToken || null,
        hasValidToken: !!validToken,
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
