import { useEffect, useRef } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapLibreMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  style?: string;
  children?: React.ReactNode;
  onLoad?: () => void;
  className?: string;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  latitude = 0,
  longitude = 0,
  zoom = 12,
  style = 'https://api.maptiler.com/maps/streets-v2/style.json?key=R4RryNvt4ZjuLtSmPYr4',
  children,
  onLoad,
  className = '',
}) => {
  const mapRef = useRef<any>(null);

  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude,
          latitude,
          zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={style}
        onLoad={onLoad}
        touchPitch={true}
        dragPan={true}
        doubleClickZoom={true}
      >
        <NavigationControl position="top-right" />
        {children}
      </Map>
    </div>
  );
};

export { Source, Layer, Marker };
