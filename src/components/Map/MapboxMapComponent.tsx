import React, { useCallback, forwardRef } from 'react';
import Map, { NavigationControl, GeolocateControl, MapRef } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

interface MapboxMapComponentProps {
  initialLng?: number;
  initialLat?: number;
  initialZoom?: number;
  children?: React.ReactNode;
  onMapLoad?: () => void;
  onMove?: (viewState: ViewState) => void;
  viewState?: ViewState;
  style?: 'mapbox://styles/mapbox/streets-v12' | 'mapbox://styles/mapbox/navigation-night-v1' | string;
  pitch?: number;
  bearing?: number;
  disableControls?: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidGhlLWhpdmUiLCJhIjoiY21wNXdidmV5MDFlYzJwc2wydzZ1NXoyYSJ9.ImuunrlyiRHMEfwO8TaQnQ';
mapboxgl.accessToken = MAPBOX_TOKEN;

const MapboxMapComponentImpl = forwardRef<MapRef, MapboxMapComponentProps>(({
  initialLng = 0,
  initialLat = 0,
  initialZoom = 12,
  children,
  onMapLoad,
  onMove,
  viewState,
  style = 'mapbox://styles/mapbox/streets-v12',
  pitch = 0,
  bearing = 0,
  disableControls = false,
}, mapRef) => {
  const handleMapLoad = useCallback(() => {
    onMapLoad?.();
  }, [onMapLoad]);

  return (
    <div className="w-full h-full overflow-x-hidden">
      <Map
        ref={mapRef}
        {...(viewState ? {
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
          bearing: viewState.bearing || 0,
          pitch: viewState.pitch || 0,
          onMove: (e) => onMove?.(e.viewState),
        } : {
          initialViewState: {
            longitude: initialLng,
            latitude: initialLat,
            zoom: initialZoom,
            pitch: 0,
            bearing: 0,
          },
        })}
        style={{ width: '100%', height: '100%' }}
        mapStyle={style}
        accessToken={MAPBOX_TOKEN}
        touchPitch={!disableControls}
        dragPan={true}
        doubleClickZoom={true}
        dragRotate={true}
        scrollZoom={true}
        onLoad={handleMapLoad}
      >
        {!disableControls && <NavigationControl position="top-right" />}
        {!disableControls && (
          <GeolocateControl
            position="top-right"
            trackUserLocation={true}
            showUserHeading={true}
            positionOptions={{ enableHighAccuracy: true }}
            fitBoundsOptions={{ maxZoom: 18, padding: 50 }}
          />
        )}
        {children}
      </Map>
    </div>
  );
});

MapboxMapComponentImpl.displayName = 'MapboxMapComponent';

export default MapboxMapComponentImpl;
