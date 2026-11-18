# Sarawak Tourism System (STS) — MERN Implementation

Implementation of the Object Design Document (`Group13_SWE30003_Assignment 2_Object Design_SRS.pdf`)
using the MERN stack: **MongoDB + Express.js + React + Node.js**.

## Structure

```
sts-server/   Express + Mongoose REST API (the "business layer" classes from the ODD)
sts-client/   React (Vite) single-page frontend
```

## ODD class → implementation mapping

| ODD class | Implementation |
|---|---|
| Account | `sts-server/src/models/Account.js` + `/api/auth/*` (JWT, roles, Invalid Email/Password exception) |
| Tourist | `models/Tourist.js`, self-registers via `/api/auth/register` |
| ServiceProvider | `models/ServiceProvider.js`, manages listings via `/api/mine/*` |
| Service | `models/Service.js` — one class, `type` field (Factory Method, ODD 5.1.1) |
| Package | `models/Package.js` — Composite structure, booked like a Service (ODD 5.3.1) |
| Attraction | `models/Attraction.js` + `/api/attractions` (Staff-managed) |
| Booking | `models/Booking.js` + `/api/bookings` (availability check, status lifecycle) |
| Payment | `models/Payment.js` + `utils/paymentProvider.js` — simulated 3rd-party gateway (Strategy, ODD 5.2.1); never stores card details |
| Review | `models/Review.js` + `/api/reviews` — one per confirmed/completed booking (A13) |
| Trip | `models/Trip.js` + `/api/trips` — schedule conflict detection (ODD 7.1) |
| Statistic | `models/Statistic.js` + `/api/admin/reports` — aggregated tourism reports (ODD 7.5) |
| Staff | role `staff`; attractions/accounts/bookings consoles |
| Admin | role `admin`; listing verification + reports (`/api/admin/*`) |
| MainController | `src/index.js` bootstrap + Express router delegation (Singleton, ODD 5.1.2) |

Observer pattern (ODD 5.2.2): booking confirmation/cancellation emits notification events
(console stub for the external email/SMS service, per ODD 2.2 simplification).

## Run it

### 1. Backend

```bash
cd sts-server
npm install
cp .env.example .env   # already provided; default uses in-memory MongoDB
npm run seed           # demo data (optional but recommended)
npm run dev            # http://localhost:5000
```

`MONGO_URI` options:
- `memory://sts` — embedded MongoDB (default `.env`; first run downloads a binary)
- `mongodb://127.0.0.1:27017/sts` — local MongoDB
- `mongodb+srv://...` — MongoDB Atlas

### 2. Frontend

```bash
cd sts-client
npm install
npm run dev            # http://localhost:5173 (proxies /api -> :5000)
```

## Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@sts.local | admin123 |
| Staff | staff@sts.local | staff123 |
| Service Provider | provider@sts.local | provider123 |
| Tourist | tourist@sts.local | tourist123 |

## Key flows

- **Book a service** (ODD §6/§7.2): tourist → `POST /api/bookings` (pending) → `POST /api/bookings/:id/pay`
  → simulated provider → confirmed + notification event.
- **Cancel a booking** (§7.3): provider's `freeCancelHours`/`refundPercent` policy decides refund; a `refund`
  Payment record is created.
- **Verify a listing** (§7.4): providers submit → status `pending`; admin verifies/rejects; only `verified`
  listings are publicly visible.
- **Generate a report** (§7.5): admin picks a date range → `Statistic` aggregates bookings, revenue,
  reviews, registrations and top items.

## Notes / simplifications

- Reviews are allowed on `confirmed` bookings (the ODD says "completed stay"; a `completed` status exists
  in the model for when the end date passes).
- Availability = no overlapping pending/confirmed booking for the same item/dates (no per-date inventory).
- Payments are simulated in-process; swap `utils/paymentProvider.js` for a real gateway (Stripe/Billplz)
  without touching other classes — the Strategy boundary from the ODD.
