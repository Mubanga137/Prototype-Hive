import L from "leaflet";

interface AnimationOptions {
  duration?: number;
  easing?: (progress: number) => number;
}

// Ease-in-out cubic easing function
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Smoothly animates a Leaflet marker from its current position to a new position.
 * Uses requestAnimationFrame for 60fps smooth motion.
 */
export const animateMarkerToPosition = (
  marker: L.Marker,
  newLat: number,
  newLng: number,
  options: AnimationOptions = {}
): Promise<void> => {
  return new Promise((resolve) => {
    const { duration = 800, easing = easeInOutCubic } = options;

    const startLatLng = marker.getLatLng();
    const startTime = Date.now();
    const latDelta = newLat - startLatLng.lat;
    const lngDelta = newLng - startLatLng.lng;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const currentLat = startLatLng.lat + latDelta * easedProgress;
      const currentLng = startLatLng.lng + lngDelta * easedProgress;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        marker.setLatLng([newLat, newLng]);
        resolve();
      }
    };

    animate();
  });
};

/**
 * Animates multiple markers in sequence
 */
export const animateMarkersSequential = async (
  markers: Array<{ marker: L.Marker; lat: number; lng: number }>,
  options: AnimationOptions = {}
): Promise<void> => {
  for (const item of markers) {
    await animateMarkerToPosition(item.marker, item.lat, item.lng, options);
  }
};

/**
 * Animates multiple markers in parallel
 */
export const animateMarkersParallel = (
  markers: Array<{ marker: L.Marker; lat: number; lng: number }>,
  options: AnimationOptions = {}
): Promise<void> => {
  const promises = markers.map(({ marker, lat, lng }) =>
    animateMarkerToPosition(marker, lat, lng, options)
  );
  return Promise.all(promises).then(() => {});
};
