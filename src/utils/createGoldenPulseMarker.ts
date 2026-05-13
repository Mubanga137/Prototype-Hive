export interface GoldenPulseMarkerOptions {
  size?: number;
  animationDuration?: number;
}

export const createGoldenPulseMarker = (
  lat: number,
  lng: number,
  options: GoldenPulseMarkerOptions = {}
) => {
  const { size = 60, animationDuration = 2000 } = options;

  const markerEl = document.createElement('div');
  markerEl.style.position = 'relative';
  markerEl.style.width = `${size}px`;
  markerEl.style.height = `${size}px`;
  markerEl.style.display = 'flex';
  markerEl.style.alignItems = 'center';
  markerEl.style.justifyContent = 'center';

  // Outer pulsing ring
  const outer = document.createElement('div');
  outer.style.position = 'absolute';
  outer.style.width = `${size / 2}px`;
  outer.style.height = `${size / 2}px`;
  outer.style.borderRadius = '50%';
  outer.style.background = 'rgba(179, 124, 28, 0.4)';
  outer.style.backdropFilter = 'blur(4px)';
  outer.style.animation = `goldenPing ${animationDuration}ms cubic-bezier(0, 0, 0.2, 1) infinite`;
  markerEl.appendChild(outer);

  // Solid gold center dot
  const center = document.createElement('div');
  center.style.position = 'relative';
  center.style.zIndex = '10';
  center.style.width = `${size / 6}px`;
  center.style.height = `${size / 6}px`;
  center.style.borderRadius = '50%';
  center.style.background = '#B37C1C';
  center.style.boxShadow = '0 0 12px rgba(179, 124, 28, 0.8)';
  markerEl.appendChild(center);

  injectGoldenPingAnimation();

  return markerEl;
};

export const injectGoldenPingAnimation = () => {
  if (document.getElementById('golden-ping-animation')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'golden-ping-animation';
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

    .mapboxgl-popup-content {
      background: #FFFBF2;
      color: #0F1A35;
      border-radius: 8px;
    }
  `;

  document.head.appendChild(style);
};
