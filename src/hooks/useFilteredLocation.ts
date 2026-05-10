import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  bearing: number; // 0-360 degrees
  speed: number; // m/s
  isValidating: boolean;
  accuracy: number | null;
  timestamp: number;
}

interface ValidPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const EARTH_RADIUS_METERS = 6371000;
const MAX_JUMP_DISTANCE = 100; // meters
const MAX_JUMP_TIME = 3000; // milliseconds
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 5000,
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

const calculateHaversineDistance = (point1: ValidPoint, point2: ValidPoint): number => {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const calculateBearing = (point1: ValidPoint, point2: ValidPoint): number => {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = toDegrees(Math.atan2(y, x));

  return (bearing + 360) % 360;
};

const calculateSpeed = (distance: number, timeDeltaMs: number): number => {
  if (timeDeltaMs === 0) return 0;
  return distance / (timeDeltaMs / 1000);
};

const isValidJump = (prevPoint: ValidPoint, newPoint: ValidPoint): boolean => {
  const distance = calculateHaversineDistance(prevPoint, newPoint);
  const timeDelta = newPoint.timestamp - prevPoint.timestamp;

  if (distance > MAX_JUMP_DISTANCE && timeDelta < MAX_JUMP_TIME) {
    return false;
  }

  return true;
};

export const useFilteredLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    bearing: 0,
    speed: 0,
    isValidating: true,
    accuracy: null,
    timestamp: Date.now(),
  });

  const prevPointRef = useRef<ValidPoint | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isUnmountingRef = useRef(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    if (isUnmountingRef.current) return;

    const newPoint: ValidPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
    };

    const prevPoint = prevPointRef.current;

    if (!prevPoint) {
      prevPointRef.current = newPoint;
      setLocation((prev) => ({
        ...prev,
        latitude: newPoint.latitude,
        longitude: newPoint.longitude,
        accuracy: position.coords.accuracy,
        timestamp: newPoint.timestamp,
        isValidating: false,
      }));
      return;
    }

    if (!isValidJump(prevPoint, newPoint)) {
      return;
    }

    const distance = calculateHaversineDistance(prevPoint, newPoint);
    const timeDelta = newPoint.timestamp - prevPoint.timestamp;
    const bearing = calculateBearing(prevPoint, newPoint);
    const speed = calculateSpeed(distance, timeDelta);

    prevPointRef.current = newPoint;

    if (isUnmountingRef.current) return;

    setLocation((prev) => ({
      ...prev,
      latitude: newPoint.latitude,
      longitude: newPoint.longitude,
      bearing,
      speed,
      accuracy: position.coords.accuracy,
      timestamp: newPoint.timestamp,
      isValidating: false,
    }));
  }, []);

  const handlePositionError = useCallback(() => {
    if (isUnmountingRef.current) return;
    setLocation((prev) => ({
      ...prev,
      isValidating: false,
    }));
  }, []);

  useEffect(() => {
    isUnmountingRef.current = false;

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      setLocation((prev) => ({
        ...prev,
        isValidating: false,
      }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      GEOLOCATION_OPTIONS
    );

    return () => {
      isUnmountingRef.current = true;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      prevPointRef.current = null;
    };
  }, [handlePositionSuccess, handlePositionError]);

  const getMarkerTransitionConfig = useCallback(() => {
    return {
      duration: 800,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      delay: 0,
    };
  }, []);

  return {
    ...location,
    getMarkerTransitionConfig,
    isPrecise: location.accuracy !== null && location.accuracy < 20,
  };
};

export default useFilteredLocation;
