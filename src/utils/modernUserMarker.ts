export const createModernUserMarker = (): HTMLElement => {
  const markerEl = document.createElement('div');
  markerEl.className = 'modern-user-marker';
  markerEl.style.width = '56px';
  markerEl.style.height = '56px';
  markerEl.style.display = 'flex';
  markerEl.style.alignItems = 'center';
  markerEl.style.justifyContent = 'center';
  markerEl.style.position = 'relative';

  // Outer white ring
  const ring = document.createElement('div');
  ring.style.position = 'absolute';
  ring.style.width = '28px';
  ring.style.height = '28px';
  ring.style.borderRadius = '50%';
  ring.style.background = 'white';
  ring.style.border = '3px solid #1976D2';
  ring.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.25)';
  markerEl.appendChild(ring);

  // Inner blue dot
  const dot = document.createElement('div');
  dot.style.position = 'relative';
  dot.style.zIndex = '10';
  dot.style.width = '16px';
  dot.style.height = '16px';
  dot.style.borderRadius = '50%';
  dot.style.background = '#1976D2';
  dot.style.boxShadow = '0 0 16px rgba(25, 118, 210, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.3)';
  markerEl.appendChild(dot);

  return markerEl;
};

export const updateModernUserMarkerPosition = (
  marker: HTMLElement,
  lat: number,
  lng: number,
  duration: number = 600
): void => {
  // MapLibre Markers handle position updates automatically
  // This is kept for API compatibility with the old code
  marker.style.transition = `all ${duration}ms ease-in-out`;
};
