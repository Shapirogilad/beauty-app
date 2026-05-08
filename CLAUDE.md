# CLAUDE.md — Dura (דורה) | Women's Grooming Appointment App

## Project Overview

**Dura** (דורה) is a Hebrew-language mobile app for booking women's grooming appointments across 10 categories: hairdresser, nails, manicure/pedicure, laser, waxing, eyebrows, eyelashes, facial, massage, and makeup — inspired by the UX of the LAZUZ sports booking app.

The app serves two roles:
- **Clients** — discover salons/freelancers, view availability, book and pay instantly
- **Business owners / Stylists** — manage their schedule, services, pricing, and accept payments

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | React Native + Expo | Cross-platform iOS/Android, fast iteration |
| Language | TypeScript | Type safety across the entire project |
| Backend | Node.js + NestJS | REST API, modular architecture, built-in DI |
| Database | PostgreSQL (local for dev) | Relational — suits scheduling + bookings |
| Auth | Firebase Auth | Easy phone/SMS login (common in Israel) |
| Payments | Tranzila | Israeli payment processor — card tokenization wallet |
| Push Notifications | Firebase Cloud Messaging (FCM) | Booking confirmations, reminders, waitlist |
| Storage | AWS S3 / Cloudinary | Profile photos, salon images |
| Maps | Google Maps SDK | "Near me" discovery |
| State Management | Zustand | Lightweight global state |
| Navigation | React Navigation v6 | Stack + Tab navigators |

---

## App Architecture

```
dura/
├── app/                  # React Native (Expo) mobile app
│   ├── screens/
│   │   ├── auth/         # Login, OTP verification
│   │   ├── client/       # Home, Search, Salon details, Book, Profile
│   │   ├── business/     # Dashboard, Schedule, Services, Earnings
│   │   └── shared/       # Notifications, Settings
│   ├── components/       # Reusable UI components (RTL-ready)
│   ├── navigation/       # Route definitions
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand state slices
│   ├── services/         # API calls, payment integration
│   ├── utils/            # Date/time helpers (Hebrew locale)
│   └── i18n/             # Hebrew strings (he.json)
├── server/               # Node.js backend
│   ├── routes/
│   ├── controllers/
│   ├── models/           # Prisma ORM models
│   ├── middleware/
│   └── services/         # Scheduling engine, payment, notifications
├── prisma/               # DB schema + migrations
└── CLAUDE.md
```

---

## Service Categories (קטגוריות שירות)

Each category maps to a distinct business type and drives filtering in the discovery screen.

| # | Category (EN) | Hebrew | Notes |
|---|---|---|---|
| 1 | Hairdresser | מספרה / שיער | Haircut, blowout, coloring, highlights, keratin (3h+), extensions |
| 2 | Nails | ציפורניים | Gel polish, acrylic, nail art |
| 3 | Manicure / Pedicure | מניקור / פדיקור | Classic nail care — distinct from gel; includes cuticles, shaping, spa pedicure |
| 4 | Laser Hair Removal | לייזר | Permanent/semi-permanent sessions; requires course-of-treatment booking |
| 5 | Waxing / Depilation | שעווה / אפילציה | Non-laser hair removal: arms, legs, bikini, upper lip |
| 6 | Eyebrows | גבות | Threading, waxing, microblading, lamination, tinting |
| 7 | Eyelashes | ריסים | Extensions, lifting, tinting — distinct from eyebrows |
| 8 | Facial | טיפול פנים | Cleansing, peeling, hydration, anti-aging treatments |
| 9 | Massage | עיסוי | Swedish, deep tissue, lymphatic — often offered by spas alongside facials |
| 10 | Makeup | איפור | Bridal, event, photoshoot — high-value, longer appointments |

> **Scheduling note:** Keratin (3+ hours), laser courses, and bridal makeup require special handling in the slot engine — longer durations and possibly multi-session bookings.

---

## Core Features

### Client Side (לקוחה)

1. **Authentication**
   - Phone number login with OTP (SMS)
   - Profile: name, photo, favorite salons

2. **Discovery (גילוי)**
   - Browse by category (see Service Categories table above)
   - Filter by: location, price range, rating, availability today
   - Map view + list view (inspired by LAZUZ)
   - Search by salon name or stylist name

3. **Salon / Stylist Profile**
   - Photos gallery
   - Service menu with prices and duration
   - Ratings and reviews
   - Real-time availability calendar
   - "Next available slot" quick-book button (LAZUZ-inspired)

4. **Booking Flow (הזמנה)**
   - Step 1: Choose service
   - Step 2: Choose stylist (if multiple in salon)
   - Step 3: Pick date + time slot (visual calendar, available slots highlighted)
   - Step 4: Confirm & pay
   - Step 5: Booking confirmation with add-to-calendar option

5. **Waitlist (רשימת המתנה)**
   - Join waitlist for fully-booked slots
   - Push notification when a slot opens (LAZUZ-inspired standby alert)

6. **Payments (תשלום)**
   - In-app credit/debit card payment
   - Save card for future bookings
   - Full refund on cancellation within the defined window (default: 24 hours before)
   - Digital receipt via email/SMS

