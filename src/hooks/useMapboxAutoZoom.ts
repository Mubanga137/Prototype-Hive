import { useEffect } from 'react';
import { MapRef } from 'react-map-gl';

interface AutoZoomOptions {
  padding?: number;
  duration?: number;
}

export function useMapboxAutoZoom(
  mapRef: React.RefObject<MapRef>,
  coordinates: [number, number][] | null | undefined,
  options: AutoZoomOptions = {}
) {
  const { padding = 50, duration = 800 } = options;

  useEffect(() => {
    if (!mapRef.current || !coordinates || coordinates.length === 0) {
      return;
    }

    const bounds = coordinates.reduce((acc, [lng, lat]) => {
      return {
        minLng: Math.min(acc.minLng, lng),
        maxLng: Math.max(acc.maxLng, lng),
        minLat: Math.min(acc.minLat, lat),
        maxLat: Math.max(acc.maxLat, lat),
      };
    }, {
      minLng: coordinates[0][0],
      maxLng: coordinates[0][0],
      minLat: coordinates[0][1],
      maxLat: coordinates[0][1],
    });

    mapRef.current.fitBounds(
      [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
      { padding, duration }
    );
  }, [coordinates, padding, duration]);
}
