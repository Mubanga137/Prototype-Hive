import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface LocationState {
  latitude: number;
  longitude: number;
}

interface UseRunnerLocationReturn {
  location: LocationState | null;
  isTransmitting: boolean;
  hasPermission: boolean | null;
  permissionError: string | null;
  isOnline: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

/**
 * High-performance geolocation hook for gig workers.
 * Manages GPS watch lifecycle with throttled Supabase updates.
 * 
 * Usage:
 * const { location, isTransmitting, hasPermission, permissionError } = useRunnerLocation(user, isOnline);
 */
export const useRunnerLocation = (
  user: User | null,
  isOnline: boolean
): UseRunnerLocationReturn => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Debug: log permission state changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useRunnerLocation] Permission state:", {
        hasPermission,
        permissionError,
        isOnline,
      });
    }
  }, [hasPermission, permissionError, isOnline]);

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const latestCoordsRef = useRef<LocationState | null>(null);
  const throttleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Throttle function: ensures Supabase updates fire at most once every 5 seconds.
   * This prevents database spam while maintaining reasonable location freshness.
   */
  const throttledLocationUpdate = useCallback(async () => {
    const now = Date.now();

    if (now - lastUpdateRef.current < 5000) {
      return; // Skip if less than 5 seconds have passed
    }

    if (!latestCoordsRef.current || !user) return;

    lastUpdateRef.current = now;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          current_lat: latestCoordsRef.current.latitude,
          current_long: latestCoordsRef.current.longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("[useRunnerLocation] Supabase update error:", error.message);
        return;
      }

      if (isMountedRef.current) {
        setIsTransmitting(true);
      }
    } catch (err) {
      console.error("[useRunnerLocation] Location update failed:", err);
    }
  }, [user]);

  /**
   * Start watching position and set up throttled updates.
   */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionError("Geolocation is not supported by your browser.");
      setHasPermission(false);
      return;
    }

    setPermissionError(null);
    let permissionDenied = false;

    // Request one-time position to check permissions
    navigator.geolocation.getCurrentPosition(
      () => {
        setHasPermission(true);
      },
      (err) => {
        permissionDenied = true;
        setHasPermission(false);
        // Map geolocation error codes to user-friendly messages
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setPermissionError(
              "Location access denied. Please enable location permissions in your browser settings."
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setPermissionError("Location information is unavailable.");
            break;
          case err.TIMEOUT:
            setPermissionError("Location request timed out. Please try again.");
            break;
          default:
            setPermissionError("Could not retrieve location.");
        }
      }
    );

    // Only set up watch if permission wasn't denied
    // Use a small timeout to let the permission check complete
    const watchSetupTimer = setTimeout(() => {
      if (!isMountedRef.current || permissionDenied) {
        return;
      }

      // Set up continuous watch with high accuracy
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          latestCoordsRef.current = coords;

          if (isMountedRef.current) {
            setLocation(coords);
            setHasPermission(true);
            setPermissionError(null);
          }
        },
        (err) => {
          if (isMountedRef.current) {
            // Only log as error if it's not a permission denied (expected behavior)
            if (err.code !== 1) {
              console.error("[useRunnerLocation] Watch error:", err.message);
            }
            setHasPermission(false);
            switch (err.code) {
              case err.PERMISSION_DENIED:
                setPermissionError(
                  "Location access denied. Please enable location permissions in your browser settings."
                );
                break;
              case err.POSITION_UNAVAILABLE:
                setPermissionError(
                  "Location is not available. Check that location services are enabled."
                );
                break;
              case err.TIMEOUT:
                setPermissionError("Location request timed out. Retrying...");
                break;
              default:
                setPermissionError("Could not retrieve location: " + err.message);
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }, 100);

    return () => clearTimeout(watchSetupTimer);
  }, []);

  /**
   * Stop watching position and clear all timers.
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (throttleIntervalRef.current) {
      clearInterval(throttleIntervalRef.current);
      throttleIntervalRef.current = null;
    }

    latestCoordsRef.current = null;
    lastUpdateRef.current = 0;

    if (isMountedRef.current) {
      setIsTransmitting(false);
    }
  }, []);

  /**
   * Manage tracking lifecycle based on isOnline state and user session.
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (!user || !isOnline) {
      stopTracking();
      return;
    }

    const watchSetupCleanup = startTracking();

    // Set up throttled update interval (check every 1 second if we need to update)
    throttleIntervalRef.current = setInterval(() => {
      throttledLocationUpdate();
    }, 1000);

    return () => {
      if (watchSetupCleanup) {
        watchSetupCleanup();
      }
      stopTracking();
    };
  }, [user, isOnline, startTracking, stopTracking, throttledLocationUpdate]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    isTransmitting,
    hasPermission,
    permissionError,
    isOnline,
    startTracking,
    stopTracking,
  };
};
