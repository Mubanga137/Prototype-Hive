import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { RoadSnapper } from "@/utils/roadSnapping";

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
  isSnapped?: boolean;
  snapConfidence?: number;
}

interface UseHighAccuracyLocationReturn {
  location: LocationState | null;
  isTransmitting: boolean;
  hasPermission: boolean | null;
  permissionError: string | null;
  isOnline: boolean;
  locationStatus: "locating" | "tracking" | "error" | "idle";
  startTracking: () => void;
  stopTracking: () => void;
}

const EARTH_RADIUS = 6371000; // meters

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = degreesToRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(degreesToRadians(lat2));
  const x =
    Math.cos(degreesToRadians(lat1)) * Math.sin(degreesToRadians(lat2)) -
    Math.sin(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return ((degreesToRadians(bearing) * 180) / Math.PI + 360) % 360;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

export const useHighAccuracyLocation = (
  user: User | null,
  isOnline: boolean
): UseHighAccuracyLocationReturn => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"locating" | "tracking" | "error" | "idle">(
    "idle"
  );

  const watchIdRef = useRef<number | null>(null);
  const lastValidLocationRef = useRef<LocationState | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastSupabaseUpdateRef = useRef<number>(0);
  const throttleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roadSnapperRef = useRef<RoadSnapper>(new RoadSnapper());
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;
  const JUMP_THRESHOLD_METERS = 100;
  const JUMP_TIME_THRESHOLD_MS = 3000;
  const SUPABASE_UPDATE_INTERVAL = 5000;

  if (process.env.NODE_ENV === "development") {
    useEffect(() => {
      console.log("[useHighAccuracyLocation] State:", {
        hasPermission,
        permissionError,
        isOnline,
        locationStatus,
      });
    }, [hasPermission, permissionError, isOnline, locationStatus]);
  }

  const throttledSupabaseUpdate = useCallback(async () => {
    const now = Date.now();

    if (now - lastSupabaseUpdateRef.current < SUPABASE_UPDATE_INTERVAL) {
      return;
    }

    if (!lastValidLocationRef.current || !user) return;

    lastSupabaseUpdateRef.current = now;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          current_lat: lastValidLocationRef.current.latitude,
          current_long: lastValidLocationRef.current.longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("[useHighAccuracyLocation] Supabase update error:", error.message);
        return;
      }

      if (isMountedRef.current) {
        setIsTransmitting(true);
      }
    } catch (err) {
      console.error("[useHighAccuracyLocation] Location update failed:", err);
    }
  }, [user]);

  const validateAndFilterLocation = useCallback(
    (newLocation: LocationState): { valid: boolean; reason?: string } => {
      // Check if location is valid (non-zero, with reasonable accuracy)
      if (newLocation.latitude === 0 || newLocation.longitude === 0) {
        return { valid: false, reason: "Invalid coordinates (zero)" };
      }

      if (!Number.isFinite(newLocation.latitude) || !Number.isFinite(newLocation.longitude)) {
        return { valid: false, reason: "Invalid coordinates (non-finite)" };
      }

      // Check latitude range
      if (Math.abs(newLocation.latitude) > 90) {
        return { valid: false, reason: "Invalid latitude" };
      }

      // Check longitude range
      if (Math.abs(newLocation.longitude) > 180) {
        return { valid: false, reason: "Invalid longitude" };
      }

      // If we have a previous valid location, check for erratic jumps
      if (lastValidLocationRef.current) {
        const timeDelta = newLocation.timestamp! - lastValidLocationRef.current.timestamp!;
        if (timeDelta > 0) {
          const distance = calculateDistance(
            lastValidLocationRef.current.latitude,
            lastValidLocationRef.current.longitude,
            newLocation.latitude,
            newLocation.longitude
          );

          // Flag jumps > 100m within 3 seconds
          if (distance > JUMP_THRESHOLD_METERS && timeDelta < JUMP_TIME_THRESHOLD_MS) {
            console.warn(
              `[useHighAccuracyLocation] Erratic jump detected: ${distance.toFixed(2)}m in ${timeDelta}ms. Discarding.`
            );
            return { valid: false, reason: `Jump too large (${distance.toFixed(0)}m in ${timeDelta}ms)` };
          }
        }
      }

      return { valid: true };
    },
    []
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionError("Geolocation is not supported by your browser.");
      setHasPermission(false);
      setLocationStatus("error");
      return;
    }

    setPermissionError(null);
    setLocationStatus("locating");
    let permissionDenied = false;

    // Request one-time position to check permissions (no error toast here)
    navigator.geolocation.getCurrentPosition(
      () => {
        setHasPermission(true);
      },
      (err) => {
        permissionDenied = true;
        setHasPermission(false);
        setLocationStatus("error");

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setPermissionError("Location access denied");
            break;
          case err.POSITION_UNAVAILABLE:
            setPermissionError("Location is unavailable. Enable location services on your device.");
            break;
          case err.TIMEOUT:
            setPermissionError("Location request timed out. Retrying...");
            retryCountRef.current++;
            break;
          default:
            setPermissionError("Could not retrieve location.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    const watchSetupTimer = setTimeout(() => {
      if (!isMountedRef.current || permissionDenied) {
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          const newLocation: LocationState = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: now,
          };

          // Calculate speed if we have a previous location
          if (lastValidLocationRef.current) {
            const timeDelta = (now - lastValidLocationRef.current.timestamp!) / 1000; // seconds
            if (timeDelta > 0) {
              const distance = calculateDistance(
                lastValidLocationRef.current.latitude,
                lastValidLocationRef.current.longitude,
                newLocation.latitude,
                newLocation.longitude
              );
              newLocation.speed = distance / timeDelta; // m/s
              newLocation.heading = calculateBearing(
                lastValidLocationRef.current.latitude,
                lastValidLocationRef.current.longitude,
                newLocation.latitude,
                newLocation.longitude
              );
            }
          }

          // Validate and filter
          const validation = validateAndFilterLocation(newLocation);

          if (validation.valid) {
            // Apply road snapping via OSRM map matching
            const snappedPoint = await roadSnapperRef.current.addPoint({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              timestamp: now,
            });

            if (snappedPoint) {
              newLocation.latitude = snappedPoint.latitude;
              newLocation.longitude = snappedPoint.longitude;
              newLocation.isSnapped = snappedPoint.isSnapped;
              newLocation.snapConfidence = snappedPoint.confidence;
            }

            lastValidLocationRef.current = newLocation;
            lastUpdateTimeRef.current = now;

            if (isMountedRef.current) {
              setLocation(newLocation);
              setHasPermission(true);
              setPermissionError(null);
              setLocationStatus("tracking");
              retryCountRef.current = 0;
            }
          } else {
            if (process.env.NODE_ENV === "development") {
              console.warn(`[useHighAccuracyLocation] Location rejected: ${validation.reason}`);
            }
          }
        },
        (err) => {
          if (isMountedRef.current) {
            if (err.code !== 1) {
              console.error("[useHighAccuracyLocation] Watch error:", err.message);
            }

            setHasPermission(false);
            setLocationStatus("error");

            switch (err.code) {
              case err.PERMISSION_DENIED:
                setPermissionError("Location access denied");
                break;
              case err.POSITION_UNAVAILABLE:
                setPermissionError("Location unavailable. Enable GPS on your device.");
                break;
              case err.TIMEOUT:
                setPermissionError("Location request timed out");
                retryCountRef.current++;
                break;
              default:
                setPermissionError("Could not retrieve location");
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
  }, [validateAndFilterLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (throttleIntervalRef.current) {
      clearInterval(throttleIntervalRef.current);
      throttleIntervalRef.current = null;
    }

    // Flush any pending batch and reset road snapper
    roadSnapperRef.current.reset();

    lastValidLocationRef.current = null;
    lastUpdateTimeRef.current = 0;
    lastSupabaseUpdateRef.current = 0;
    retryCountRef.current = 0;

    if (isMountedRef.current) {
      setIsTransmitting(false);
      setLocationStatus("idle");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!user || !isOnline) {
      stopTracking();
      return;
    }

    const watchSetupCleanup = startTracking();

    // Throttled update interval for Supabase
    throttleIntervalRef.current = setInterval(() => {
      throttledSupabaseUpdate();
    }, 1000);

    return () => {
      if (watchSetupCleanup) {
        watchSetupCleanup();
      }
      stopTracking();
    };
  }, [user, isOnline, startTracking, stopTracking, throttledSupabaseUpdate]);

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
    locationStatus,
    startTracking,
    stopTracking,
  };
};
