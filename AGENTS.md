# UniRide — Project Context

## Stack
- **Frontend:** Vite + React 18 + Tailwind CSS + Framer Motion + React Leaflet
- **Backend:** Express + MongoDB (Mongoose) + Socket.io
- **Auth:** JWT stored in localStorage
- **Deployment:** Frontend on Vercel, Backend on Render (free tier)
- **Architecture:** Functional/procedural style (Mongoose models are the only OOP layer)

## Project Purpose
Campus ride-sharing app connecting students (passengers) with verified student drivers (riders) for ₹30 flat fare between local colleges.

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
- Payment fields to add: `paymentMethod: 'cash' | 'online'`, `paymentStatus: 'pending' | 'paid'`

### Ride
- `driver` (ref Rider or User), `pickup`, `route`, `date/time`, `active`, `currentStop`
- `passengers: [{ user, otp, location, verified }]`
- `currentLocation: { lat, lng }`
- Payment fields to add: `razorpayOrderId`, `paymentStatus`

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

## Caching & Performance
- Code splitting with `React.lazy` + `Suspense` in App.jsx
- TailwindCSS purge + minification in build
- No lazy loading on images (static SVGs only)
- Backend: compression middleware, MongoDB pool tuning (maxPoolSize=20)
- Frontend: shimmer skeleton UI while waiting

## Pending UI Fixes
- **Rides.jsx OTP/footer overlap:** After matching, the driver info + OTP card overflows past the mobile viewport and overlaps the bottom nav. Fix: remove `max-h-[50vh]` on the card container (`line 352`) when `matchedRide` is true, since the matched content is short and doesn't need height limiting.

## Known Issues & Gotchas
- Render free tier cold start ~30–60s. UptimeRobot (free) monitoring the health endpoint mitigates this
- `uploads/` directory created on server startup (fixes multer "Network error" on Render)
- Vite `server.headers` for caching only applies to dev server; Vercel uses `vercel.json` for production headers (static assets: immutable 1 year, HTML: revalidates)
- Query params preserve UI state across refreshes on AdminDashboard, Complaints, Home, RiderRide
- Geolocation in `RiderRide.jsx` inside useEffect — must also emit immediately without coords as fallback (timeout 5s)

## Planned / Discussed
- **Payment methods:** Cash (keep as-is) + Razorpay (online). Passenger selects at request time. Backend creates Razorpay order on ride acceptance, passenger pays after OTP verification. Webhook to confirm. Models need new fields (see above).
- **Rider signup simplify:** Remove `docType` dropdown from RiderSignup.jsx. Only ask for driving license (file upload + license number). Update `riderDocs` array in Rider model to be just `drivingLicense` fields.
- **Chat between rider & passenger:** Lightweight approach — use existing `ride:${rideId}` socket room. Add `sendMessage` event, no persistence. Inbox icon on Rides.jsx & RiderRide.jsx to open chat bubble overlay. No history needed since rides are short.
- **Rating & reviews:** 1–5 star rating after each ride. Backend model + endpoint. Prompts both rider and passenger after ride completion.
- **Emergency SOS:** Share ride details (driver name, vehicle number, live location) with emergency contact via SMS. Adds trust for students/parents.
- **Separate rider profile page:** Different from passenger profile. Shows earnings, ride history, vehicle details, ratings. Passenger profile keeps it simple (rides joined, money saved).
- No OOP refactor planned — current functional style is fine for project size.
