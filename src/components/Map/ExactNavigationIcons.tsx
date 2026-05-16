/**
 * Exact navigation icons matching the provided reference images
 * - Gold arrowhead for direction/bearing
 * - Red lollipop pin for locations
 */

// Gold arrowhead icon (chevron style pointing up, rotates with bearing)
export const GoldArrowheadIcon = ({ bearing = 0, size = 48 }: { bearing?: number; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transform: `rotate(${bearing}deg)`,
      transformOrigin: 'center',
      transition: 'transform 0.15s ease-out',
      filter: 'drop-shadow(0 0 8px rgba(179, 124, 28, 0.8))',
    }}
  >
    <defs>
      <linearGradient id="goldArrow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F4D4A8" />
        <stop offset="50%" stopColor="#D4A574" />
        <stop offset="100%" stopColor="#8B5A1C" />
      </linearGradient>
    </defs>
    {/* Chevron/Arrow pointing upward */}
    <path
      d="M 8 28 L 24 12 L 40 28"
      stroke="url(#goldArrow)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Optional: add a second line for thickness */}
    <path
      d="M 24 12 L 32 24"
      stroke="url(#goldArrow)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M 24 12 L 16 24"
      stroke="url(#goldArrow)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Red location pin icon (lollipop style)
export const RedLocationPinIcon = ({
  size = 52,
  type = 'default',
}: {
  size?: number;
  type?: 'pickup' | 'dropoff' | 'default';
}) => (
  <svg
    width={size}
    height={size * 1.27}
    viewBox="0 0 52 66"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
      cursor: 'pointer',
    }}
  >
    <defs>
      {/* Red gradient for pin circle */}
      <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF6B6B" />
        <stop offset="50%" stopColor="#FF4444" />
        <stop offset="100%" stopColor="#CC0000" />
      </linearGradient>

      {/* Glow effect */}
      <filter id="glowPin">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Stick/stem of the lollipop */}
    <line
      x1="26"
      y1="38"
      x2="26"
      y2="64"
      stroke="#333333"
      strokeWidth="4"
      strokeLinecap="round"
      filter="url(#glowPin)"
    />

    {/* Outer circle - Red */}
    <circle
      cx="26"
      cy="26"
      r="22"
      fill="url(#redGradient)"
      filter="url(#glowPin)"
    />

    {/* Inner white circle */}
    <circle cx="26" cy="26" r="16" fill="#FFFFFF" stroke="#CC0000" strokeWidth="1.5" />

    {/* Center marker badge - lighter red for dropoff, darker for pickup */}
    <circle
      cx="26"
      cy="26"
      r="9"
      fill={type === 'pickup' ? '#FF4444' : '#FF9999'}
      opacity={type === 'pickup' ? 1 : 0.85}
    />

    {/* Highlight for 3D depth */}
    <circle cx="20" cy="20" r="6" fill="white" opacity="0.4" />
  </svg>
);
