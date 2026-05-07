import L from "leaflet";

/**
 * Creates a custom Leaflet marker with a golden pulse dot effect.
 * Shows a 10px solid gold center dot surrounded by a 30px translucent outer ring
 * with a CSS ping animation for breathing/sonar effect.
 */
export const createGoldenPulseMarker = (lat: number, lng: number, map: L.Map) => {
  const pulseIcon = L.divIcon({
    className: "golden-pulse-marker",
    html: `
      <div style="
        position: relative;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Outer pulsing ring -->
        <div style="
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(179, 124, 28, 0.4);
          backdrop-filter: blur(4px);
          animation: goldenPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        
        <!-- Solid gold center dot -->
        <div style="
          position: relative;
          z-index: 10;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #B37C1C;
          box-shadow: 0 0 12px rgba(179, 124, 28, 0.8);
        "></div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });

  const marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
  marker.bindPopup("📍 Your Location");

  return marker;
};

/**
 * Updates the position of a golden pulse marker with smooth animation.
 * Call this when location changes to reposition the marker smoothly.
 */
export const updateGoldenPulseMarker = (
  marker: L.Marker | null,
  lat: number,
  lng: number,
  map: L.Map
) => {
  if (!marker) {
    return createGoldenPulseMarker(lat, lng, map);
  }

  const startLatLng = marker.getLatLng();
  const startTime = Date.now();
  const duration = 800; // ms

  const animatePosition = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

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

/**
 * Inject the CSS animation for the golden ping effect.
 * Call this once when your component mounts.
 */
export const injectGoldenPingAnimation = () => {
  // Check if already injected
  if (document.getElementById("golden-ping-animation")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "golden-ping-animation";
  style.textContent = `
    @keyframes goldenPing {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
      75% {
        transform: scale(1.2);
        opacity: 0;
      }
      100% {
        transform: scale(1.4);
        opacity: 0;
      }
    }

    .golden-pulse-marker {
      filter: drop-shadow(0 2px 8px rgba(179, 124, 28, 0.3));
    }
  `;

  document.head.appendChild(style);
};
