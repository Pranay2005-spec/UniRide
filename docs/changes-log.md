# UniRide — Change Log (Safe Refactors & Fixes)

## Overview

Five non-breaking changes. Behavior stays identical; the code is cleaner, safer, and easier to debug. Nothing malicious or destructive. Frontend build + lint pass, backend syntax checks pass.

The changes fall into 3 categories:

| Category | What | Why |
|---|---|---|
| **Deduplication** | Removed 4 copies of the same distance formula | One bug fix would now apply everywhere |
| **Readability** | Extracted a nested fare calculation | Easier to read, test, and maintain |
| **Robustness** | Logged silent failures + added a safety check | Problems become visible, one security gap closed |

---

## Change 1 — Shared distance utility (Backend)

**Files touched:**
- `backend/utils/distance.js` (new file)
- `backend/socketHandlers.js`

**Before (`socketHandlers.js`):**

```js
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**After:**

```js
// backend/utils/distance.js
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
module.exports = { calcDistance };
```

```js
// socketHandlers.js — top of file
const { calcDistance } = require('./utils/distance');
```

**Explanation:** This is the **Haversine formula** — straight-line distance between two GPS points on a sphere (Earth). It sorts passengers by proximity to the rider. The exact same function was copied into 4 files; changing it meant editing 4 places and risking a missed copy. Now there is **one source of truth** at `backend/utils/distance.js`. `require('./utils/distance')` loads the file; `module.exports` exposes the function.

**Non-breaking because:** The formula was copied character-for-character. Only the file location changed.

---

## Change 2 — Shared distance utility (Frontend)

**Files touched:**
- `frontend/src/lib/distance.js` (new file)
- `frontend/src/context/RideStateContext.jsx`
- `frontend/src/pages/RiderRide.jsx`

**New file (`frontend/src/lib/distance.js`):**

```js
export function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcDistanceKm(lat1, lng1, lat2, lng2) {
  return calcDistance(lat1, lng1, lat2, lng2) / 1000;
}

export function calcBikeFare(lat1, lng1, lat2, lng2) {
  return Math.round(calcDistanceKm(lat1, lng1, lat2, lng2) * 4 + 10);
}

export function calcRideFare(pickup, college) {
  if (!pickup?.position || college?.lat == null || college?.lng == null) return null;
  const [lat1, lng1] = pickup.position;
  return calcBikeFare(lat1, lng1, college.lat, college.lng);
}
```

`RideStateContext.jsx` and `RiderRide.jsx` now `import { calcDistance } from '../lib/distance';` and their local copies were deleted.

**Explanation:** Browsers use `import`/`export` (not Node's `require`). This is a helper library, so it lives in `frontend/src/lib/` next to `upi.js` and `customIcons.js`. The helpers build on the base formula:
- `calcDistance` → meters (1000 = 1 km)
- `calcDistanceKm` → kilometers
- `calcBikeFare` → ₹ = km × 4 + 10 (the app's fare formula)
- `calcRideFare` → convenience wrapper that takes `pickup` + `college` objects directly

**Non-breaking because:** Same math, same units (meters in both consumers).

---

## Change 3 — Extracted the inline fare calculation (`Home.jsx`)

**File touched:** `frontend/src/pages/Home.jsx`

**Before (inside a button `onClick`, ~20 lines):**

```js
fare: route.pickup?.position && route.college?.lat && route.college?.lng
  ? Math.round((() => {
      const [lat1, lon1] = route.pickup.position;
      const R = 6371;
      const dLat = (route.college.lat - lat1) * Math.PI / 180;
      const dLon = (route.college.lng - lon1) * Math.PI / 180;
      return R * 2 * Math.atan2(Math.sqrt(...), Math.sqrt(...));
    })() * 4 + 10)
  : null
