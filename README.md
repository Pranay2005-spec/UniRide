# UniRide

Campus ride-sharing app connecting students (passengers) with verified student drivers (riders) for dynamic fare (distance × 4 + 10) between local colleges.

## Stack

- **Frontend:** Vite + React 18 + Tailwind CSS + Framer Motion + React Leaflet
- **Backend:** Express + MongoDB (Mongoose) + Socket.io
- **Auth:** JWT stored in localStorage
- **Deployment:** Frontend on Vercel, Backend on Render (free tier)

See `AGENTS.md` for full project context, real-time flow, and session persistence architecture.

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
