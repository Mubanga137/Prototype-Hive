# Enterprise GPS Filtering Hook - Integration Guide

## Overview
The `useFilteredLocation` hook provides enterprise-grade GPS filtering for gig workers, handling erratic device GPS signals with Haversine distance calculations and bearing/speed vector mathematics.

## Hook Location
`src/hooks/useFilteredLocation.ts`

## What It Does

### High-Accuracy GPS Tracking
- Uses `navigator.geolocation.watchPosition` with:
  - `enableHighAccuracy: true`
  - `maximumAge: 0` (always fresh)
  - `timeout: 5000ms`

### Anti-Jitter Filtering (Haversine Math)
- Calculates precise distance between points using Haversine formula
- **Rule**: Discards jumps > 100 meters within 3 seconds
- Prevents GPS signal noise from corrupting location data

### Vector Mathematics
- **Bearing**: Calculates heading/bearing (0-360°) using atan2
- **Speed**: Computes real velocity (m/s) from distance and time delta
- Provides accurate trajectory data for gig worker movement

### Return State
```typescript
{
  latitude: number | null,        // Current latitude
  longitude: number | null,       // Current longitude
  bearing: number,                // 0-360 degrees
  speed: number,                  // meters per second
  isValidating: boolean,          // Still acquiring GPS
  accuracy: number | null,        // Horizontal accuracy (meters)
  timestamp: number,              // Last update timestamp
  isPrecise: boolean,             // accuracy < 20 meters
  getMarkerTransitionConfig: () => ({
    duration: 800,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    delay: 0
  })
}
```

### Pristine Cleanup
- Clears watch position on unmount
- Clears any pending timeouts
- Sets unmounting flag to prevent state updates

## Integration Example

### In GigRadar.tsx (src/pages/GigRadar.tsx)

```typescript
import { useFilteredLocation } from "@/hooks/useFilteredLocation";

const GigRadar = () => {
  // Replace or supplement existing location hook
  const filteredLocation = useFilteredLocation();
  
  // Use the filtered data
  const { latitude, longitude, bearing, speed, isValidating } = filteredLocation;
  
  // For react-leaflet marker transitions
  const transitionConfig = filteredLocation.getMarkerTransitionConfig();
  
  return (
    // Your existing map and components
  );
};
```

### Replacing useLocationService

If you want to replace the existing `useLocationService`, update the imports:

**Before:**
```typescript
import { useLocationService } from "@/hooks/gig-radar/useLocationService";

const { location, isOnline, setIsOnline } = useLocationService();
```

**After:**
```typescript
import { useFilteredLocation } from "@/hooks/useFilteredLocation";

const gpsData = useFilteredLocation();
const location = { lat: gpsData.latitude, lng: gpsData.longitude };
```

## Key Features

### 1. Haversine Distance Formula
Calculates great-circle distance between two points on Earth:
- Earth radius: 6,371 km (6,371,000 meters)
- Used for jump validation

### 2. Bearing Calculation
Uses atan2 to compute direction between points:
- Returns 0-360 degrees
- 0° = North, 90° = East, 180° = South, 270° = West

### 3. Speed Calculation
`speed (m/s) = distance (m) / time (s)`

### 4. Marker Transition Config
Provides smooth animation config:
- 800ms duration with ease-out timing
- Prevents jarring marker jumps on screen

## Performance Considerations

- **Low CPU Usage**: Math calculations only on valid jumps
- **Network Silent**: No Supabase calls in hook (just data provider)
- **Memory Efficient**: Only stores previous point reference
- **Battery Optimized**: Respects geolocation timeout

## Error Handling

- Gracefully handles geolocation unavailability
- Returns null for coordinates if permission denied
- `isValidating` flag indicates GPS acquisition status
- `accuracy` metric helps apps decide confidence level

## Testing the Hook

```typescript
const MyComponent = () => {
  const location = useFilteredLocation();
  
  return (
    <div>
      <p>Lat: {location.latitude}</p>
      <p>Lng: {location.longitude}</p>
      <p>Speed: {location.speed.toFixed(2)} m/s</p>
      <p>Bearing: {location.bearing.toFixed(0)}°</p>
      <p>Validating: {location.isValidating ? 'Yes' : 'No'}</p>
      <p>Precise: {location.isPrecise ? 'Yes' : 'No'}</p>
    </div>
  );
};
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 13.1+)
- Requires HTTPS (except localhost)

## Silent Integration

This hook is designed to integrate silently into `/gig-radar`:
- No UI changes needed
- No console logging (use browser DevTools to inspect)
- Just provide the filtered data to existing components
- Existing map layers continue working
