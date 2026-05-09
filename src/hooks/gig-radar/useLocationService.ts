import { useState, useEffect, useCallback, useRef } from "react";
import type { Location } from "@/types/gig-radar";

type LocationStatus = "idle" | "requesting" | "ready" | "error";

export const useLocationService = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setLocationStatus("error");
      return;
    }

    setLocationStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: posAccuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setAccuracy(posAccuracy || undefined);
        setLocationStatus("ready");
        setPermissionDenied(false);

        // Start watching location for continuous updates
        startWatchingLocation();
      },
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === 1) {
          // Permission denied
          setPermissionDenied(true);
        }
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const startWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: posAccuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setAccuracy(posAccuracy || undefined);
        setLocationStatus("ready");
      },
      (error) => {
        console.error("Watch position error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // When user goes online, request location
  useEffect(() => {
    if (isOnline) {
      requestLocation();
    } else {
      stopWatchingLocation();
      setLocationStatus("idle");
    }
  }, [isOnline, requestLocation, stopWatchingLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, [stopWatchingLocation]);

  return {
    location,
    isOnline,
    setIsOnline,
    locationStatus,
    permissionDenied,
    setPermissionDenied,
    accuracy,
  };
};
