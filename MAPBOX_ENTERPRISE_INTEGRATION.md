# Mapbox Enterprise Integration

## Overview
This document describes the Mapbox Enterprise implementation for `/gig-radar` and `/track-orders` featuring automated routing, ETAs, precise iconography, and smart auto-zoom functionality.

## Configuration

### Token
- **Access Token**: `pk.eyJ1IjoidGhlLWhpdmUiLCJhIjoiY21wNXdidmV5MDFlYzJwc2wydzZ1NXoyYSJ9.ImuunrlyiRHMEfwO8TaQnQ`
- **Map Style**: `mapbox://styles/mapbox/navigation-night-v1` (dark luxury aesthetic)
- **Implementation**: Token is hardcoded in MapboxMapComponent

### Dependencies
- `mapbox-gl@^3.23.1`
- `react-map-gl@^7.1.7`

### CSS
- `mapbox-gl/dist/mapbox-gl.css` is automatically imported in MapboxMapComponent

## Components

### MapboxMapComponent (`src/components/Map/MapboxMapComponent.tsx`)
Base map component using Mapbox with dark navigation style and overflow-x-hidden constraint.

**Props:**
- `initialLng` (number): Initial longitude
- `initialLat` (number): Initial latitude
- `initialZoom` (number): Initial zoom level
- `children` (React.ReactNode): Map layers and markers
- `onMapLoad` (function): Callback when map loads

### WorkerMarker (`src/components/Map/WorkerMarker.tsx`)
GPS teardrop pin marker for worker/rider locations.

**Props:**
- `lng` (number): Longitude
- `lat` (number): Latitude
- `label` (string, optional): Display label

**Style:**
- Color: Gold (#B37C1C)
- Shape: Teardrop (standard GPS navigation pin)

### DestinationMarker (`src/components/Map/DestinationMarker.tsx`)
Lollipop pin marker for pickup/dropoff destinations.

**Props:**
- `lng` (number): Longitude
- `lat` (number): Latitude
- `label` (string, optional): Display label
- `type` ('pickup' | 'dropoff'): Marker type

**Style:**
- Color: Gold (#B37C1C)
- Shape: Lollipop (circular head on vertical stick)

## Services

### mapboxRoutingService (`src/services/mapboxRoutingService.ts`)
Handles all Mapbox Directions API v5 calls for routing, distance, and ETA calculations.

**Function:** `getRoute(riderLng, riderLat, dropoffLng, dropoffLat)`

**Returns:**
```typescript
{
  distance: string,      // e.g., "5.2 km"
  eta: string,          // e.g., "12 min"
  coordinates: [number, number][]  // GeoJSON coordinates for polyline
}
```

**API Endpoint:**
```
https://api.mapbox.com/directions/v5/mapbox/driving/{lng},{lat};{lng},{lat}?geometries=geojson&access_token=TOKEN
```

## Route Visualization

Routes are rendered as a **solid Gold (#B37C1C) polyline** with width 5 and opacity 0.8 using:
- `<Source>` component for GeoJSON geometry
- `<Layer>` component with `type: "line"` for rendering

## Smart Auto-Zoom (No Jumps)

### Implementation
- `useMapboxAutoZoom` hook automatically fits map bounds to route coordinates
- Smooth animation with `fitBounds()` method
- Configurable padding (default: 50px) for centered, comfortable viewing
- Duration: 800ms

### Usage
```typescript
useMapboxAutoZoom(mapRef, routeGeometry, { padding: 50, duration: 800 });
```

## Integration Points

### /gig-radar (src/pages/GigRadar.tsx)
**Status:** ✅ Implemented

- Uses MapboxMapComponent
- Worker marker with teardrop GPS pin
- Destination marker with lollipop pin
- Multi-leg routing (worker → pickup → customer)
- Mapbox Directions API for accurate ETA/distance
- Auto-zoom on route resolution
- Gold route polyline visualization

**Key Features:**
- Real-time worker location tracking
- Precise eta/distance in Bottom Drawer format: "⏱️ ETA: Xm" and "📏 Xkm"
- Smart zoom centers view on full route with padding

### /track-orders (src/pages/customer/TrackOrders.tsx)
**Status:** ✅ Implemented

- Uses MapboxMapComponent
- Customer location (DestinationMarker, dropoff type)
- Courier location (WorkerMarker)
- Single-leg routing (courier → customer)
- Real-time route metrics updates every 10 seconds
- Auto-zoom on route resolution
- Glassmorphic HUD displaying distance and ETA

**Key Features:**
- Real-time courier location updates via Supabase
- Live route visualization with gold polylines
- Seamless ETA/distance mapping: "⏱️ ETA: Xm" format
- Comfortable padding ensures all elements visible

## Brand Colors
- **Primary Gold**: #B37C1C (markers, polylines)
- **Cream/Ivory**: #FFFBF2 (UI backgrounds)
- **Dark**: #0F1A35 (text)

## Error Handling
- Route failures fall back gracefully with console warnings
- Toast notifications alert users of route fetch failures
- Missing routes show "Failed to fetch route" without breaking the UI

## Performance Considerations
- Hardcoded token for maximum performance
- Routes cached during component lifecycle
- Mapbox API calls optimized (only when bounty/order selected)
- Auto-zoom prevents multiple rapid refreshes via dependency arrays

## Future Enhancements
- Route alternativs via Mapbox alternatives parameter
- Real-time traffic layer integration
- Geofencing via Mapbox turfjs
- Street-level routing profile selection

## Testing the Integration

1. **GigRadar:**
   - Navigate to `/gig-radar`
   - Accept a bounty
   - Verify teardrop worker marker appears at your location
   - Verify lollipop destination marker appears
   - Verify gold route line connects both
   - Verify ETA/distance formats: "⏱️ ETA: Xm" and "📏 Xkm"
   - Verify map auto-zooms with 50px padding

2. **TrackOrders:**
   - Create an active delivery order
   - Navigate to `/track-orders`
   - Verify customer location (lollipop marker)
   - Verify courier location (teardrop marker)
   - Verify gold route line connecting both
   - Verify HUD displays distance and ETA
   - Wait 10 seconds and verify metrics update

## API Documentation
- **Mapbox Directions API v5**: https://docs.mapbox.com/api/navigation/directions/
- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js/
- **React Map GL**: https://visgl.github.io/react-map-gl/
