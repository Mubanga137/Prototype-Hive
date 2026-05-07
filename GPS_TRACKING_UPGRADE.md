# High-Accuracy GPS Tracking System Upgrade

## Overview

This document describes the comprehensive upgrade of the location tracking system used for riders, runners, and customers across the gig delivery platform. The upgrade implements production-grade GPS accuracy with advanced filtering, smooth animations, and real-time synchronization.

## Implementation Summary

### 1. New High-Accuracy Location Hook (`src/hooks/useHighAccuracyLocation.ts`)

**Key Features:**
- **GPS Configuration**: Uses `navigator.geolocation.watchPosition` with:
  - `enableHighAccuracy: true` - Activates high-precision GPS
  - `maximumAge: 0` - Always fetches fresh location data
  - `timeout: 5000` - 5-second timeout for GPS requests

- **Distance-Based Filtering System**:
  - Stores last valid location
  - Calculates distance between consecutive updates
  - Discards updates where `distance > 100 meters` AND `time delta < 3 seconds`
  - Prevents marker jumping from erratic GPS jumps

- **Speed & Heading Calculation**:
  - Speed: `distance / time` (in meters per second)
  - Heading: Bearing between previous and current point (0-360 degrees)
  - Uses Haversine formula for accurate distance calculation

- **Validation Logic**:
  - Checks for valid latitude (-90 to 90) and longitude (-180 to 180)
  - Rejects zero/infinite coordinates
  - Validates coordinate formats

- **Location Status States**:
  - `idle` - Not tracking
  - `locating` - Initial GPS request in progress
  - `tracking` - Active location updates
  - `error` - Permission denied or timeout

- **Automatic Retry**:
  - Retries GPS requests up to 5 times on timeout
  - User-friendly fallback state: "Locating rider…"

- **Supabase Integration**:
  - Throttled updates every 5 seconds (not every GPS tick)
  - Writes to `profiles` table: `current_lat`, `current_long`, `last_location_update`
  - Reduces database spam while maintaining data freshness

### 2. Smooth Marker Animation Utility (`src/utils/smoothMarkerAnimation.ts`)

**Functions:**
- `animateMarkerToPosition()` - Smooth 800ms animation to new position
- `animateMarkersSequential()` - Animate multiple markers one after another
- `animateMarkersParallel()` - Animate multiple markers simultaneously
- Uses ease-in-out cubic easing for natural motion
- 60fps animation via `requestAnimationFrame`

**Usage:**
```typescript
import { animateMarkerToPosition } from "@/utils/smoothMarkerAnimation";

// Animate marker to new position over 800ms
animateMarkerToPosition(marker, latitude, longitude, { duration: 800 });
```

### 3. Enhanced Golden Pulse Marker (`src/utils/createGoldenPulseMarker.ts`)

Updated `updateGoldenPulseMarker()` to animate position smoothly instead of instant repositioning.
- Uses ease-in-out cubic easing
- 800ms smooth transition
- Prevents jarring visual jumps

### 4. Updated Components

#### OrderRadarMap.tsx
- Uses `animateMarkerToPosition()` for smooth rider/runner marker updates
- Added coordinate validation (checks `isFinite()`)
- Imports smooth animation utility

#### OrderTracking.tsx
- Smooth rider marker animation on location updates
- Enhanced with `animateMarkerToPosition()` utility
- Maintains existing routing and ETA calculations

#### GigRadar.tsx
- Switched from `useRunnerLocation` to `useHighAccuracyLocation`
- Now receives enhanced location data with speed/heading
- Better error handling with `locationStatus` state

#### BountyMap.tsx
- Uses updated `updateGoldenPulseMarker()` for smooth self-marker animation
- Golden pulse ping animation remains unchanged

---

## Usage Examples

### For Gig Workers (GigRadar Page)

