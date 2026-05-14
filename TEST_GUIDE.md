# GigRadar Operational UI - Test Guide

## Pre-Test Checklist
- [ ] Visit `/gig-radar` route in the app
- [ ] Ensure browser allows geolocation (or mock it)
- [ ] Dev server running (`npm run dev`)
- [ ] No console errors

---

## Test Scenario 1: Initial Page Load (Offline State)

**Expected Behavior**:
1. Page loads with map centered on Lusaka (-15.3875, 28.3228)
2. Header bar visible with "THE HIVE" logo and user profile
3. **Top of map**: NO "Go Online" overlay (hidden until mounted)
4. **Bottom sheet**: Shows message:
   ```
   🔌
   "Go online to see bounties"
   "Click the 'Go Online' button at the top to start accepting deliveries"
   ```
5. Map shows bounty markers (small gold pins)
6. Right-side map control button (recenter to location)

**Verification**:
- ✅ Bottom sheet text appears
- ✅ No bounty cards visible
- ✅ "Go Online" button NOT visible (overlay only shows when animation ready)

---

## Test Scenario 2: Click "Go Online" Button

**Setup**:
- Page fully loaded with offline state
- Browser has geolocation enabled

**Expected Behavior**:
1. **Glassmorphic pill appears** at top-center of map:
   - Gold-to-black gradient background
   - `backdrop-blur-md` effect (slightly frosted glass)
   - Shows: `[ 💡 Go Online ]`

2. **User clicks the button**:
   - Button becomes disabled (greyed out)
   - Text changes to: "Acquiring location..."
   - Browser prompts for location permission (if not granted)

3. **After geolocation acquired**:
   - Button changes to: `[ 💡 ONLINE ]`
   - Bulb icon starts "shining" (pulsing with glow effect):
     - Opacity animates: 1 → 0.6 → 1 (repeating)
     - Scale animates: 1 → 1.1 → 1 (repeating)
     - `filter: drop-shadow(0 0 8px #B37C1C)` appears
   - New badge appears below button:
     - Green background: `"📍 Location tracking active"`
   - Success toast appears: `"✨ You're online! Location acquired."`
   - Map center **flies to user's actual location** (smooth animation)
   - Gold location marker appears at center with label "You"

4. **Bottom sheet changes**:
   - Offline message disappears
   - **Available Bounties drawer appears** with:
     - Header: `"(Use the gold location pain) Available Bounties"`
     - Subtitle showing count: `"N bounty batches near you"`
     - Horizontally scrollable bounty cards

**Verification**:
- ✅ Glassmorphic pill visible at top-center
- ✅ Button text changes as described
- ✅ Bulb animation is smooth and visible
- ✅ Green location badge appears
- ✅ Map centers on actual location
- ✅ Gold marker on map at user location
- ✅ Bottom sheet shows Available Bounties
- ✅ Toast notification shows success

**Error Cases**:
- **Geolocation blocked**: 
  - Toast: `"Location permission denied. Please enable location access."`
  - Button remains disabled
  - Bottom sheet stays in offline state
  
- **Timeout (>5s)**:
  - Toast: `"Failed to get location. Please try again."`
  - Button re-enables
  - Can retry

---

## Test Scenario 3: View Available Bounties

**Setup**:
- User is online
- Bounties loaded (from useOrderClustering hook)

**Expected Visual**:
1. **Drawer header**:
   ```
   📍 (Use the gold location pain) Available Bounties
   ```
   With subtitle: `"3 bounty batches near you"` (example)

