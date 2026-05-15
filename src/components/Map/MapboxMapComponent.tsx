import React, { useCallback, forwardRef } from 'react';
import Map, { NavigationControl, GeolocateControl, MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapComponentProps {
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
  children?: React.ReactNode;
  onMapLoad?: () => void;
  style?: 'mapbox://styles/mapbox/streets-v12' | 'mapbox://styles/mapbox/navigation-night-v1' | string;
  pitch?: number;
  bearing?: number;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidGhlLWhpdmUiLCJhIjoiY21wNXdidmV5MDFlYzJwc2wydzZ1NXoyYSJ9.ImuunrlyiRHMEfwO8TaQnQ';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MapboxMapComponentImpl = forwardRef<MapRef, MapboxMapComponentProps>(({
  initialLng = 0,
  initialLat = 0,
  initialZoom = 12,
  children,
  onMapLoad,
  style = 'mapbox://styles/mapbox/streets-v12',
  pitch = 0,
  bearing = 0,
}, mapRef) => {
  const handleMapLoad = useCallback(() => {
    onMapLoad?.();
  }, [onMapLoad]);

  return (
    <div className="w-full h-full overflow-x-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: initialLng,
          latitude: initialLat,
          zoom: initialZoom,
          pitch,
          bearing,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={style}
        accessToken={MAPBOX_TOKEN}
        touchPitch={true}
        dragPan={true}
        doubleClickZoom={true}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showUserHeading={true}
          positionOptions={{ enableHighAccuracy: true }}
          fitBoundsOptions={{ maxZoom: 18, padding: 50 }}
        />
        {children}
      </Map>
    </div>
  );
});

MapboxMapComponentImpl.displayName = 'MapboxMapComponent';

export default MapboxMapComponentImpl;
