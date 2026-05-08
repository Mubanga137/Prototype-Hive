# Map Zoom Lock & Follow Mode - Testing Guide

## Quick Test Scenarios

### Scenario 1: GigRadar (Bounty Map)
**Location:** `/gig-radar` or delivery dashboard

**Test Steps:**
1. Open GigRadar page
2. Enable "Online" mode to start GPS tracking
3. Observe:
   - ✅ Map centers on your location with zoom 15 (not 18)
   - ✅ Blue recenter button appears (bottom-right)
   - ✅ Accuracy circle shows 300-1000m range

4. Drag the map (pan)
5. Observe:
   - ✅ Map stops moving to your location (follow disabled)
   - ✅ Recenter button turns white/gray
   - ✅ Your marker animates smoothly without map jumping

6. Click recenter button
7. Observe:
   - ✅ Map smoothly flies to your location (0.8s)
   - ✅ Button turns blue again
   - ✅ Map centered with zoom 15

### Scenario 2: OrderTracking (Customer Tracking Rider)
**Location:** Order tracking page `/order/:orderId`

**Test Steps:**
1. Open an active order tracking page
2. Wait for rider location to load
3. Observe:
   - ✅ Map shows both you and rider with fitBounds
   - ✅ Recenter button in top-right corner
   - ✅ Follow mode enabled (blue button)

4. Drag/pan the map
5. Observe:
   - ✅ Button turns white (follow disabled)
   - ✅ Rider marker animates but map doesn't pan aggressively
   - ✅ You can explore the map freely

6. Pinch-zoom on mobile
7. Observe:
   - ✅ Follow mode disables on zoom
   - ✅ Map stays at your zoom level

8. Click recenter button
9. Observe:
   - ✅ Smooth animation to rider location (0.8s)
   - ✅ Button turns blue
   - ✅ Zoom set to 15

### Scenario 3: OrderRadarMap (Dispatch/Admin View)
**Location:** Order dispatch map component

**Test Steps:**
1. View an active order in dispatch view
2. Observe:
   - ✅ Rider marker visible on map
   - ✅ Recenter button present (bottom-right)
   - ✅ Customer location marker shown

3. Drag map while rider is moving
4. Observe:
   - ✅ Rider marker animates smoothly (800ms)
   - ✅ Map doesn't snap aggressively
   - ✅ You maintain your map view

5. Wait ~2-3 seconds without interacting
6. If follow is re-enabled (optional feature):
   - ✅ Map gradually centers back on rider

## Expected Behavior Changes

### Before (Old Behavior)
- ❌ Map constantly snapped to user location (zoom 18)
- ❌ Every GPS update forced zoom to 18
- ❌ Users couldn't explore map - it kept centering
- ❌ Accuracy circle was tiny (10-100m range)
- ❌ Aggressive pan/zoom animations felt jerky

### After (New Behavior)
- ✅ Map centers on initial location (zoom 15)
- ✅ GPS updates only move marker, not map
- ✅ Users can freely drag/zoom to explore
- ✅ Accuracy circle realistic (300-1000m range)
- ✅ Smooth, natural interactions like Uber

## Edge Cases to Test

1. **GPS Accuracy Changes**
   - Get indoors (low accuracy) → verify radius grows to ~500m
   - Get outdoors (high accuracy) → verify radius shrinks but stays ≥300m
   - No GPS → verify radius capped at max 1000m

2. **Rapid Interactions**
   - Drag while moving → follow should disable
   - Zoom while moving → follow should disable
   - Multiple rapid clicks on recenter → should handle gracefully

3. **Network Issues**
   - Slow GPS updates → marker animation still smooth
   - GPS pause → map stays where user left it
   - GPS resume → recenter button works

4. **Mobile Touch**
   - Pinch zoom → disables follow
   - Two-finger drag → disables follow
   - Single-finger drag → disables follow
   - Long-press → no unintended interactions

## Performance Checks

- [ ] No lag when dragging map
- [ ] Marker animation is smooth (60fps)
- [ ] Recenter button animation smooth
- [ ] No memory leaks on long sessions
- [ ] Battery usage reasonable with tracking

## Browser/Device Coverage

- [ ] Desktop Chrome
- [ ] Mobile iOS Safari (iPhone)
- [ ] Mobile Android Chrome
- [ ] Tablet (iPad)
- [ ] Firefox (desktop)

## Related Features to Verify (Regression Testing)

- [ ] Order claiming still works (markers clickable)
- [ ] Route display shows correctly
- [ ] ETA/Distance calculations accurate
- [ ] Popup information displays properly
- [ ] Routing machine works as expected
- [ ] GPS status indicators working
- [ ] Online/offline toggle responsive

## Key Metrics

**Before Fix:**
- Zoom level: Forced 18x
- Radius: 10-100m (unrealistic)
- Map panning: Every GPS update
- User frustration: High (can't explore)

**After Fix:**
- Zoom level: Smart 15x (initial), user-controlled (after)
- Radius: 300-1000m (realistic)
- Map panning: Only on explicit recenter
- User satisfaction: High (natural interaction)

## Success Criteria

✅ All tests pass
✅ No console errors
✅ TypeScript types valid
✅ Build succeeds
✅ Performance comparable or better
✅ User interaction feels natural (like Uber)
