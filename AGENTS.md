# UniRide — Project Context

## Stack
- **Frontend:** Vite + React 18 + Tailwind CSS + Framer Motion + React Leaflet
- **Backend:** Express + MongoDB (Mongoose) + Socket.io
- **Auth:** JWT stored in localStorage
- **Deployment:** Frontend on Vercel, Backend on Render (free tier)
- **Architecture:** Functional/procedural style (Mongoose models are the only OOP layer)

## Project Purpose
Campus ride-sharing app connecting students (passengers) with verified student drivers (riders) for dynamic fare (distance × 4 + 10) between local colleges.

## Directory Structure
```
UniRide/
├── backend/
│   ├── controllers/       # authController, rideController, adminController, etc.
│   ├── models/            # User, Rider, RideRequest, Ride, Complaint
│   ├── middleware/         # auth, adminAuth
│   ├── routes/            # auth, ride, admin, payment
│   ├── socketHandlers.js  # all real-time logic (requestRide, findRiders, acceptRequest, cancelRequest)
│   ├── keepalive.js       # cron job to wake Render backend
│   └── index.js           # entry point (creates uploads/ dir, connects DB, mounts routes)
├── frontend/
│   └── src/
│       ├── pages/         # Home, RiderRide, Rides (passenger), AdminDashboard, Complaints, etc.
│       ├── context/       # AuthContext, SocketContext
│       ├── data/          # solapurColleges.js
│       └── lib/           # customIcons.js (Leaflet icons)
```

## Data Models

### User (passenger)
- `name`, `phone` (unique), `password`, `collegeName`, `profilePicture`
- `role: 'user'`
- `ridesJoined`, `moneySaved`
- Saved routes moved to MongoDB (`/api/saved-routes`)

### Rider
- Separate collection (not User + role). Fields: `name`, `phone`, `password`, `vehicleNumber`, `vehicleModel`, `college`, `profilePicture`, `licensePhoto`, `verificationStatus` ('pending', 'verified', 'rejected')
- Must be `verificationStatus === 'verified'` to log in (checked in authController)
- Max 5 saved routes
- Rider signup should only ask for **driving license** (not aadhaar/pan/other). Remove `docType` dropdown, simplify to just file upload + license number.

### RideRequest
- `passenger` (ref User), `college.id/name/short/lat/lng`, `pickup.address/position`
- `status: 'pending' | 'accepted' | 'cancelled'`
- `matchedRide` (ref Ride)
- **Added:** `price` field (default 30), `paymentMethod: 'cash' | 'online'`, `paymentStatus: 'pending' | 'paid'`

### Ride
- `driver` (ref Rider or User), `pickup`, `route`, `date/time`, `active`, `currentStop`
- `passengers: [{ user, otp, location, verified }]`
- `currentLocation: { lat, lng }`
- **Added:** `razorpayOrderId`, `paymentStatus`

## Real-time Flow (Socket Handlers)

### Passenger creates request: `requestRide`
1. Auto-cancels any existing pending/accepted requests for this passenger
2. Creates new RideRequest
3. Emits `newPassenger` to `college:${college.id}` room
4. Passenger listens for `matched` event (ride assigned + OTP)

### Rider finds passengers: `findRiders`
1. Joins `college:${collegeId}` room
2. Queries ALL pending RideRequests for that college
3. Filters by distance (Haversine, MAX_DISTANCE = 5000m) — if riderLat/riderLng provided
4. Sorts by distance ascending (closest first)
5. Emits `waitingPassengers` (array) — frontend shows only index 0

### Rider accepts: `acceptRequest`
1. Validates request is still pending
2. Creates Ride with OTP
3. Marks request `accepted`, links to ride
4. Emits `matched` to passenger's `user:userId` room
5. Emits `requestAccepted` to rider
6. Emits `passengerAccepted` to college room (removes from list)

### Passenger cancels: `cancelRequest`
1. Sets status to cancelled
2. Emits `passengerCancelled` with `requestId` to college room
3. Rider's frontend filters `waitingPassengers` by `p._id !== data.requestId`
4. Next closest passenger (index 0) auto-appears

### On disconnect
1. Auto-cancels any pending request for that userId
2. Emits `passengerCancelled` to college room

## Matching Rules (as of last session)
1. Rider sees only the **single closest** passenger (`waitingPassengers[0]`)
2. `newPassenger` events are sorted into the array by distance on the frontend
3. When current passenger cancels/got accepted, the array shrinks and index 0 naturally becomes the next closest
4. First emit without coordinates (shows all), second with coordinates (refines to nearby)
5. Rider position stored in `riderPosRef` (useRef) during matching phase

