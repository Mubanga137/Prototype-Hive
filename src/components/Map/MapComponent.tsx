import React, { useCallback, forwardRef } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl, MapRef } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapComponentProps {
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
  children?: React.ReactNode;
  onMapLoad?: () => void;
}

const MapComponentImpl = forwardRef<MapRef, MapComponentProps>(({
  initialLng = 0,
  initialLat = 0,
  initialZoom = 12,
  children,
  onMapLoad,
}, mapRef) => {
  const handleMapLoad = useCallback(() => {
    onMapLoad?.();
  }, [onMapLoad]);

  return (
    <div className="w-full h-full overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: initialLng,
          latitude: initialLat,
          zoom: initialZoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4"
        touchPitch={true}
        dragPan={true}
        doubleClickZoom={true}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        {children}
      </Map>
    </div>
  );
});

MapComponentImpl.displayName = 'MapComponent';

export default MapComponentImpl;
