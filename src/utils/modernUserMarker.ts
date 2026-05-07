import L from "leaflet";

/**
 * Creates a professional Google Maps-style user location marker.
 * Features a blue dot with white border and subtle shadow - clean and modern.
 */
export const createModernUserMarker = (lat: number, lng: number, map: L.Map) => {
  const userIcon = L.divIcon({
    className: "modern-user-marker",
    html: `
      <div style="
        position: relative;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Outer white ring (professional border) -->
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid #1976D2;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.25);
        "></div>
        
        <!-- Inner blue dot -->
        <div style="
          position: relative;
          z-index: 10;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1976D2;
          box-shadow: 0 0 16px rgba(25, 118, 210, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.3);
        "></div>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28],
  });

  const marker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
  marker.bindPopup("📍 Your Location");

  return marker;
};

/**
 * Updates the position of the modern user marker with smooth animation.
 */
export const updateModernUserMarker = (
  marker: L.Marker | null,
  lat: number,
  lng: number,
  map: L.Map
) => {
  if (!marker) {
    return createModernUserMarker(lat, lng, map);
  }

  const startLatLng = marker.getLatLng();
  const startTime = Date.now();
  const duration = 600; // ms - smooth but responsive

  const animatePosition = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-in-out cubic for smooth motion
    const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    const newLat = startLatLng.lat + (lat - startLatLng.lat) * easeProgress;
    const newLng = startLatLng.lng + (lng - startLatLng.lng) * easeProgress;

    marker.setLatLng([newLat, newLng]);

    if (progress < 1) {
      requestAnimationFrame(animatePosition);
    }
  };

  animatePosition();
  return marker;
};