## RideStateContext — Session Persistence Architecture

### Why It Exists
Socket listeners and geolocation watchers were originally in `Rides.jsx` / `RiderRide.jsx`. Unmounting those components (navigating to another page) cancelled ride requests, stopped searching, and dropped listeners. `RideStateContext` lifts all persistent state + listeners into `App.jsx` level so they survive navigation.

### Core File
`frontend/src/context/RideStateContext.jsx` — single provider managing two independent state domains.

### State Domains

**Passenger** (`ur_ride` key in sessionStorage):
- `searching`, `matchedRide`, `otp`, `rideDetails`, `verified`, `college`, `pickup`, `fare`, `passengerPos`, `lastError`, `showReview`/`reviewTarget`/`reviewRideId`
- Persisted when: `matchedRide || college` is truthy
- Cleared by: `clearState()` → removes sessionStorage key, nulls all state

**Rider** (`ur_rider_ride` key in sessionStorage):
- `riderStep` (`'pick'|'searching'|'confirmed'`), `riderCollege`, `waitingPassengers`, `acceptedPassenger`, `riderRideId`, `riderOtp`, `riderRideDetails`, `riderPickupPos`, `riderVerifyMsg`, `riderPos`
- Persisted when: `riderRideId && riderOtp` (i.e., a ride is confirmed)
- Cleared when: `riderStep === 'pick'` (removes key); `clearRiderState()` → nulls all state

### Critical: Socket Listeners Live in Context (not components)
These listeners are registered once in `RideStateContext`'s `useEffect` and survive navigation:
- `matched` (passenger-assigned)
- `passengerVerified`
- `waitingPassengers` (rider sees list)
- `newPassenger` (sorted by distance via `riderPosRef`)
- `passengerCancelled` / `passengerAccepted` (filter out from list)
- `passengerLocation` (live location on map)
- `rideDeactivated` (checks both passenger+rider ride IDs via refs)
- `rideCompleted` (shows review modal, clears state)
- `error` (generic error display)

**IMPORTANT:** If you add a new socket listener that changes ride state, register it in `RideStateContext.jsx` — NOT in the page component. Page components (`Rides.jsx`, `RiderRide.jsx`) should only READ from context and CALL context actions.

### Stale Closure Safety
Refs `matchedRideRef` and `riderRideIdRef` are kept in sync with their state counterparts (`matchedRideRef.current = matchedRide` on every render). Socket callbacks must use these refs instead of closure-captured state values to avoid stale reads.

### Geolocation Watchers in Context
Two separate `useEffect` blocks start/stop `watchPosition`:
1. **Passenger matched** — starts when `matchedRide` is set, emits `updateLocation` to ride room
2. **Rider confirmed** — starts when `riderRideId && riderOtp`, emits `updateLocation` to ride room

Both auto-cleanup on unmount or when the trigger value becomes null.

### Initialization Guard Pattern
`Rides.jsx` uses an `initializing` flag:
```js
const [initializing, setInitializing] = useState(!!navState?.college);
```
On first render, `college`/`pickup` from context may be `null` while the `useEffect` hasn't run yet. The guard renders a loading spinner (`<div className="pb-20 relative min-h-screen flex items-center justify-center">`) instead of crashing. Once the effect fires and restores/resumes state, `initializing` is set to `false`.

### Out-of-Session Persistence (page refresh)
On mount, context initializes from `sessionStorage`:
```js
const [matchedRide, setMatchedRide] = useState(() => loadPersisted(STORAGE_KEY).matchedRide || null);
```
Then a `useEffect` verifies the persisted match is still valid via `GET /api/rides/my-match`. If invalid, `clearState()` is called.

### Connection-Loss Reset
When `connected` becomes `false` (socket disconnected):
- If `matchedRideRef.current` is set → `clearState()` (passenger ride lost)
- If `riderRideIdRef.current` is set → `clearRiderState()` (rider ride lost)

### Actions Exposed to Components

**Passenger:** `startRideRequest`, `cancelRideRequest`, `retryRideRequest`, `dismissReview`
**Rider:** `setRiderCollegeAndSearch`, `stopFindRiders`, `riderAcceptRequest`, `riderClearVerifyMsg`, `riderMarkVerified`, `riderEndRide`, `clearRiderState`, plus individual setters (`setRiderStep`, `setAcceptedPassenger`, etc.) for edge cases

