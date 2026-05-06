import { useState, useCallback, useRef } from "react";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface UseLocationPermissionReturn {
  coordinates: LocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  isPermissionDenied: boolean;
  requestLocation: () => Promise<LocationCoordinates | null>;
  clearError: () => void;
}

export const useLocationPermission = (): UseLocationPermissionReturn => {
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const requestLocation = useCallback(
    () =>
      new Promise<LocationCoordinates | null>((resolve) => {
        setIsLoading(true);
        setError(null);
        setIsPermissionDenied(false);

        if (!navigator.geolocation) {
          setError("Geolocation is not supported by your browser");
          setIsLoading(false);
          resolve(null);
          return;
        }

        // Create timeout for position request
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
          setError("Location request timed out. Please try again.");
          setIsLoading(false);
          resolve(null);
        }, 15000); // 15 second timeout

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            const coords: LocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setCoordinates(coords);
            setIsLoading(false);
            setError(null);
            setIsPermissionDenied(false);
            resolve(coords);
          },
          (positionError) => {
            clearTimeout(timeoutId);
            setIsLoading(false);

            switch (positionError.code) {
              case positionError.PERMISSION_DENIED:
                setError("Location permission denied");
                setIsPermissionDenied(true);
                resolve(null);
                break;
              case positionError.POSITION_UNAVAILABLE:
                setError("📍 Device Location Off: Please turn on your phone GPS to connect.");
                setIsPermissionDenied(true);
                resolve(null);
                break;
              case positionError.TIMEOUT:
                setError("Location request timed out. Please try again.");
                resolve(null);
                break;
              default:
                setError("Unable to retrieve your location. Please try again.");
                resolve(null);
            }
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }),
    []
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsPermissionDenied(false);
  }, []);

  return {
    coordinates,
    isLoading,
    error,
    isPermissionDenied,
    requestLocation,
    clearError,
  };
};