```typescript
import { useHighAccuracyLocation } from "@/hooks/useHighAccuracyLocation";

const GigRadar = () => {
  const { 
    location,           // Current location with speed/heading
    isTransmitting,     // Connected to Supabase
    hasPermission,      // GPS permission granted
    permissionError,    // Error message if any
    locationStatus      // "locating" | "tracking" | "error" | "idle"
  } = useHighAccuracyLocation(user, isOnline);

  // location object structure:
  // {
  //   latitude: number,
  //   longitude: number,
  //   accuracy?: number,     // GPS accuracy in meters
  //   speed?: number,        // Speed in m/s
  //   heading?: number,      // Direction in degrees (0-360)
  //   timestamp?: number     // When location was captured
  // }
};
```

### For Map Components

```typescript
import { animateMarkerToPosition } from "@/utils/smoothMarkerAnimation";

// Animate marker with custom duration
await animateMarkerToPosition(marker, lat, lng, { duration: 600 });

// Animate multiple markers in parallel
await animateMarkersParallel(
  [
    { marker: marker1, lat: 10, lng: 20 },
    { marker: marker2, lat: 30, lng: 40 }
  ],
  { duration: 1000 }
);
```

---

## Technical Specifications

### GPS Configuration
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `enableHighAccuracy` | `true` | Request maximum precision |
| `maximumAge` | `0` | Always get fresh data |
| `timeout` | `5000ms` | Wait up to 5 seconds |

### Filtering Parameters
| Parameter | Value | Purpose |
|-----------|-------|---------|
| Jump Threshold | `100 meters` | Max acceptable distance |
| Jump Time Window | `3000ms` | Within this time window |
| Supabase Update Interval | `5000ms` | Throttle DB updates |

### Animation Defaults
| Parameter | Value | Purpose |
|-----------|-------|---------|
| Duration | `800ms` | Smooth visual transition |
| Easing | Ease-in-out cubic | Natural acceleration/deceleration |
| Frame Rate | `60fps` | requestAnimationFrame |

---

## Data Flow

### Gig Worker Location Tracking Pipeline

```
[Browser GPS] 
    ↓ (every 0.1-1s)
[watchPosition callback]
    ↓
[Location Validation & Filtering]
    ├─ Check coordinate bounds
    ├─ Validate finite values
    ├─ Calculate distance from last valid
    ├─ Check for erratic jumps
    └─ Calculate speed & heading
    ↓
[Valid Location Update]
    ├─ Store in local state
    ├─ Update map marker smoothly
    └─ Update animation progress
    ↓
[Throttled Supabase Update] (every 5s)
    └─ Write to profiles table
```

### Customer Map Tracking (Realtime Subscription)

```
[Supabase profiles table]
    ↓ (postgres_changes event)
[Realtime channel callback]
    ├─ Extract latitude, longitude
    ├─ Validate coordinates
    └─ Trigger marker animation
    ↓
[Smooth Marker Animation]
    └─ 800ms interpolation to new position
```

---

## Benefits

### 1. **Accuracy**
- High-precision GPS instead of default
- Actual road movement vs. noise/drift
- Speed and heading calculations for analytics

### 2. **Stability**
- Erratic jump filtering prevents visual chaos
- Validation catches data errors before rendering
- Fallback states for permission/connectivity issues

### 3. **User Experience**
- Smooth marker transitions instead of teleporting
- "Locating rider…" states prevent confusion
- No marker jumping/vibration on screen
- Consistent 60fps animations

### 4. **Performance**
- Throttled Supabase updates (5s, not on every GPS tick)
- Reduces database load and bandwidth
- Only valid locations sent to backend
- Efficient distance calculations

### 5. **Production Ready**
- Comprehensive error handling
- Permission checking before tracking
- Timeout and retry logic
- Type-safe implementation with TypeScript

---

## Migration Guide

### For Developers Using the Old `useRunnerLocation`

Replace:
```typescript
import { useRunnerLocation } from "@/hooks/useRunnerLocation";

const { location, isTransmitting, hasPermission, permissionError } = 
  useRunnerLocation(user, isOnline);
```