7. **My Appointments (הפגישות שלי)**
   - Upcoming appointments with countdown
   - Past appointment history
   - Re-book from history (one tap)
   - Cancel / reschedule (within policy)

8. **Reviews (ביקורות)**
   - Rate and review after each appointment
   - Photo upload with review

### Business Side (עסק / מעצבת)

1. **Onboarding**
   - Register salon or freelancer profile
   - Upload photos, set services, prices, and duration per service
   - Define working hours per day of week
   - Set cancellation policy

2. **Schedule Dashboard (לוח זמנים)**
   - Day / Week view of all appointments
   - Manual block of unavailable times (vacation, break)
   - See client details per booking

3. **Service Management (שירותים)**
   - Add/edit/remove services
   - Set per-service duration (drives the slot engine)
   - Optional: allow clients to request custom services

4. **Notifications & Reminders**
   - Auto-reminder to client 24 hours before
   - Auto-reminder to client 2 hours before
   - Notification on new booking, cancellation, review

5. **Earnings (הכנסות)**
   - Daily/monthly revenue summary
   - Payout to business bank account (via Tranzila/Cardcom)

---

## Scheduling Engine Rules

- Slots are generated based on: working hours + service duration + existing bookings + buffer time between appointments
- No double-booking: slot locks when booking is initiated (optimistic lock, 5-min timeout)
- Buffer time between appointments: configurable per business (e.g., 10 minutes)
- Support for multi-stylist salons: each stylist has their own independent schedule

---

## Database Schema (Key Entities)

```
User            — id, phone, name, photo, role (client | business)
Business        — id, owner_id, name, address, lat, lng, photos, category
Stylist         — id, business_id, name, photo (for multi-stylist salons)
Service         — id, business_id, stylist_id?, name, price, duration_minutes
WorkingHours    — id, stylist_id, day_of_week, open_time, close_time
Booking         — id, client_id, stylist_id, service_id, start_at, end_at, status, payment_id
Payment         — id, booking_id, amount, currency(ILS), status, provider_ref
Review          — id, booking_id, client_id, rating, text, photos[]
WaitlistEntry   — id, client_id, service_id, date, notified_at
```

---

## Localization & RTL

- **All UI text in Hebrew** — stored in `i18n/he.json`
- **RTL layout** throughout — use `I18nManager.forceRTL(true)` in React Native
- Date formatting: Hebrew locale (`he-IL`) — Sunday as first day of week
- Currency: ILS (₪)
- Phone format: Israeli (+972)

---

## Design Guidelines

Inspired by LAZUZ's clean, sports-app aesthetic — adapted for a feminine, premium grooming context:

- **Color palette**: Warm neutrals (cream, soft rose, deep mauve) with a dark accent
- **Typography**: Clean sans-serif, bold Hebrew-friendly font (e.g., Heebo or Rubik)
- **Icons**: Line-style icons, gender-neutral-to-feminine
- **Availability view**: Color-coded time grid — green = available, gray = booked, yellow = waitlist
- **Cards**: Rounded corners, shadow, salon photo as card header (like LAZUZ facility cards)
- **Onboarding**: 3-screen swipe with value props, then phone login

---

## Development Phases

### Phase 1 — MVP (Client Booking)
- [ ] Auth (phone OTP)
- [ ] Browse salons by category
- [ ] Salon profile + service list
- [ ] Availability calendar + slot selection
- [ ] Booking creation
- [ ] In-app payment (test mode)
- [ ] Booking confirmation screen
- [ ] My Appointments screen

### Phase 2 — Business Dashboard
- [ ] Business onboarding flow
- [ ] Schedule management (day/week view)
- [ ] Block unavailable times
- [ ] View incoming bookings
- [ ] Cancellation handling

### Phase 3 — Smart Features
- [ ] Push notifications (reminders, confirmations)
- [ ] Waitlist + slot-open alerts
- [ ] Reviews system
- [ ] Re-book from history

### Phase 4 — Growth
- [ ] Earnings dashboard for businesses
- [ ] Promotions / discount codes
- [ ] Loyalty points
- [ ] Referral program

---

## Coding Conventions

- **Language**: TypeScript everywhere (strict mode)
- **Formatting**: Prettier + ESLint (Airbnb config)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`)
- **API**: RESTful, JSON, versioned (`/api/v1/`)
- **Error handling**: Centralized error middleware on server; toast notifications on client
- **Testing**: Jest for unit tests; Detox for E2E mobile tests
- **Secrets**: Never commit `.env` files; use `.env.example` as template

---

## Key Commands

```bash
# Start mobile app
cd app && npx expo start

# Start backend
cd server && npm run dev

# Run DB migrations
npx prisma migrate dev

# Run tests
npm test
```

---

## Important Notes

- Always design screens with RTL in mind first — Hebrew is the primary language
- Payments must go through an Israeli payment processor (Tranzila / Cardcom / Meshulam)
- Availability slots must account for Jewish holidays (Shabbat, Chagim) — no bookings on Shabbat by default
- App Store & Google Play require Hebrew app store listing