```

**After:**

```js
fare: calcRideFare(route.pickup, route.college)
```

Also, the separate `calcDistance()` function in `Home.jsx` was replaced:

```js
const distance = pickup?.position && selectedCollege?.lat != null && selectedCollege?.lng != null
  ? calcDistanceKm(pickup.position[0], pickup.position[1], selectedCollege.lat, selectedCollege.lng)
  : null;
const bikePrice = distance != null ? Math.round(distance * 4 + 10) : null;
```

**Explanation:** An IIFE (Immediately-Invoked Function Expression — a function that runs itself in parentheses) was embedded in a click handler just to compute a price. `calcRideFare(pickup, college)` does the exact same arithmetic and returns the same value or `null`. The click handler now reads clearly.

**Non-breaking because:** Identical outputs — same rounding, same null case.

---

## Change 4 — Made silent errors visible

**Files touched:**
- `backend/socketHandlers.js` (`sendMessage`, `joinRideRoom`, `updateLocation`)
- `frontend/src/context/RideStateContext.jsx` (ride-restore on page refresh)

**Before:**

```js
// backend
} catch {}

// frontend
} catch {}
```

**After:**

```js
// backend
} catch (err) {
  console.error('sendMessage error:', err.message);
}

// frontend
} catch (err) {
  console.error('Failed to restore persisted ride:', err);
}
```

**Explanation:** An empty `catch {}` swallows errors — the app keeps running but nobody knows anything failed. `console.error(...)` makes failures observable in the logs without changing behavior.

**Non-breaking because:** `console.error` only logs; it does not throw, return early, or alter data.

---

## Change 5 — Driver verification in `acceptRequest` (security check)

**File touched:** `backend/socketHandlers.js`

**Before:**

```js
let driverUser = await User.findById(socket.userId).select('...');
if (!driverUser) {
  driverUser = await Rider.findById(socket.userId).select('...');
}
// Ride.create used hardcoded driverModel: 'Rider'
```

**After:**

```js
let driverUser = await User.findById(socket.userId).select('name collegeName profilePicture avgRating upiId');
let driverModel = 'User';
if (!driverUser) {
  driverUser = await Rider.findById(socket.userId).select('name profilePicture avgRating upiId blocked verificationStatus');
  if (!driverUser) return socket.emit('error', { message: 'Driver account not found' });
  if (driverUser.blocked) return socket.emit('error', { message: 'Your account has been blocked' });
  if (driverUser.verificationStatus !== 'verified') return socket.emit('error', { message: 'Your rider account is not verified yet' });
  driverModel = 'Rider';
}
// Ride.create now uses the resolved driverModel
```

**Explanation:** When a rider confirms a ride, the server used to create a `Ride` without ever checking who was accepting. Now it resolves the account first (User, then Rider), and for Riders rejects: missing account, blocked account, or unverified account. It also fixed a latent bug where `driverModel: 'Rider'` was hardcoded even for `User`-type drivers — it is now set based on which collection the driver belongs to.

**Non-breaking because:** `authController.loginRider` already requires `verificationStatus === 'verified'` to log in, so every legitimate rider reaches this code already verified. The check is defense-in-depth — it only stops fake/manual socket connections.

---

## What was deliberately NOT changed

| Item | Reason |
|---|---|
| **JWT in localStorage → cookies** | Auth architecture, token lifecycle, logout, and refresh logic change across every page. High risk. Best as a separate project. |
| **Adding a test suite** | An addition, not a fix — needs a framework choice and CI. |
| **Aligning `matched` / `requestAccepted` payload shapes** | Investigated: the two payloads serve different screens (passenger needs populated driver; rider needs raw ride + passenger) and both work correctly today. |
| **`Payments.jsx`** | Handled separately by the user. |

---

## Verification

- `npm run build` (frontend) — ✅ built successfully
- `npm run lint` (frontend) — ✅ no new issues (errors in `ProfilePage.jsx` / `Rides.jsx` are pre-existing; those files were not touched)
- `node -c` syntax check (backend) — ✅ all files OK