With:
```typescript
import { useHighAccuracyLocation } from "@/hooks/useHighAccuracyLocation";

const { location, isTransmitting, hasPermission, permissionError, locationStatus } = 
  useHighAccuracyLocation(user, isOnline);
```

The new hook is a drop-in replacement with additional `locationStatus` property.

### For Map Updates

Replace:
```typescript
marker.setLatLng([newLat, newLng]); // Instant jump
```

With:
```typescript
import { animateMarkerToPosition } from "@/utils/smoothMarkerAnimation";

animateMarkerToPosition(marker, newLat, newLng, { duration: 800 });
```

---

## Testing Checklist

- [ ] GPS permission request appears on first visit
- [ ] Location updates appear in real-time on map
- [ ] Marker animates smoothly (no teleporting)
- [ ] No marker jumping on road movement
- [ ] Speed/heading calculated correctly
- [ ] Supabase updates logged in background
- [ ] Fallback state shows when GPS unavailable
- [ ] Works offline (no Supabase errors in console)
- [ ] Permissions denied state handled gracefully
- [ ] Multiple location updates maintain smooth animation
- [ ] Customer map shows rider position correctly
- [ ] GigRadar page shows live worker position
- [ ] OrderTracking page shows rider approaching
- [ ] TrackOrders customer view shows delivery status

---

## Constants and Configuration

All values are defined in `useHighAccuracyLocation.ts`:

```typescript
const JUMP_THRESHOLD_METERS = 100;        // Max jump distance
const JUMP_TIME_THRESHOLD_MS = 3000;      // Time window for jump check
const SUPABASE_UPDATE_INTERVAL = 5000;    // Throttle Supabase writes
const MAX_RETRIES = 5;                    // GPS timeout retries
```

To adjust behavior, modify these constants in the hook.

---

## Known Limitations

1. **Devices without GPS**: Falls back to network-based location (less accurate)
2. **Indoor coverage**: GPS weak indoors, requires clear sky view
3. **Cold start**: First GPS fix may take 5-30 seconds
4. **Browser support**: Requires modern browser with Geolocation API
5. **HTTPS requirement**: Geolocation API only works on HTTPS (except localhost)

---

## Future Enhancements

Potential improvements for v2:
- [ ] Speed smoothing with Kalman filter
- [ ] Predictive marker position (extrapolate movement)
- [ ] Compass heading visualization
- [ ] Track history replay on map
- [ ] Battery optimization (reduce update frequency in background)
- [ ] GPS accuracy indicator (circles around marker)
- [ ] Network-based location fallback
- [ ] Offline location caching

---

## Debugging

Enable development logging in `useHighAccuracyLocation.ts`:

Location updates are logged to console in development mode:
```
[useHighAccuracyLocation] Location rejected: Jump too large (450m in 1200ms)
[useHighAccuracyLocation] State: { hasPermission: true, locationStatus: "tracking" }
```

Check browser DevTools Console for:
- Permission grant/denial events
- GPS timeout warnings
- Jump detection logs
- Supabase update errors

---

## Files Modified/Created

### Created
- `src/hooks/useHighAccuracyLocation.ts` - New hook with filtering
- `src/utils/smoothMarkerAnimation.ts` - Marker animation utilities

### Modified
- `src/components/OrderRadarMap.tsx` - Use smooth animation
- `src/pages/OrderTracking.tsx` - Use smooth animation
- `src/pages/GigRadar.tsx` - Use new hook
- `src/utils/createGoldenPulseMarker.ts` - Enhanced with smooth updates

### Not Modified (backward compatible)
- `src/hooks/useRunnerLocation.ts` - Left intact for reference
- `src/hooks/useLocationPermission.ts` - Works unchanged
- `src/components/BountyMap.tsx` - Uses updated pulse marker

---

## Support & Questions

For issues or questions:
1. Check the browser console for debug logs
2. Verify GPS permissions in browser settings
3. Test on different devices (desktop, mobile, iOS, Android)
4. Check network connectivity (Supabase realtime)
5. Review error messages in `permissionError` state