### What NOT to Do
- ❌ Do NOT add socket `on()` listeners for ride events in `Rides.jsx` or `RiderRide.jsx` — they won't survive navigation.
- ❌ Do NOT use closure-captured `matchedRide` / `riderRideId` in socket callbacks inside context — use the refs.
- ❌ Do NOT change the sessionStorage keys (`ur_ride`, `ur_rider_ride`) without updating `ProfileManagement.jsx` logout guard.
- ❌ Do NOT add new ride-related state that should survive navigation outside of `RideStateContext`.
- ✅ Do add new page-specific UI state (e.g., `sheetExpanded`, `showCancel`) inside the component as regular `useState`.

## Caching & Performance
- Code splitting with `React.lazy` + `Suspense` in App.jsx
- TailwindCSS purge + minification in build
- No lazy loading on images (static SVGs only)
- Backend: compression middleware, MongoDB pool tuning (maxPoolSize=20)
- Frontend: shimmer skeleton UI while waiting

## Completed UI Features (Jul 28)
- **Rider matched card:** Tap-to-expand bottom card in flex layout (`flex-col h-[calc(100vh-5rem)]`). Collapsed shows passenger avatar, name, price, OTP/Verified badge, chevron. Expanded shows distance, OTP verify, end ride. Map fills `flex-1`.
- **Passenger matched card:** Same tap-to-expand card as rider. Collapsed shows driver avatar, name, price, OTP/Verified badge. Expanded shows OTP display, cancel button, "Heading to college".
- **Price sync:** `Home.jsx` calculates `distance * 4 + 10`, passed through nav state → socket emit → stored on RideRequest → used on Ride creation. Both sides display `price` from `rideDetails`.
- **Logout guard:** ProfileManagement checks `sessionStorage` for `ur_rider_ride` or `ur_ride` before logging out. Shows error toast if active ride exists.
- **OTP display fix:** Removed `matchedRide` from useEffect deps in Rides.jsx to prevent OTP reset to dashes.

## Pending UI Fixes
- **Rides.jsx OTP/footer overlap:** After matching, the driver info + OTP card overflows past the mobile viewport and overlaps the bottom nav. Fix: remove `max-h-[50vh]` on the card container (`line 352`) when `matchedRide` is true, since the matched content is short and doesn't need height limiting.

## Known Issues & Gotchas
- Render free tier cold start ~30–60s. UptimeRobot (free) monitoring the health endpoint mitigates this
- `uploads/` directory created on server startup (fixes multer "Network error" on Render)
- Vite `server.headers` for caching only applies to dev server; Vercel uses `vercel.json` for production headers (static assets: immutable 1 year, HTML: revalidates)
- Query params preserve UI state across refreshes on AdminDashboard, Complaints, Home, RiderRide
- Geolocation in `RiderRide.jsx` inside useEffect — must also emit immediately without coords as fallback (timeout 5s)

## Planned / Discussed

- **Emergency SOS:** Share ride details (driver name, vehicle number, live location) with emergency contact via SMS. Adds trust `for students/parents.
- **Separate rider profile page:** Different from passenger profile. Shows earnings, ride history, vehicle details, ratings. Passenger profile keeps it simple (rides joined, money saved).
- No OOP refactor planned — current functional style is fine for project size.

## TODO — Next Session

### 1. Payment History page (`/app/payments`)

Currently `Payments.jsx` is a static placeholder — it does nothing. Build a real history:

- Each entry shows: **rider name**, **payment method** (Cash / UPI), **fare price**, **ride ID**.
- Works for both roles (rider sees their passengers + earnings; passenger sees the driver they paid).
- Add a backend endpoint (e.g. `GET /api/payments/history`) returning rides with `driver`/`passengers` populated, `price`, `paymentMethod`, `paymentStatus`, `_id`, sorted by date desc.
- Follow the pattern used in `MyRides.jsx` + `getMyRideHistory` in `backend/controllers/rideController.js`.

### 2. UPI ID verification (approved approach)

Decision: **format validation + PSP handle whitelist** (free, offline) and rely on the UPI app's own VPA check at pay time as the final safety net. No live VPA lookup API (needs paid merchant keys).

- Add a shared regex validating `local-part@handle` (local: alphanumeric + `.-_`; handle: real PSP like `ybl`, `oksbi`, `okhdfcbank`, `okaxis`, `paytm`, `apl`, etc.).
- Keep a whitelist of valid UPI handles; reject unknown ones.
- Enforce **client-side** (ProfileManagement UPI field, instant feedback) and **server-side** (authController `updateProfile`) so it can't be bypassed.
- No live API check — the passenger's UPI app validates the VPA when they tap "Pay Now"; rider can always update their UPI ID from Profile.
