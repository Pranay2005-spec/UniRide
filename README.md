# UniRide

Campus ride-sharing app connecting students (passengers) with verified student drivers (riders) for dynamic fare (distance × 4 + 10) between local colleges.

## Stack

- **Frontend:** Vite + React 19 + Tailwind CSS + Framer Motion + React Leaflet
- **Backend:** Express + MongoDB (Mongoose) + Socket.io
- **Auth:** JWT stored in localStorage
- **Deployment:** Frontend on Vercel, Backend on Render (free tier)

See `AGENTS.md` for full project context, real-time flow, and session persistence architecture.

## Modules & Libraries

### Frontend — Runtime Dependencies

| Module | Version | Why we use it |
|---|---|---|
| `react` / `react-dom` | ^19.2.7 | UI framework — component-based views |
| `react-router-dom` | ^7.18.1 | Client-side routing between pages (Home, Rides, Profile, …) |
| `framer-motion` | ^12.42.2 | Smooth animations — card expand/collapse, page transitions, modals |
| `leaflet` | ^1.9.4 | Interactive map engine (OpenStreetMap tiles) |
| `react-leaflet` | ^5.0.0 | React wrapper for Leaflet — map markers, fly-to, live location |
| `socket.io-client` | ^4.8.3 | Real-time connection to the backend (ride matching, live location, chat, payment events) |
| `qrcode.react` | ^4.2.0 | Generates the UPI QR code the rider shows to the passenger |

### Frontend — Dev & Build Tooling

| Module | Version | Why we use it |
|---|---|---|
| `vite` | ^8.1.1 | Dev server + production bundler (fast HMR, code-splitting) |
| `@vitejs/plugin-react` | ^6.0.3 | Vite plugin for React fast refresh |
| `tailwindcss` | ^3.4.19 | Utility-first CSS framework — all styling |
| `autoprefixer` | ^10.5.2 | Adds vendor prefixes to compiled CSS |
| `postcss` | ^8.5.16 | CSS transformation pipeline (used by Tailwind) |
| `oxlint` | ^1.71.0 | Fast Rust-based linter for the frontend |

### Backend — Runtime Dependencies

| Module | Version | Why we use it |
|---|---|---|
| `express` | ^4.21.0 | HTTP server + REST API routing |
| `mongoose` | ^8.6.0 | MongoDB ODM — schemas & models (User, Rider, Ride, RideRequest, …) |
| `socket.io` | ^4.8.3 | Real-time server — request matching, ride rooms, live location, chat |
| `jsonwebtoken` | ^9.0.2 | JWT generation & verification for authentication |
| `bcryptjs` | ^2.4.3 | Password hashing (bcrypt) |
| `multer` | ^1.4.5-lts.1 | File uploads — license photos, profile pictures, student ID cards |
| `dotenv` | ^16.4.5 | Loads environment variables from `.env` |
| `cors` | ^2.8.5 | Allows cross-origin requests from the frontend |
| `helmet` | ^8.3.0 | Sets secure HTTP headers |
| `compression` | ^1.8.1 | Gzip-compresses API responses (faster on Render free tier) |
| `express-mongo-sanitize` | ^2.2.0 | Blocks NoSQL injection (e.g. `$where`, `$gt` payloads) |
| `hpp` | ^0.2.3 | Protects against HTTP parameter pollution |
| `express-rate-limit` | ^8.6.1 | Rate limiting on sensitive endpoints (OTP, login) |

### External Services & Built-ins (no package)

| Service | Where it's used |
|---|---|
| OpenStreetMap tiles | Map backgrounds in React Leaflet |
| `upi://pay` deep link | Opens the passenger's UPI app to pay the rider |
| `sessionStorage` | Survives page refresh for an active ride (ride state persistence) |
| Haversine formula | Distance calculation between rider & passenger (ride matching) |

## Payment Flow (current)

- Passenger picks **Cash** or **UPI** at request time.
- Passenger pays via the "Pay Now" UPI deep link or cash; the **rider** confirms payment (passenger has no confirm button).
- Backend: `PATCH /api/rides/:id/payment` is **rider-only** (403 for passengers).
- Payment status syncs to both sides via the `paymentConfirmed` socket event.

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
