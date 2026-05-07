/**
 * Debug utility for geolocation troubleshooting.
 * Provides detailed logging and permission status checking.
 */

export const checkGeolocationSupport = () => {
  if (!navigator.geolocation) {
    console.error("[Geolocation] Not supported by browser");
    return false;
  }
  console.log("[Geolocation] Supported and available");
  return true;
};

export const getGeolocationStatus = async () => {
  if (!navigator.geolocation) {
    return "NOT_SUPPORTED";
  }

  return new Promise<string>((resolve) => {
    // Try to get position to check permissions
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("[Geolocation] Status: PERMITTED", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        resolve("PERMITTED");
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.warn("[Geolocation] Status: PERMISSION_DENIED - Enable location in browser settings");
            resolve("PERMISSION_DENIED");
            break;
          case error.POSITION_UNAVAILABLE:
            console.warn("[Geolocation] Status: POSITION_UNAVAILABLE - Location services may be disabled");
            resolve("POSITION_UNAVAILABLE");
            break;
          case error.TIMEOUT:
            console.warn("[Geolocation] Status: TIMEOUT - Location request timed out");
            resolve("TIMEOUT");
            break;
          default:
            console.warn("[Geolocation] Status: UNKNOWN_ERROR");
            resolve("UNKNOWN");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
};

export const logLocationData = (
  lat: number,
  lng: number,
  accuracy: number | undefined,
  label: string = ""
) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[Location ${timestamp}${label ? ` - ${label}` : ""}]`, {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy ? `±${accuracy.toFixed(0)}m` : "N/A",
  });
};
