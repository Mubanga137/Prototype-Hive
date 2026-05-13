interface AnimationOptions {
  duration?: number;
  easing?: (progress: number) => number;
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const animateMarkerToPosition = async (
  _marker: any,
  _newLat: number,
  _newLng: number,
  _options: AnimationOptions = {}
): Promise<void> => {
  // MapLibre handles position updates via setLngLat on markers
  // This is kept for API compatibility only
  return Promise.resolve();
};

export const animateMarkersSequential = async (
  markers: Array<{ marker: any; lat: number; lng: number }>,
  _options: AnimationOptions = {}
): Promise<void> => {
  for (const item of markers) {
    if (item.marker?.setLngLat) {
      item.marker.setLngLat([item.lng, item.lat]);
    }
  }
};

export const animateMarkersParallel = (
  markers: Array<{ marker: any; lat: number; lng: number }>,
  _options: AnimationOptions = {}
): Promise<void> => {
  markers.forEach(({ marker, lat, lng }) => {
    if (marker?.setLngLat) {
      marker.setLngLat([lng, lat]);
    }
  });
  return Promise.resolve();
};
