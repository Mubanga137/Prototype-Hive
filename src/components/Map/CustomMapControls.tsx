import React, { useCallback, useRef } from 'react';
import { useControl } from 'react-map-gl';
import { MapRef } from 'react-map-gl';
import { ZoomIn, ZoomOut, MapPin } from 'lucide-react';

interface CustomMapControlsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onLocationClick?: () => void;
  onViewToggle?: () => void;
  is3DView?: boolean;
}

const GOLD = '#B37C1C';
const NAVY = '#0F1A35';

export const CustomMapControls = ({
  position = 'top-right',
  onLocationClick,
  onViewToggle,
  is3DView = false,
}: CustomMapControlsProps) => {
  const mapRef = useRef<MapRef>(null);

  useControl<HTMLDivElement>(() => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.padding = '8px';
    container.style.zIndex = '10';

    // Position the control
    if (position === 'top-right') {
      container.style.top = '8px';
      container.style.right = '8px';
    } else if (position === 'top-left') {
      container.style.top = '8px';
      container.style.left = '8px';
    } else if (position === 'bottom-right') {
      container.style.bottom = '8px';
      container.style.right = '8px';
    } else if (position === 'bottom-left') {
      container.style.bottom = '8px';
      container.style.left = '8px';
    }

    // Zoom In button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M2 10h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    zoomInBtn.style.width = '40px';
    zoomInBtn.style.height = '40px';
    zoomInBtn.style.borderRadius = '4px';
    zoomInBtn.style.background = '#FFFFFF';
    zoomInBtn.style.border = `1px solid ${GOLD}`;
    zoomInBtn.style.cursor = 'pointer';
    zoomInBtn.style.color = NAVY;
    zoomInBtn.style.display = 'flex';
    zoomInBtn.style.alignItems = 'center';
    zoomInBtn.style.justifyContent = 'center';
    zoomInBtn.style.transition = 'all 0.2s';
    zoomInBtn.onmouseover = () => {
      zoomInBtn.style.background = GOLD;
      zoomInBtn.style.color = '#FFFFFF';
    };
    zoomInBtn.onmouseout = () => {
      zoomInBtn.style.background = '#FFFFFF';
      zoomInBtn.style.color = NAVY;
    };
    zoomInBtn.onclick = () => {
      const map = mapRef.current;
      if (map) map.zoomIn();
    };

    // Zoom Out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    zoomOutBtn.style.width = '40px';
    zoomOutBtn.style.height = '40px';
    zoomOutBtn.style.borderRadius = '4px';
    zoomOutBtn.style.background = '#FFFFFF';
    zoomOutBtn.style.border = `1px solid ${GOLD}`;
    zoomOutBtn.style.cursor = 'pointer';
    zoomOutBtn.style.color = NAVY;
    zoomOutBtn.style.display = 'flex';
    zoomOutBtn.style.alignItems = 'center';
    zoomOutBtn.style.justifyContent = 'center';
    zoomOutBtn.style.transition = 'all 0.2s';
    zoomOutBtn.onmouseover = () => {
      zoomOutBtn.style.background = GOLD;
      zoomOutBtn.style.color = '#FFFFFF';
    };
    zoomOutBtn.onmouseout = () => {
      zoomOutBtn.style.background = '#FFFFFF';
      zoomOutBtn.style.color = NAVY;
    };
    zoomOutBtn.onclick = () => {
      const map = mapRef.current;
      if (map) map.zoomOut();
    };

    // Location button - below zoom controls
    const locationBtn = document.createElement('button');
    locationBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="3" fill="currentColor"/></svg>';
    locationBtn.style.width = '40px';
    locationBtn.style.height = '40px';
    locationBtn.style.borderRadius = '4px';
    locationBtn.style.background = GOLD;
    locationBtn.style.color = '#FFFFFF';
    locationBtn.style.border = `1px solid ${GOLD}`;
    locationBtn.style.cursor = 'pointer';
    locationBtn.style.display = 'flex';
    locationBtn.style.alignItems = 'center';
    locationBtn.style.justifyContent = 'center';
    locationBtn.style.transition = 'all 0.2s';
    locationBtn.style.marginTop = '8px';
    locationBtn.onmouseover = () => {
      locationBtn.style.background = '#a3691a';
    };
    locationBtn.onmouseout = () => {
      locationBtn.style.background = GOLD;
    };
    locationBtn.onclick = () => {
      onLocationClick?.();
    };

    container.appendChild(zoomInBtn);
    container.appendChild(zoomOutBtn);
    container.appendChild(locationBtn);

    return container;
  });

  return null;
};

export default CustomMapControls;
