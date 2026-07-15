# Restore old RiderRide UI + keep new backend logic

## What to do

Merge the old `RiderRide.jsx` (retrieved from git) with the new socket event flow.

## File to change

`frontend/src/pages/RiderRide.jsx`

## Changes needed

### 1. Restore all old visual elements
- Pick screen: gradient background, SVG college building, grid overlays, decorative circles
- Search screen: map tiles via `getTileUrl`, route SVG path with dashed lines, pulsing dots, moving vehicle animation, college building SVG
- Bottom card: route line with dot indicators, pickup/destination display
- Passenger list: initial avatars, name, address, ₹30 fare, "Confirm Ride" button
- OTP verification card: passenger avatar, name, distance indicator (with `calcDistance`), verify button, "End Ride" button

### 2. Replace old socket events with new
| Old | New |
|---|---|
| `emit('findRiders')` | `emit('rider:startSearching')` |
| `emit('stopFindRiders')` | `emit('rider:stopSearching')` |
| `emit('acceptRequest')` | `emit('rider:confirmPassenger')` |
| `on('requestAccepted')` → `setStep('confirmed')` + set data | `on('rideAccepted')` → `setStep('confirmed')` |
| `on('waitingPassengers')` | Same (keep) |
| `on('newPassenger')` | Same (keep) |
| REST POST verify OTP | `emit('rider:verifyOtp')` |
| `on('passengerCancelled')` | Same (keep) |

### 3. Add `waiting` step
- After rider clicks "Confirm Ride" via `rider:confirmPassenger`
- Listen for `requestSent` → set step to `'waiting'`
- Listening for `rideDeclined` → revert to `'searching'`
- Condition `step === 'waiting'` shows passenger card with "Waiting for passenger to accept..." text and dots animation

### 4. Key variables to keep from new version
- `requestId` – tracks the RideRequest ID
- `foundPassenger` – the passenger being confirmed (replaces single-item `waitingPassengers[0]`)

### 5. State transitions
```
pick → searching → (finds passenger) → shows confirm button
→ click → waiting (emit rider:confirmPassenger)
  → rideAccepted → confirmed (OTP screen)
  → rideDeclined → searching (revert)
  → requestSent (at socket level) → waiting state
confirmed → verify OTP → verified → start ride → ride started → complete → done
```