2. **Bounty cards appear** (horizontally scrollable):
   - **Card Styling**:
     - Ivory/white background (#FFFBF2)
     - 1px gold border (#B37C1C)
     - Fixed width (w-80 = 320px)
     - Rounded corners (rounded-xl)
     - Shadow on hover

   - **Card Content Structure**:
     ```
     ┌─────────────────────────────┐
     │ PICKUP                       │
     │ Sneaker Kings Hub           │  (📦 icon animating)
     ├─────────────────────────────┤
     │ 📦 Deliveries: 3            │
     │ 📍 Distance: 4.5km          │  (3-column grid)
     │ ⏱️  ETA: 35 mins            │
     ├─────────────────────────────┤
     │ ORDER BREAKDOWN             │
     │ ┌─────────────────────────┐ │
     │ │ Order #1 • Customer A   │  │
     │ │                  ZMW X.XX │
     │ └─────────────────────────┘ │
     │ ┌─────────────────────────┐ │
     │ │ Order #2 • Customer B   │  │
     │ │                  ZMW X.XX │
     │ └─────────────────────────┘ │
     │ ┌─────────────────────────┐ │
     │ │ Order #3 • Customer C   │  │
     │ │                  ZMW X.XX │
     │ └─────────────────────────┘ │
     ├─────────────────────────────┤
     │ YOUR TOTAL PAYOUT           │
     │ ZMW 65.00    (3 orders)     │  (gold gradient text)
     ├─────────────────────────────┤
     │  ⚡ CLAIM ROUTE            │  (gold button, 100% width)
     └─────────────────────────────┘
     ```

3. **Scroll Behavior**:
   - Drag to scroll horizontally
   - Left/Right chevron arrows appear when content overflows
   - Chevrons fade in/out as you scroll to edges
   - Smooth snap-scroll alignment

4. **Interactive Elements**:
   - Hover on card: `scale: 1.02` (slight grow)
   - Tap on card: `scale: 0.98` (slight shrink)
   - Package icon pulses continuously (scale animation)

**Verification**:
- ✅ All card elements visible
- ✅ Individual order prices shown
- ✅ Total payout prominently displayed (gold gradient)
- ✅ Price breakdown section shows first 3 orders
- ✅ Horizontal scrolling works
- ✅ Navigation arrows appear/disappear appropriately
- ✅ Card hover/tap animations smooth

---

## Test Scenario 4: Claim a Bounty Route

**Setup**:
- User is online
- At least one bounty card visible
- Bounty has 3+ orders

**User Action**:
- Click `[ ⚡ CLAIM ROUTE ]` button on any card

**Expected Behavior**:

1. **Immediate Feedback**:
   - Button might show loading state briefly
   - Toast appears: `"✨ Batch claimed! 3 orders in_transit."`
   - Bottom sheet (AvailableBountiesDrawer) **slides out/fades**

2. **Full-Screen Mission HUD appears**:
   - Fills entire screen with new interface
   - Header bar visible with close button

3. **Header Section**:
   ```
   [ ⛵ Navigation icon (gold/black bg) ]
   Active Mission
   3 orders • Step 1 of 5
   [ X close button ]
   ```

4. **Route Summary Pill**:
   - Gradient background (ivory + navy)
   - **Large payout text**: `ZMW 65.00`
   - 3-column layout:
     ```
     📍 4.5 km     ⏱️ 35 mins    📦 3
     Distance      ETA          Orders
     ```

5. **Vertical Stepper** (Mission Steps):
   ```
   PICKUP [Step 1, current]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [🎯 animated pulse] Sneaker Kings Hub
                       Collect 3 items
                       ETA: 5 mins

   DELIVERY [Step 2, pending]
   ┃
   [2] John Customer
       Order #101 • +260...
       Phone shown

   DELIVERY [Step 3, pending]
   ┃
   [3] Jane Doe
       Order #102 • +260...
   
   DELIVERY [Step 4, pending]
   ┃
   [4] Bob Smith
       Order #103 • +260...
   ```

6. **Stepper Features**:
   - Current step has:
     - Gold-tinted background
     - Gold border (thicker)
     - "Now" badge label (gold)
     - Icon animates (scale pulse)
   - Pending steps:
     - White background
     - Tan border
     - Number indicator
   - Completed steps (if any):
     - Green checkmark icon
     - Green background
     - Green border
   - Connecting line runs left side (subtle, 20% opacity)

7. **Action Buttons** (bottom):
   - **Primary**: `[ 🗺️ NAVIGATE ]`
     - Gold-to-black gradient
     - Full width
     - Shadow effect
   - **Secondary**: `"Return to Map"`
     - White background, gold border
     - Full width below primary

8. **Animations**:
   - All stepper cards fade + slide in from left (staggered ~50ms each)
   - Current step icon pulses continuously
   - Smooth transitions between states

**Verification**:
- ✅ HUD appears full-screen
- ✅ All steps visible in correct order
- ✅ Current step highlighted with gold styling
- ✅ Step icons match (package for pickup, pin for delivery)
- ✅ Animations are smooth
- ✅ Total payout visible at top
- ✅ Action buttons are large and clickable
- ✅ Close button (X) accessible

---

## Test Scenario 5: Return to Map

**Setup**:
- Active Mission HUD is displayed

**User Action**:
- Click `"Return to Map"` button or `[ X ]` close button

**Expected Behavior**:
1. HUD fades out and slides up
2. Bottom sheet reappears with Available Bounties drawer
3. Same bounty cards visible as before
4. User can claim another batch or go offline

**Verification**:
- ✅ HUD disappears smoothly
- ✅ Drawer reappears
- ✅ State preserved (same bounties)
- ✅ Can claim another batch

---

## Test Scenario 6: Go Offline

**Setup**:
- User is online (bulb shining)

**User Action**:
- (This would require clicking Go Online again and toggling, or a separate offline button)
- For now, verify offline state still works on page reload

**Expected Behavior**:
- Bottom sheet shows: `"🔌 Go online to see bounties"`
- "Go Online" overlay disappears
- Location tracking stops

**Verification**:
- ✅ Offline message shows
- ✅ Bounties hidden
- ✅ Location badge gone

---

## Visual Quality Checklist

### Colors
- [ ] Navy (#0F1A35) text is readable on ivory background
- [ ] Gold (#B37C1C) accents pop appropriately
- [ ] Gradients are smooth (no banding)
- [ ] Borders are crisp (1px, not blurry)

### Typography
- [ ] Font sizes are appropriate (headings, body, labels)
- [ ] Font weights match design (bold for labels, semi-bold for body)
- [ ] Line-height gives breathing room
- [ ] No text overflow on mobile (w-full cards)

### Animations
- [ ] All animations use `ease-out` or matching easing
- [ ] Duration 200-400ms for most animations
- [ ] No jank or frame drops
- [ ] Animations feel responsive (not laggy)

### Responsiveness
- [ ] **Mobile (375px)**: Cards fit in viewport, scroll works
- [ ] **Tablet (768px)**: Cards larger, spacing better
- [ ] **Desktop (1024px)**: Full width used effectively
- [ ] Touch targets > 44px on mobile

### Accessibility
- [ ] Buttons have clear hover states
- [ ] Disabled buttons visibly grayed out
- [ ] Focus states visible (keyboard nav)
- [ ] Text contrast > 4.5:1 (WCAG AA)
- [ ] No auto-playing audio/video

---

## Error Handling Test Cases

### Network Errors
- [ ] If bounties fail to load: Show spinner then "No bounties nearby"
- [ ] If claim fails: Toast with error message, bounties drawer stays
- [ ] If geolocation times out: Toast "Failed to get location", can retry

### Edge Cases
- [ ] Single bounty: No scroll arrows
- [ ] 10+ orders in batch: "+N more" shows correctly
- [ ] Very long customer names: Text truncates or wraps
- [ ] Claim same batch twice: Prevent double-claim (API level)

---

## Performance Notes

### Build Size
- ✅ New components add ~759 lines of code
- ✅ No new dependencies added
- ✅ Uses existing: framer-motion, lucide-react, sonner

### Runtime Performance
- Animations use GPU-accelerated transforms
- No unnecessary re-renders (proper memoization)
- Scroll performance: Native browser, no lag
- Map interactions: Separate from UI layer

---

## Known Limitations & TODOs

1. **Route Navigation**: `[ 🗺️ NAVIGATE ]` is placeholder
   - Future: Integrate Google Maps / Apple Maps intent

2. **OTP Verification**: Not shown in current HUD
   - Needed for: Confirming deliveries

3. **Real-time Updates**: Polling via useOrderClustering (30s interval)
   - Future: WebSocket for live updates

4. **Offline Support**: Currently requires online
   - Future: Cache batches for offline browsing

5. **Multi-language**: Hardcoded English text
   - Future: i18n integration

---

## Deployment Checklist

- [ ] All TypeScript errors resolved (build succeeds)
- [ ] No console errors in dev tools
- [ ] Geolocation works on test devices
- [ ] Toast notifications appear
- [ ] Images load (hive-logo, map tiles)
- [ ] Animations smooth on target devices
- [ ] Mobile Safari tested
- [ ] Android Chrome tested
- [ ] No CORS issues with map/API calls

---

## Success Criteria

✅ **UI Implementation**: All components render without errors
✅ **State Machine**: Transitions work correctly (offline → online → claiming → mission)
✅ **Styling**: Matches Ivory/Navy/Gold theme perfectly
✅ **Animations**: Smooth, responsive, not distracting
✅ **Data Display**: Prices shown correctly, totals accurate
✅ **Responsive**: Works on mobile and desktop
✅ **Accessibility**: Keyboard navigation, high contrast
✅ **Performance**: Build succeeds, no runtime errors

---

**Last Updated**: May 14, 2026
**Status**: Ready for Testing
