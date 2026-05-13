export interface AccuracyCircleGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    radius: number;
  };
}

export const createAccuracyCircleGeoJSON = (
  lat: number,
  lng: number,
  accuracyMeters: number
): AccuracyCircleGeoJSON => {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    properties: {
      radius: Math.max(accuracyMeters, 300),
    },
  };
};

// For rendering circles in MapLibre, we need to use a layer with paint properties
export const getAccuracyCircleLayerConfig = () => ({
  id: 'accuracy-circle',
  type: 'circle' as const,
  source: 'accuracy-circle-source',
  paint: {
    'circle-radius': {
      type: 'exponential' as const,
      stops: [[0, 0], [20, 10000]],
      base: 2,
    },
    'circle-color': '#B37C1C',
    'circle-opacity': 0.08,
    'circle-stroke-color': '#B37C1C',
    'circle-stroke-width': 1.5,
    'circle-stroke-opacity': 0.4,
  },
});
