# Product Requirements Document (PRD)
# Doctor Booking & Appointment System (Multi-Doctor Marketplace)

| Field | Value |
|---|---|
| Version | 1.0 |
| Stack | Node.js, Express, MongoDB (Mongoose), React (JavaScript), Razorpay |
| Market | India (INR, IST timezone, GST, Razorpay) |
| Audience | Developers building backend + frontend; QA; Product owner |

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Roles & Permission Matrix](#2-roles--permission-matrix)
3. [Appointment Types: Business Rules](#3-appointment-types-business-rules)
4. [Functional Requirements by Module](#4-functional-requirements-by-module)
5. [Slot Holding & Concurrency Design](#5-slot-holding--concurrency-design)
6. [Payments (Razorpay) & Money Flow](#6-payments-razorpay--money-flow)
7. [Subscription System](#7-subscription-system)
8. [Notifications, Emails & Reminders](#8-notifications-emails--reminders)
9. [State Machines](#9-state-machines)
10. [Data Models (Mongoose)](#10-data-models-mongoose)
11. [REST API Specification](#11-rest-api-specification)
12. [Frontend Specification](#12-frontend-specification)
13. [Background Jobs](#13-background-jobs)
14. [Edge Cases & Real-World Scenarios](#14-edge-cases--real-world-scenarios)
15. [Non-Functional Requirements, Security & Compliance](#15-non-functional-requirements-security--compliance)
16. [Project Structure & Environment](#16-project-structure--environment)
17. [Testing & Acceptance Criteria](#17-testing--acceptance-criteria)
18. [Delivery Phases](#18-delivery-phases)
19. [Assumptions & Items To Verify](#19-assumptions--items-to-verify)

---

## 1. Product Overview

### 1.1 Vision
A web platform where patients discover doctors, view complete profiles, and book appointments online by paying through Razorpay. Doctors are onboarded **only by the Admin**, pay a subscription to stay listed, and manage their appointments, schedules, fees and profile from a dashboard. Consultation money goes **directly to the doctor's bank account** (via Razorpay Route); the platform earns from doctor subscriptions.

### 1.2 Goals
- Zero double-booking, even with many users on the same slot at the same time.
- A slot is never blocked indefinitely by an unpaid user (short time-limited hold).
- Three appointment types with different rules (Normal, Premium, Home Visit), each switchable by the doctor.
- Doctor-wise payment settlement with a transparent breakdown (gross, gateway fee, tax, net).
- Subscription lifecycle (trial → active → grace → expired) fully automated with notifications.
- Complete admin control over doctors, patients, subscriptions and appointments.

### 1.3 Non-Goals (v1)
Video consultation, e-prescriptions/EMR, insurance, pharmacy, in-app chat, doctor reviews/ratings (listed in Phase 3), multi-clinic per doctor, multi-currency, native mobile apps (web is fully responsive).

### 1.4 Glossary
| Term | Meaning |
|---|---|
| Patient / User | Person who registers and books appointments |
| Doctor | Onboarded by Admin; has a public profile and dashboard |
| Admin | Platform operator (Super Admin; optional Sub-Admin with limited rights) |
| Slot | A bookable time window (date + start + end) for Premium or Home Visit |
| Hold | Temporary reservation of a slot while payment is in progress (default 10 min) |
| Token | Queue number for Normal appointments; also a booking code for all types |
| Linked Account | Doctor's Razorpay Route sub-merchant account that receives consultation money |
| Paise | All money is stored as integer paise (₹1 = 100 paise) to avoid float errors |

### 1.5 Global Conventions
- **Timezone:** All timestamps stored in UTC (`Date`). Appointment calendar dates are stored additionally as `dateStr` (`YYYY-MM-DD`) and `startTime`/`endTime` (`HH:mm`) interpreted in `Asia/Kolkata`. Use `dayjs` + timezone plugin on both backend and frontend.
- **Money:** integer paise everywhere in DB/API; formatted as ₹ only in UI.
- **IDs:** Mongo ObjectId; human-readable codes for bookings (e.g. `APT-241005-7K3F9`).
- **Soft delete:** never hard-delete doctors, patients, appointments or payments; use `isDeleted`/status flags.
- **Audit:** every admin action and every status change on appointments/subscriptions/payments writes an `AuditLog`.

---

## 2. Roles & Permission Matrix

| Capability | Guest | Patient | Doctor | Admin |
|---|:--:|:--:|:--:|:--:|
| Browse/search doctors, view profiles | ✅ | ✅ | ✅ | ✅ |
| Register / login (patient) | ✅ | | | |
| Book appointment & pay | ❌ (redirected to login) | ✅ | ❌ | ❌ |
| Cancel own appointment | | ❌ (never) | | |
| View own appointment history, receipts, tokens | | ✅ | | |
| Self-register as doctor | ❌ | ❌ | ❌ | n/a (Admin onboards only) |
| Edit own profile, gallery, fees, toggles, schedules | | | ✅ | ✅ (any doctor) |
| View/manage own appointments (complete/no-show/cancel/reschedule) | | | ✅ | ✅ (any) |
| Pay/renew subscription | | | ✅ | ✅ (manual grant) |
| Onboard/suspend/edit doctors | | | | ✅ |
| Manage patients (block/unblock/edit) | | | | ✅ |
| Configure plans, platform settings | | | | ✅ |
| View all payments/refunds/audit logs | | | own only | ✅ |

**Sub-Admin (optional, Phase 2):** Admin can create sub-admins with module-level permissions (`doctors`, `patients`, `appointments`, `subscriptions`, `payments`, `settings`). Only Super Admin can manage sub-admins and settings.

---

## 3. Appointment Types: Business Rules

### 3.1 Summary Table
| Aspect | Normal | Premium | Home Visit |
|---|---|---|---|
| Patient chooses | Nothing (just pays) | Exact date + time slot | Address + date + time slot |
| Where | Doctor's clinic | Doctor's clinic | Patient's address |
| Time guarantee | No fixed time; queue priority | Fixed slot | Fixed slot |
| Validity | 2 days (admin-configurable) | The booked slot | The booked slot |
| Priority | Order of successful payment (first booked = first served) | Slot time | Slot time |
| Doctor-defined schedule | Daily token limit + optional walk-in hours | Weekly working days/hours, slot duration, leaves | Separate weekly schedule, service area, travel buffer |
| Fee | `normalFee` | `premiumFee` | `homeVisitFee` |
| Can be toggled off | ✅ | ✅ | ✅ |
| Patient cancel | ❌ | ❌ | ❌ |
| Doctor cancel (auto refund) | ✅ | ✅ | ✅ |

### 3.2 Normal Appointment (Queue/Token based)
1. Patient opens doctor page → selects **Normal** → enters patient details → pays.
2. On payment success a **queue token** is issued: `tokenSeq` (monotonic per doctor, used for ordering) and `tokenLabel` (e.g. `N-014`, per-doctor-per-booking-day counter shown to patient).
3. **Validity:** from payment time until end of day (23:59:59 IST) of `bookingDate + (normalValidityDays − 1)`. Default `normalValidityDays = 2` → booked on 5 Oct ⇒ valid till 6 Oct 23:59 IST.
4. **Priority:** Doctor's "Normal Queue" is sorted by `tokenSeq` ascending across all valid, unconsumed tokens, so earlier bookings are always served first (including yesterday's carry-over tokens).
5. Patient visits within validity; doctor/clinic staff marks the token `COMPLETED`. Tokens not consumed by the validity end become `EXPIRED` (no auto refund by default; Admin setting `refundOnNormalExpiry` default `false`; Admin/doctor can still refund manually).
6. **Limits:** Doctor sets `normalDailyTokenLimit` (max new tokens issued per calendar day; `0` = unlimited). When exhausted, Normal shows "Tokens full for today, try tomorrow".
7. **Doctor leave handling:** Doctor marks a leave/holiday date → all active Normal tokens whose validity includes that date are **auto-extended** by one day per leave day (setting `autoExtendOnLeave`, default ON) and patients are emailed. Normal booking is blocked if the doctor is on leave for the entire validity window.
8. Doctor may set optional **walk-in hours** per weekday (display-only text such as "Mon–Sat 10:00–13:00") shown to patients on the confirmation page and email.
9. Doctor can **cancel (refund)**, **extend validity**, **mark no-show** (token consumed, no refund), or **complete**.

### 3.3 Premium Appointment (Slot based)
1. Patient picks a **date** (within `advanceBookingDays`, default 30) and an **available slot**.
2. Slots are generated from the doctor's Premium schedule (see 4.6). Capacity per slot = 1.
3. Booking flow uses a **slot hold** (Section 5) → payment → confirmation.
4. Minimum notice (`minNoticeMinutes`, default 60) prevents booking slots starting too soon.

### 3.4 Home Visit
1. Doctor must enable Home Visit and configure: weekly schedule, slot duration (typically 30–60 min), `travelBufferMin`, **service area** (radius in km from clinic **or** list of pincodes), and fee.
2. Patient chooses/enters a **complete address**: name, phone, house/flat, street, landmark, area, city, state, pincode, map pin (lat/lng via Google Places autocomplete + draggable marker), notes (floor, gate code). Saved addresses can be reused.
3. System validates the address is inside the service area (pincode list match or Haversine distance ≤ radius). If not → "Doctor does not serve this area".
4. Patient then selects a date and slot from the Home Visit schedule, and pays through the same hold → payment → confirm flow.
5. Doctor sees full address, phone, map link ("Open in Google Maps"), and notes. Status flow includes `EN_ROUTE` (optional) → `IN_PROGRESS` → `COMPLETED`.
6. Address snapshot is stored on the appointment (immutable copy).

### 3.5 Fees & Toggles
- Doctor sets `fees.normal`, `fees.premium`, `fees.homeVisit` (paise; min ₹1, max ₹1,00,000).
- Doctor toggles `types.normal.enabled`, `types.premium.enabled`, `types.homeVisit.enabled` independently. Disabled types are hidden on the public profile and rejected by the API.
- **Fee change rule:** fee at booking time is snapshotted on the appointment; changing fees never affects existing bookings. Fee changes apply to new holds only.
- A type can be enabled only if its fee is set, and (for Premium/Home) at least one working day/window is defined. Turning a type **off** doesn't affect already confirmed appointments.

---

## 4. Functional Requirements by Module

### 4.1 Authentication & Accounts

**Patient registration:** name, email, phone (10-digit Indian mobile, +91), password (min 8, 1 letter, 1 number), optional DOB/gender. Email verification link (valid 24h) is sent; unverified users **can log in but cannot pay** until verified (resend option provided). Google OAuth is optional (Phase 2).

**Login:** email + password (patients, doctors, admins share the login endpoint; role returned; UI routes by role). JWT **access token (15 min)** + **refresh token (7 days, rotating, stored hashed in DB, httpOnly + Secure + SameSite=Lax cookie)**. Logout invalidates refresh token. Password reset via emailed token (valid 30 min, single-use). Account lock for 15 min after 5 failed attempts.

**Redirect-after-login (important flow):**
1. Guest on `/doctors/:slug` clicks "Book" → client navigates to `/login?redirect=/doctors/:slug&intent=book&type=premium`.
2. Login page has "Create account" link preserving the same `redirect` param. After registration → auto-login (or verify-then-login) → redirect to the same doctor page with the same selected type.
3. `redirect` must be a **relative same-origin path** (validate: starts with `/`, not `//`) to prevent open redirect.
4. Booking selection (type, date, slot) can be persisted in `sessionStorage` before redirect and restored after.

**Roles:** `PATIENT`, `DOCTOR`, `ADMIN`, `SUB_ADMIN`. Doctors and admins cannot register via public form. Public `/register` always creates `PATIENT`.

**Blocked users:** `status = BLOCKED` → cannot log in (message: contact support). Existing sessions invalidated.

### 4.2 Admin: Doctor Onboarding (Admin Only)

**Onboarding wizard (Admin panel → Doctors → Add Doctor):**
1. **Account:** full name, email (unique), phone, temporary password OR "send invite link".
2. **Professional:** specialization(s) (from master list), qualifications, experience years, medical registration number + council + year, languages, gender, bio.
3. **Clinic:** clinic name, address, city, state, pincode, map location.
4. **Payout/KYC (Razorpay Route):** legal name, PAN, bank account number, IFSC, account holder name, optional GSTIN, business type (`individual`/`proprietorship`/`partnership`/`private_limited`), registered address, contact email/phone. Backend creates the Razorpay **linked account**, stakeholder and product configuration with bank details. Raw account number is **never stored in our DB** (only last 4 digits + Razorpay IDs).
5. **Fees & types:** initial fees and toggles (doctor can change later).
6. **Plan:** automatically assigned **7-day TRIAL** (`trialDays` configurable). Admin can override (e.g., give a plan directly).
7. **Publish:** profile `isPublished` defaults `false` until Admin ticks "Publish" (or auto when minimum fields complete).
8. Doctor receives an **invite email** with "Set your password" link (valid 72h) and trial end date.

**Rules:**
- Trial starts at `onboardedAt` (the moment admin completes onboarding) and ends exactly `trialDays × 24h` later. Trial can be granted **once per doctor** (`trialUsed = true`).
- A doctor is **publicly listed and bookable** only when: `isPublished && status = ACTIVE && subscription ∈ {TRIAL, ACTIVE, GRACE} && payout.linkedAccountStatus = ACTIVE`.
- If Razorpay KYC is pending/needs clarification, the doctor is hidden from booking and Admin sees a "Payout not active" badge; Razorpay webhooks (`account.activated`, `account.needs_clarification`, `account.rejected`) update the status automatically.
- Admin can suspend/reactivate a doctor (suspended = hidden, no new bookings, existing bookings remain; Admin decides to cancel/refund).
- Admin can edit **any** doctor field, including profile, fees, schedule, and subscription.

### 4.3 Doctor Profile

**Public profile fields**
| Group | Fields |
|---|---|
| Identity | Full name, slug (unique, URL-safe), profile picture, gender, headline (e.g. "Senior Cardiologist") |
| Professional | Specializations (multi), qualifications (degree, institute, year), experience (years), medical registration no./council/year, languages, services offered (tags), awards (optional), about/bio (rich text limited, sanitized) |
| Clinic | Clinic name, address lines, city, state, pincode, **latitude/longitude**, Google Maps URL, landmark, phone (public optional), email (public optional), clinic timings text |
| Gallery | Up to 12 images (clinic photos, certificates) with captions + ordering; optional video link (YouTube) |
| Fees & types | Fees per type; toggles; displays "from ₹X" |
| Trust | "Verified" badge (admin-set), subscription status is never shown publicly |
| Social | Website, optional social links |

**Doctor can edit:** everything above except `slug` (Admin only after creation), registration number (changing it sets `verified = false` pending admin re-verification), and email (change via admin/verification flow).

**Images:** upload to Cloudinary (or S3); allowed jpeg/png/webp, max 5 MB each, auto-resized (profile 512×512, gallery max 1600px) + thumbnails; server validates MIME using file signature (not just extension). Deleting an image removes it from storage.

**Maps:** doctor searches address with Google Places Autocomplete, drags marker to adjust; stores `location: { type: "Point", coordinates: [lng, lat] }` (2dsphere indexed). Public page shows an embedded map + "Get Directions" link.

### 4.4 Doctor Dashboard

Sections (sidebar):
1. **Overview:** today's counts per type (confirmed / completed / pending), upcoming appointments, normal queue size, this month's earnings, subscription banner (days left / trial left / expired), payout account status.
2. **Appointments:** tabs by type (All / Normal / Premium / Home Visit) and status; filters (date range, status, patient name/phone/booking code); table + calendar view (day/week) for Premium & Home.
   - **Actions** (valid per state machine): *Check-in* (optional), *Start*, *Complete*, *No-show*, *Cancel (with reason; auto refund)*, *Reschedule* (Premium/Home; picks new free slot; patient emailed; no extra payment), *Add private note*, *Extend validity* (Normal).
   - Each row shows booking code, patient name/age/gender/phone, reason, type, slot/token, amount, payment status, address (home visit).
3. **Normal Queue:** live ordered list (by `tokenSeq`) of valid tokens with "Call next", "Mark complete", "Skip/no-show". Auto-refresh every 30 s (or SSE/Socket.IO in Phase 2).
4. **Schedule:** Premium weekly schedule, Home Visit weekly schedule, leaves/holidays, custom day hours, slot duration, buffers, advance booking days (see 4.6).
5. **Profile & Gallery:** edit everything in 4.3.
6. **Fees & Services:** three fees + three on/off toggles + normal daily token limit + home service area.
7. **Earnings & Payouts:** transaction ledger (booking code, date, gross, gateway fee, GST on fee, platform commission, net to doctor, transfer status, settlement UTR/date), filters, CSV export, summary cards. Refunded transactions shown negatively.
8. **Subscription:** current plan, status, end date, history, invoices, "Renew/Buy plan" (Razorpay checkout).
9. **Notifications:** in-app bell + list.
10. **Account:** change password, notification preferences.

**Restricted mode when subscription EXPIRED:** doctor can still log in, view/manage **existing** appointments (complete/cancel/refund), view earnings, view (read-only) profile, and renew. They cannot edit schedules/fees/toggles for new bookings and are hidden publicly. After renewal everything resumes instantly.

### 4.5 Patient Dashboard
- **My Appointments:** Upcoming / Past tabs; each shows doctor, type, date/slot or token, status, amount, receipt download (PDF), token, address (home), map link. **No cancel button anywhere** (UI note: "Appointments can't be cancelled by patients. Contact the clinic for help.", with doctor's public phone if available).
- **My Doctors:** unique list of doctors previously booked, with quick "Book again".
- **Payments:** history with receipts and refund status.
- **Saved addresses** (home visit), **profile** (name, phone, DOB, gender), change password, verified email status.
- **Family/other person booking:** each booking contains `patientDetails` (name, age, gender, phone, relation: self/spouse/child/parent/other, reason) so a user may book for someone else.

### 4.6 Doctor Schedules (Premium & Home Visit)

Premium and Home Visit have **independent schedules**, each defined by:

```
slotDurationMin: 10..120 (multiples of 5)
bufferMin: 0..60 (gap between slots; for Home Visit this is travel buffer)
advanceBookingDays: 1..90 (default 30)
minNoticeMinutes: default 60 (Premium), 180 (Home)
weeklyRules: [ { dayOfWeek: 0..6, isWorking: bool, windows: [ {start:"10:00", end:"13:00"}, {start:"17:00", end:"20:00"} ] } ]
```

**Exceptions** (`ScheduleException`): date-specific overrides —
- `LEAVE` (whole day or specific window; applies to Premium, Home, Normal or all),
- `CUSTOM_HOURS` (replace that day's windows for given types).
- Support date ranges (UI creates one record per date or a range record expanded on read).

**Validation rules**
- Window `start < end`; windows on the same day for the same type must not overlap; each window must fit at least one slot.
- **Cross-type overlap:** Premium and Home Visit windows on the same weekday/date **must not overlap** (a doctor can't be at the clinic and at a patient's home simultaneously). Validate on save of weekly rules and exceptions.
- Max 4 windows per day per type.
- **Changing schedule with existing bookings:** edits only affect future *unbooked* slots. If a change would remove a window containing confirmed appointments → API returns 409 with the list of conflicting appointments; doctor must reschedule/cancel those first (or use "Mark leave and cancel all" with confirmation, which refunds and notifies each patient).
- Changing `slotDurationMin` applies only to dates **without** active appointments; for dates with bookings, existing booked slots keep their times and remaining time is re-sliced to avoid overlap.

**Slot generation (computed on read, not pre-stored):**
```
for a given (doctor, type, date):
 1. if date is outside [today+minNotice, today+advanceBookingDays] → no slots
 2. start with weeklyRules[dayOfWeek]; apply ScheduleException for that date (LEAVE removes, CUSTOM_HOURS replaces)
 3. split each window into slots: start, start+duration, ... while end <= window.end (add bufferMin between)
 4. remove slots whose start < now + minNotice
 5. mark unavailable any slot that has an active Appointment lock (status PENDING_PAYMENT within hold time, or CONFIRMED/CHECKED_IN/IN_PROGRESS) in ANY type that overlaps
 6. return [{ startTime, endTime, status: "AVAILABLE" | "BOOKED" | "HELD" }]
```
Status `HELD` is shown to other users as "Unavailable (being booked)" and becomes available again automatically if the hold expires (the UI refetches slots every 20 s and on focus).

### 4.7 Public Discovery (Home, Search, Filter)

**Home page:** hero search, specialization chips, featured/top doctors, "How it works", all doctors grid with pagination (or infinite scroll), footer.

**Doctor listing card:** photo, name, specializations, experience, city/clinic, "Verified" badge, available types badges (Normal/Premium/Home), starting fee, "View Profile & Book".

**Search & filters (server-side, paginated, 12/page):**
| Filter | Behavior |
|---|---|
| Keyword `q` | Text search on name, specialization, clinic, city, services (Mongo text index + regex fallback for partial names) |
| Specialization | multi-select |
| City / Pincode | exact |
| Near me | `lat,lng,radiusKm` via `$geoNear` (2dsphere) |
| Appointment type | has Normal / Premium / Home enabled |
| Fee range | applies to the selected type (or min across enabled types) |
| Gender, Language, Min experience | simple filters |
| Available today / this week | Premium slots exist (computed; cached 60 s) |
| Sort | Relevance, Experience, Fee low→high / high→low, Distance (if near me), Newest |

**Listing visibility** uses the rule in 4.2. Doctors in `EXPIRED` subscription, `SUSPENDED`, unpublished or with inactive payout account never appear in listing or by direct URL (direct URL returns 404 "Doctor not available"; the doctor's existing patients see their history normally).

**Doctor detail page `/doctors/:slug`:** header (photo, name, badge, specializations, experience), tabs: About, Services, Gallery, Clinic & Map, **Book Appointment** panel (sticky on desktop; bottom sheet on mobile). Booking panel shows only enabled types with fees and short explanations. SEO: dynamic `<title>`, meta description, OpenGraph, JSON-LD (`Physician`).

### 4.8 Booking Flow (End to End)

```
[Doctor page] → choose type
   ├─ Normal:    patient details → review → Pay
   ├─ Premium:   date → slot → patient details → review → Pay
   └─ Home:      address (+service-area check) → date → slot → patient details → review → Pay

Not logged in at "Book" click → /login?redirect=<doctor page> → login/register → back to same doctor page with selection restored.

Pay step (server):
 1. POST /appointments/hold  (validates everything, atomically locks slot, creates PENDING_PAYMENT appointment, returns holdExpiresAt)
 2. POST /payments/create-order (creates Razorpay order with Route transfer config; idempotent per appointment)
 3. Razorpay Checkout opens (timeout ≤ hold − 2 min); countdown timer shown to user
 4. On success → POST /payments/verify (signature check) → appointment CONFIRMED (also confirmed independently by webhook)
 5. Confirmation page shows token/booking code, receipt link; email sent (receipt PDF + token)
 6. On failure/dismiss → user may retry within hold; after hold expiry → slot released, "Hold expired, please select again"
```

**Validation at hold time (all server-side):** user verified & not blocked; doctor bookable (4.2); type enabled; fee > 0; slot valid per generation rules; not in the past/min-notice; address in service area; user has < `maxActiveHoldsPerUser` (default 2) pending holds; user doesn't already have an active booking for the same doctor+slot; same patient (same phone/user) cannot hold two overlapping slots across doctors (soft rule, configurable).

**Price shown at review step** = server-computed breakdown (never trust client amount).

### 4.9 Cancellation & Refund Policy
- **Patients can never cancel.** No endpoint exists for it (API returns 403 if called; UI has no button).
- **Doctor/Admin cancel:** requires reason (enum + text). Triggers **automatic full refund** to the original payment method via Razorpay refund API with transfer reversal (`reverse_all`), emails the patient (cancellation + refund initiated), and logs audit. Refund timeline copy: "5–7 working days".
- **No-show:** no refund. **Normal expiry:** no refund (setting-controlled).
- **Platform-caused failure** (e.g., payment captured but slot lost): automatic refund (Section 5.5).
- Gateway fees are generally not returned by Razorpay on refunds. Config `refundFeeBearer = PLATFORM | DOCTOR` (default `PLATFORM`) decides who absorbs it; shown in the admin ledger.
- Partial refunds: Admin only (manual, with reason).
- **Reschedule by doctor** (Premium/Home): allowed to any free slot of that doctor/type; no payment impact; patient notified; reminders rescheduled. Patient cannot reschedule.

### 4.10 Admin Panel

| Module | Features |
|---|---|
| Dashboard | KPIs: total doctors (by subscription status), patients, appointments (today/week/month by type), GMV, subscription revenue, refunds, expiring-soon doctors (7 days), failed transfers, pending KYC; charts |
| Doctors | List with filters (status, subscription, city, specialization, payout status); create (wizard 4.2), view/edit all details, publish/unpublish, verify badge, suspend/reactivate, reset password / resend invite, view appointments/earnings, impersonate-view (read-only, Phase 2), soft delete (blocked if active future appointments) |
| Patients | List/search (name/email/phone), view profile and appointment history, block/unblock, edit details, force email verify, soft delete (anonymize PII on request per privacy policy) |
| Appointments | Global list with filters; view details/payment; cancel + refund; reschedule; resolve disputes |
| Subscriptions | Plans CRUD (name, duration monthly/quarterly/yearly, price, GST%, active flag); doctor subscription list; **manual actions**: grant/extend N days, change plan, set exact end date, upgrade, suspend, reactivate, grant complimentary plan (reason mandatory; audit-logged; email sent) |
| Payments | All Razorpay orders/payments/refunds/transfers; filters; mark reconciled; retry failed transfers; trigger manual refund; export CSV |
| Master data | Specializations, cities (optional), languages, cancellation reasons |
| Settings | `trialDays` (7), `holdMinutes` (10), `normalValidityDays` (2), `graceDays` (2), `advanceBookingDaysMax`, `maxActiveHoldsPerUser`, `feeBearer` (PATIENT/DOCTOR), `gatewayFeePercent` (2), `gstOnFeePercent` (18), `platformCommissionPercent` (0), `refundFeeBearer`, reminder offsets, support email/phone, email-from, site name/logo |
| Audit logs | Filter by actor/entity/action/date |
| Email logs | Sent/failed list with retry |

---

## 5. Slot Holding & Concurrency Design

### 5.1 Principles
- The **database** is the source of truth for slot ownership; app-level checks alone are insufficient.
- A unique partial index on a `slotLock` string makes a double-booking physically impossible.
- A hold is **short and auto-expiring**; only a **successful payment** converts a hold into a confirmed booking.

### 5.2 Slot Lock Key
For Premium/Home: `slotLock = "{doctorId}|{dateStr}|{startTime}"` (no type in key → same start time can't be double-used across Premium and Home).
Normal appointments have **no slot lock** (`slotLock = null`); they use an atomic counter + daily limit check.

```js
// Appointment schema index
AppointmentSchema.index(
  { slotLock: 1 },
  { unique: true, partialFilterExpression: { slotLock: { $type: "string" } } }
);
```
`slotLock` is **set** while status ∈ `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `EN_ROUTE`, `IN_PROGRESS`, and **unset (`$unset`)** when status becomes `EXPIRED`, `PAYMENT_FAILED`, `CANCELLED_*`. `COMPLETED` and `NO_SHOW` slots remain locked (the time passed) but may be unset to save index space.

### 5.3 Hold Algorithm (`POST /appointments/hold`)
```
1. Validate input and business rules (4.8).
2. now = Date.now()
3. Release stale holds for this exact lock (idempotent cleanup):
   Appointment.updateMany(
     { slotLock: key, status: "PENDING_PAYMENT", holdExpiresAt: { $lt: now } },
     { $set: { status: "EXPIRED" }, $unset: { slotLock: "" } })
4. Start Mongo session/transaction (replica set required):
   a. Cross-type overlap check for same doctor/date: any active appointment (any type) overlapping [start,end)? → 409 SLOT_UNAVAILABLE
   b. insert Appointment {
        status: "PENDING_PAYMENT", slotLock: key, holdExpiresAt: now + holdMinutes,
        feeSnapshot, patientDetails, addressSnapshot, ... }
   c. If duplicate-key error E11000 on slotLock → abort → 409 SLOT_TAKEN ("Someone just booked this slot. Please choose another.")
5. Return { appointmentId, bookingCode, holdExpiresAt, amountBreakdown }
```
The unique index guarantees exactly **one** winner when N users submit simultaneously.

### 5.4 Hold Expiry
- `holdMinutes` default **10**; Razorpay Checkout `timeout` option set to `(holdMinutes − 2) × 60` seconds, so checkout closes before the hold ends.
- UI shows a countdown; at 0:00 modal closes and says "Time's up".
- Sweeper job (every minute) marks expired holds `EXPIRED` + `$unset slotLock`. The hold-time cleanup in 5.3 means correctness doesn't depend on the job's timing.
- **User can't extend or re-hold repeatedly to hoard:** rate limit (`maxActiveHoldsPerUser`, plus max 5 holds per user per 10 minutes, plus per-IP limit).
- **Payment in flight at expiry:** if a Razorpay payment attempt is `authorized/captured` after expiry, handle per 5.5.
- Back to selection: if a user abandons and returns, the same user's still-valid hold for the same slot is **reused** (idempotent) instead of creating a new one.

### 5.5 Late / Duplicate Payment Handling (Critical)
Triggered by `verify` API or webhook (`payment.captured`/`order.paid`) — both go through one idempotent function `finalizePayment(paymentId)`:

```
lock Payment row (findOneAndUpdate status guard) → if already CAPTURED/processed → return (idempotent)
load Appointment
CASE A: appointment.status == PENDING_PAYMENT and hold not expired → CONFIRM (status=CONFIRMED, payment=PAID)
CASE B: appointment EXPIRED/PAYMENT_FAILED but slot still free (no one else holds slotLock):
        atomically re-acquire → set status CONFIRMED  (user paid slightly late; we honor it)
CASE C: slot was taken by someone else (E11000) or doctor no longer bookable/leave added:
        mark appointment status = "PAYMENT_FAILED", payment.status = "AUTO_REFUND_PENDING";
        create full refund via Razorpay; email user "Slot no longer available, full refund initiated"
CASE D: duplicate capture of a different payment for an already CONFIRMED appointment → refund the extra payment automatically
```
For Normal appointments (no slot) Case C applies only if the daily token limit got exhausted or type was disabled meanwhile; the booking is honored if the hold was valid at the time the order was created (prefer honoring over refunding).

### 5.6 Normal Token Allocation (atomic)
```js
// On CONFIRM of a Normal appointment
const seq   = await Counter.findOneAndUpdate({ key: `ntoken:${doctorId}` },               { $inc: { value: 1 } }, { upsert: true, new: true });
const daily = await Counter.findOneAndUpdate({ key: `ntoken:${doctorId}:${dateStr}` },    { $inc: { value: 1 } }, { upsert: true, new: true });
tokenSeq = seq.value;  tokenLabel = `N-${String(daily.value).padStart(3,"0")}`;
```
Daily limit check is done at hold time using count of today's issued + currently held Normal appointments; a final re-check is done atomically at confirm using the daily counter (if `limit > 0 && daily.value > limit` → case C refund path, only if the hold had expired; otherwise honor).

### 5.7 Idempotency
- Client sends `Idempotency-Key` header on `hold`; server stores key+user+hash for 24h and returns the same result for retries (prevents double-click duplicates).
- `create-order`: one Razorpay order per appointment (store `razorpayOrderId`); repeat calls return the existing order if still valid.
- Webhooks: `WebhookEvent` collection with unique `eventId` (`x-razorpay-event-id`) so each event is processed once.

---

## 6. Payments (Razorpay) & Money Flow

### 6.1 Two Money Streams
| Stream | Paid by | Received by | Razorpay mechanism |
|---|---|---|---|
| Consultation payments (Normal/Premium/Home) | Patient | **Doctor's bank account (directly)** | Razorpay **Route** (marketplace transfers to doctor's linked account) |
| Subscription payments | Doctor | Platform's own Razorpay account | Standard Orders |

> Route must be enabled on the platform's Razorpay account (requires Razorpay approval). If unavailable the PRD's architecture still holds but settlement to doctors must be handled by an alternative payout mechanism (see Section 19).

### 6.2 Doctor Linked Account Lifecycle
1. Admin submits KYC/bank details in onboarding → backend calls Razorpay Route APIs: create linked account → create stakeholder → request/update product configuration (route) with settlement bank details.
2. Store: `linkedAccountId`, `stakeholderId`, `productId`, `linkedAccountStatus` (`CREATED`, `NEEDS_CLARIFICATION`, `UNDER_REVIEW`, `ACTIVE`, `SUSPENDED`, `REJECTED`), `bankLast4`, `ifsc`, `panLast4` (never full account/PAN).
3. Webhooks (`account.*` / product events) sync status; Admin can view required clarifications and re-submit.
4. Bank detail changes: Admin only (re-triggers verification); doctor can request change via support.

### 6.3 Payment Flow
```
create-order:
  amounts computed server-side (6.4)
  razorpay.orders.create({ amount: total, currency: "INR", receipt: bookingCode, notes: {appointmentId, doctorId, type, patientId} })
  Payment doc created: status CREATED

checkout (frontend): key_id, order_id, amount, prefill(name,email,phone), timeout, handler(response)
verify: HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET) == signature  → finalizePayment
webhook (source of truth): payment.captured, payment.failed, order.paid, refund.processed/failed, transfer.processed/failed, account.*
```
- **Auto-capture ON** (no manual capture) to avoid authorized-but-uncaptured payments expiring.
- After capture, a **transfer** to the doctor's linked account is created (either on the order, or after capture using `POST /payments/:id/transfers` so the exact fee is known when fee-bearer = DOCTOR). Retries with backoff on failure; failed transfers appear on Admin → Payments with alert.
- Optional `on_hold` setting for Home Visit/Premium (release funds after COMPLETED) — Phase 3; default is immediate transfer.
- Reconciliation job every 10 min fetches Razorpay status for payments stuck in `CREATED/ATTEMPTED` > 15 min and finalizes/fails them (covers missed webhooks).

### 6.4 Amount Breakdown (computed by server; stored in `Payment.breakdown`)
```
consultationFee      = doctor fee snapshot (paise)
platformCommission   = round(consultationFee × platformCommissionPercent / 100)   // default 0

Fee bearer = PATIENT (default):
  convenienceFee = grossUp so doctor receives full consultationFee:
     total = ceil( consultationFee / (1 − r × (1 + g)) )        r = gatewayFeePercent/100, g = gstOnFeePercent/100
     convenienceFee = total − consultationFee    (shown to patient as "Payment processing fee")
  transferToDoctor = consultationFee − platformCommission

Fee bearer = DOCTOR:
  convenienceFee = 0 ; total = consultationFee
  after capture, read actual payment.fee and payment.tax from Razorpay
  transferToDoctor = total − actualFee − actualTax − platformCommission
```
Both models display to the doctor: Gross collected, Gateway fee, GST on fee, Platform commission, **Net to doctor**, Transfer status, Settlement ID/UTR when available. Differences between estimated and actual gateway fee in PATIENT mode are absorbed by the platform and visible to Admin in reports.
Doctor consultation fee itself carries no GST by default (healthcare services exemption; confirm with accountant).

### 6.5 Refund Flow
`POST refund` (system or admin/doctor-triggered) → Razorpay `payments.refund(paymentId, { amount, speed: "normal", notes, reverse_all: 1 })` → status `REFUND_INITIATED` → webhook `refund.processed` → `REFUNDED`; `refund.failed` → alert Admin and retry/manual. Refund and transfer reversal are tracked on `Payment.refunds[]`. Patient email on initiation and on processed.

### 6.6 Receipts
Auto-generated PDF (pdfkit/puppeteer): platform + doctor details, booking code, patient details, appointment type/date/slot or token, itemised amount (consultation fee, processing fee), payment ID, paid-on date, "Payment received by <Doctor/Clinic>". Stored in cloud storage, link in My Payments, attached to email.

### 6.7 Webhook Security
- Endpoint `POST /api/webhooks/razorpay` uses **raw body** parser (`express.raw`) and verifies `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`; reject otherwise (400).
- Respond `200` quickly; process asynchronously through a queue; ensure idempotency (5.7).
- Never trust frontend success callbacks alone.

---

## 7. Subscription System

### 7.1 Plans
Admin-defined (default seeds): **Monthly (30 days)**, **Quarterly (90 days)**, **Yearly (365 days)**. Fields: name, `durationDays`, `price` (paise, excl. GST), `gstPercent` (default 18), `isActive`, `displayOrder`, `features[]`. Payment is a **one-time Razorpay order per period** (no auto-debit in v1; recurring autopay is Phase 3).

### 7.2 States
```
TRIAL ──(paid plan)──► ACTIVE ──(endsAt passes)──► GRACE ──(graceDays pass)──► EXPIRED
  │                       ▲                           │                           │
  └─(trial ends)──► GRACE/EXPIRED   (renew anytime) ◄─┴───────────────────────────┘
ANY ──(admin)──► SUSPENDED ──(admin)──► previous computed state
```
| State | Listed publicly | New bookings | Dashboard |
|---|:--:|:--:|---|
| TRIAL / ACTIVE | ✅ | ✅ | Full |
| GRACE (`graceDays`, default 2) | ✅ | ✅ | Full + red warning banner |
| EXPIRED | ❌ | ❌ | Restricted mode (4.4) |
| SUSPENDED | ❌ | ❌ | Restricted + contact-admin message |

### 7.3 Rules
- **Trial:** auto-created on onboarding: `type: TRIAL`, `startsAt = onboardedAt`, `endsAt = +trialDays`. Once per doctor.
- **Purchase:** doctor chooses a plan → Razorpay order (platform account) → verify/webhook → create `Subscription` record. **Period stacking:** `startsAt = max(now, currentEndsAt)` if currently TRIAL/ACTIVE/GRACE with time left, else `now`. (Renewing early never loses remaining days; renewing within trial adds on after trial ends or immediately—implementation: starts at `max(now, currentEndsAt)`, simple stacking.)
- **Upgrade/downgrade:** since plans only differ by duration, "upgrade" = buying a longer plan; no proration. Stacked.
- **Admin manual:** grant/extend by N days, set exact end date, assign plan without payment (`source: ADMIN`), mandatory reason, audit-logged, doctor emailed.
- **Doctor `subscriptionSummary`** (denormalized on `DoctorProfile`: `status`, `endsAt`, `planName`) is recomputed on every change and by the hourly job. Public listing queries use this denormalized field + index.
- **GST invoice:** generated for each paid subscription (invoice number sequence `INV-YYYY-000001`, base amount, GST, total, platform GSTIN, doctor details) as PDF, emailed and downloadable.
- **Failed subscription payments** don't change state; doctor can retry. Duplicate payments for the same order are idempotent.
- **Refund of subscription** is Admin manual only.

### 7.4 Expiry Notifications
Sent by daily job at 09:00 IST via **email + in-app notification** (dedupe by `(doctorId, subscriptionId, offset)`):
| When | Message |
|---|---|
| Trial: 2 days & 1 day before end | "Your free trial ends soon" |
| Paid: 7, 3, 1 days before | "Plan expires on <date>. Renew now" |
| On expiry day | "Your plan expires today" |
| Grace: daily until grace ends | "Grace period: X days left, listing will be hidden" |
| After EXPIRED | "Your profile is hidden. Renew to resume bookings" (day 1, 3, 7 only) |
| Payment success | "Subscription active till <date>" + invoice |
Dashboard shows persistent banner + "Renew Now" CTA with plan cards and Razorpay checkout.

---

## 8. Notifications, Emails & Reminders

**Channels:** Email (Nodemailer via SMTP/SES/Resend) + in-app notifications. SMS/WhatsApp are future hooks (notification service abstraction with `channels[]`).

**Email queue:** BullMQ (Redis) with retries (exponential backoff, 5 attempts), `EmailLog` storing status/error. Templates in Handlebars/MJML, branded, mobile friendly.

| Event | Recipient | Content |
|---|---|---|
| Email verification | Patient | Link (24h) |
| Password reset | All | Link (30 min) |
| Doctor invite | Doctor | Set-password link (72h), trial end date |
| **Booking confirmed** | Patient | **Receipt PDF + token/booking code**, doctor, clinic address & map link (home: address), type, date/slot or token + validity, payment id, amount, "no cancellation by patient" note, support contact |
| New booking | Doctor | Patient name/type/slot/token, link to dashboard |
| Payment failed / slot lost / auto refund | Patient | Explanation + refund timeline |
| Appointment cancelled by doctor/admin | Patient | Reason, refund initiated, Rebook link |
| Refund processed | Patient | Amount, reference |
| Rescheduled | Patient | Old → new slot |
| Normal validity extended (leave) | Patient | New validity date |
| Completed | Patient | Thank you |
| Subscription reminders/success/invoice | Doctor | See 7.4 |
| Manual admin subscription change | Doctor | Details |
| Payout/KYC status changes, transfer failed | Doctor + Admin | Details/action |

**Appointment reminders (Patient):**
| Type | Reminders |
|---|---|
| Premium | 24 hours before, and 2 hours before slot |
| Home Visit | 24 hours before, and 2 hours before slot (also says "keep address accessible/phone reachable") |
| Normal | On booking day evening (≈ 6 PM) if not yet visited and "last day of validity" morning (8 AM) reminder |
Reminders are scheduled as delayed jobs on confirmation, **re-scheduled on reschedule, cancelled on cancel/complete**, skipped if the offset time is already past (e.g., booking made 1 hour before slot → only the 'now' confirmation). Reminder sweep job additionally scans upcoming appointments every 5 min with `remindersSent` flags to guarantee delivery if Redis is lost (idempotent flags).
**Doctor reminders:** daily morning digest (optional preference) with today's appointments.

---

## 9. State Machines

### 9.1 Appointment Status
```
PENDING_PAYMENT ──paid──► CONFIRMED ──► CHECKED_IN (optional) ──► IN_PROGRESS ──► COMPLETED
      │                       │  └─(home) EN_ROUTE ─► IN_PROGRESS
      │                       ├──► NO_SHOW                (doctor)
      │                       ├──► CANCELLED_BY_DOCTOR    (+auto refund)
      │                       ├──► CANCELLED_BY_ADMIN     (+auto refund)
      │                       └──► EXPIRED_TOKEN          (Normal validity over)
      ├──hold timeout──► EXPIRED
      └──payment fail/ slot lost──► PAYMENT_FAILED
```
Allowed transitions are enforced in one service function `transition(appointment, to, actor)` that validates the matrix, writes an AuditLog, updates `slotLock`, reschedules reminders and sends notifications. Terminal states: COMPLETED, NO_SHOW, CANCELLED_*, EXPIRED, EXPIRED_TOKEN, PAYMENT_FAILED. A doctor may **revert** COMPLETED/NO_SHOW → CONFIRMED within 24h (correction), audit-logged.

### 9.2 Payment Status
`CREATED → ATTEMPTED → CAPTURED → (TRANSFER_PENDING → TRANSFERRED | TRANSFER_FAILED)`; `FAILED`; `AUTO_REFUND_PENDING`; `REFUND_INITIATED → REFUNDED | PARTIALLY_REFUNDED | REFUND_FAILED`.

### 9.3 Doctor Account Status
`INVITED → ACTIVE ↔ SUSPENDED`; `DELETED` (soft). Subscription status in 7.2. Linked account status in 6.2.

---

## 10. Data Models (Mongoose)

All schemas use `{ timestamps: true }`. Only key fields shown; add `isDeleted` where noted.

### 10.1 User
```js
{
  name, email (unique, lowercase), phone, passwordHash,
  role: "PATIENT" | "DOCTOR" | "ADMIN" | "SUB_ADMIN",
  permissions: [String],            // sub-admin
  status: "ACTIVE" | "INVITED" | "BLOCKED" | "DELETED",
  emailVerified: Boolean, emailVerifyToken(hash), emailVerifyExpires,
  resetTokenHash, resetTokenExpires,
  refreshTokens: [{ tokenHash, expiresAt, userAgent, ip }],
  failedLoginCount, lockUntil, lastLoginAt,
  gender, dob, avatarUrl,
  savedAddresses: [{ label, name, phone, line1, line2, landmark, area, city, state, pincode, location:{lat,lng} }],
  notificationPrefs: { email: Boolean, reminders: Boolean },
  doctorProfile: ObjectId (ref) // for DOCTOR
}
// indexes: email unique, phone, role+status
```

### 10.2 DoctorProfile
```js
{
  user: ObjectId(User, unique), slug (unique), fullName, headline, about,
  profilePicture: { url, publicId },
  gallery: [{ url, publicId, thumbUrl, caption, order }], videoLinks: [String],
  gender, languages: [String], experienceYears,
  specializations: [ObjectId(Specialization)], services: [String],
  qualifications: [{ degree, institute, year }],
  registration: { number, council, year, verified: Boolean, verifiedAt, verifiedBy },
  clinic: { name, line1, line2, landmark, city, state, pincode,
            location: { type:"Point", coordinates:[lng,lat] }, mapsUrl, phone, email, timingsText },
  social: { website, ... },

  fees: { normal, premium, homeVisit },                       // paise
  types: {
    normal:    { enabled, dailyTokenLimit (0=unlimited), walkInHoursText },
    premium:   { enabled },
    homeVisit: { enabled, serviceArea: { mode: "RADIUS"|"PINCODES", radiusKm, pincodes:[String] } }
  },

  payout: { linkedAccountId, stakeholderId, productId, status, bankLast4, ifsc, panLast4,
            legalName, businessType, statusReason, lastSyncedAt },

  subscription: { status: "TRIAL"|"ACTIVE"|"GRACE"|"EXPIRED"|"SUSPENDED", endsAt, planName, trialUsed },
  onboardedAt, onboardedBy,
  isPublished, isVerifiedBadge, status: "ACTIVE"|"SUSPENDED"|"INVITED"|"DELETED",
  stats: { totalAppointments, rating (Phase 3) }
}
// indexes: slug unique; location 2dsphere (clinic.location);
// text index (fullName, headline, services, clinic.city); {isPublished,status,"subscription.status","payout.status"};
// specializations; clinic.city; fees.*
```

### 10.3 Schedule (one doc per doctor per type)
```js
{ doctor, type: "PREMIUM"|"HOME_VISIT", slotDurationMin, bufferMin, advanceBookingDays, minNoticeMinutes,
  weeklyRules: [{ dayOfWeek, isWorking, windows: [{ start:"HH:mm", end:"HH:mm" }] }] }
// unique index (doctor, type)
```

### 10.4 ScheduleException
```js
{ doctor, dateStr: "YYYY-MM-DD", kind: "LEAVE"|"CUSTOM_HOURS",
  appliesTo: ["NORMAL","PREMIUM","HOME_VISIT"], windows: [{start,end}], reason }
// unique-ish index (doctor, dateStr, kind)
```

### 10.5 Appointment
```js
{
  bookingCode (unique), patient: ObjectId(User), doctor: ObjectId(DoctorProfile),
  type: "NORMAL"|"PREMIUM"|"HOME_VISIT",
  status, statusHistory: [{ from, to, by, byRole, at, reason }],

  // Premium/Home
  dateStr, startTime, endTime, startAt (Date UTC), endAt (Date UTC), slotLock (String|null),
  // Normal
  tokenSeq, tokenLabel, validFrom, validUntil, extendedByDays,

  holdExpiresAt,
  patientDetails: { name, age, gender, phone, relation, reason },
  addressSnapshot: { name, phone, line1, line2, landmark, area, city, state, pincode, location:{lat,lng}, notes },   // home
  clinicSnapshot: { name, address, mapsUrl },

  fee: { consultationFee, convenienceFee, platformCommission, total, feeBearer },   // snapshot in paise
  payment: ObjectId(Payment), paymentStatus,
  cancellation: { by, role, reason, at }, doctorNotes (private),
  remindersSent: { r24h: Boolean, r2h: Boolean, normalEvening: Boolean, normalLastDay: Boolean },
  confirmedAt, completedAt, rescheduledFrom: { dateStr, startTime }
}
// indexes: bookingCode unique; slotLock unique partial; {doctor, dateStr, status}; {doctor, type, status, tokenSeq};
// {patient, createdAt:-1}; {status, holdExpiresAt}; {startAt}; {validUntil, status}
```

### 10.6 Payment
```js
{ appointment | subscription (ref), payer: User, doctor, purpose: "APPOINTMENT"|"SUBSCRIPTION",
  razorpayOrderId (unique), razorpayPaymentId, razorpaySignature, method, status,
  amount, currency: "INR",
  breakdown: { consultationFee, convenienceFee, platformCommission, gatewayFee, gatewayTax, netToDoctor, feeBearer },
  transfer: { transferId, status, amount, settlementId, utr, settledAt, error, attempts },
  refunds: [{ refundId, amount, status, reason, initiatedBy, createdAt, processedAt }],
  receiptUrl, capturedAt, failureReason, rawEvents: [Mixed]  // trimmed
}
```

### 10.7 Others
- **Plan:** `{ name, code, durationDays, price, gstPercent, isActive, displayOrder, features }`
- **Subscription (history):** `{ doctor, plan, type: "TRIAL"|"PAID"|"ADMIN_GRANT", source: "RAZORPAY"|"ADMIN", startsAt, endsAt, amount, gst, total, payment, invoiceNo, invoiceUrl, createdBy, reason }`
- **Specialization:** `{ name, slug, icon, isActive }`
- **Notification:** `{ user, type, title, body, link, isRead, createdAt }`
- **EmailLog:** `{ to, template, subject, status, error, attempts, refId }`
- **WebhookEvent:** `{ eventId (unique), event, payload, processedAt, status, error }`
- **Counter:** `{ key (unique), value }`
- **Setting:** single doc key/value for platform settings (6.4, 4.10)
- **AuditLog:** `{ actor, actorRole, action, entityType, entityId, before, after, ip, at, note }`
- **IdempotencyKey:** `{ key, user, requestHash, response, expiresAt (TTL) }`
- **NotificationDedupe:** `{ key (unique) }` for subscription reminders

---

## 11. REST API Specification

Base: `/api/v1`. JSON. Auth: `Authorization: Bearer <access>` (or cookie). Standard response:
```json
{ "success": true, "data": {}, "meta": { "page":1, "limit":12, "total":0 } }
{ "success": false, "error": { "code": "SLOT_TAKEN", "message": "...", "details": [] } }
```
Common codes: `VALIDATION_ERROR`(422), `UNAUTHENTICATED`(401), `FORBIDDEN`(403), `NOT_FOUND`(404), `SLOT_TAKEN`(409), `SLOT_UNAVAILABLE`(409), `HOLD_EXPIRED`(410), `DOCTOR_NOT_BOOKABLE`(409), `TYPE_DISABLED`(409), `OUT_OF_SERVICE_AREA`(422), `EMAIL_NOT_VERIFIED`(403), `RATE_LIMITED`(429), `PAYMENT_SIGNATURE_INVALID`(400).

### 11.1 Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | – | Patient signup |
| POST | /auth/login | – | Login (all roles) |
| POST | /auth/refresh | cookie | Rotate tokens |
| POST | /auth/logout | ✔ | Revoke refresh token |
| GET | /auth/verify-email?token= | – | Verify |
| POST | /auth/resend-verification | ✔ | Resend |
| POST | /auth/forgot-password, /auth/reset-password | – | Reset |
| POST | /auth/set-password | invite token | Doctor first password |
| GET/PATCH | /me | ✔ | Profile |
| POST | /me/change-password | ✔ | |
| CRUD | /me/addresses | Patient | Saved addresses |

### 11.2 Public Doctors
| Method | Path | Purpose |
|---|---|---|
| GET | /doctors | List + search + filters + sort + pagination |
| GET | /doctors/:slug | Public detail (404 if not bookable-visible) |
| GET | /doctors/:slug/slots?type=PREMIUM&date=YYYY-MM-DD | Slots for a date |
| GET | /doctors/:slug/availability?type=&from=&to= | Dates having slots (calendar dots) |
| GET | /specializations, /cities | Filter masters |
| GET | /doctors/:slug/normal-status | Tokens left today, validity text |

### 11.3 Patient Appointments & Payments
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /appointments/hold | Patient (verified) | Create hold (Idempotency-Key) |
| GET | /appointments/:id | Owner | Detail |
| POST | /payments/create-order | Owner | `{appointmentId}` → Razorpay order data |
| POST | /payments/verify | Owner | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` |
| POST | /payments/:appointmentId/abandon | Owner | Release hold early (user closed modal / chose another slot) |
| GET | /me/appointments?tab=upcoming|past&type&status | Patient | History |
| GET | /me/doctors | Patient | Previously booked doctors |
| GET | /me/payments | Patient | Payment history |
| GET | /appointments/:id/receipt | Owner/Doctor/Admin | Receipt PDF |
| — | *(none)* cancel for patients | – | Not provided |

### 11.4 Doctor (role DOCTOR; all scoped to own profile)
| Method | Path | Purpose |
|---|---|---|
| GET/PATCH | /doctor/profile | View/update profile |
| POST/DELETE | /doctor/profile/picture | Upload/remove |
| POST/PATCH/DELETE | /doctor/gallery[/:imageId] | Add/reorder/caption/delete |
| PATCH | /doctor/clinic | Address + map location |
| PATCH | /doctor/fees | Three fees |
| PATCH | /doctor/types | Toggles, daily token limit, service area |
| GET/PUT | /doctor/schedules/:type | Weekly schedule (PREMIUM/HOME_VISIT) |
| GET/POST/DELETE | /doctor/exceptions | Leaves & custom hours (conflict check; `?cancelConflicts=true`) |
| GET | /doctor/dashboard/summary | KPIs |
| GET | /doctor/appointments | List/filter |
| GET | /doctor/appointments/:id | Detail |
| PATCH | /doctor/appointments/:id/status | `{ to: CHECKED_IN\|EN_ROUTE\|IN_PROGRESS\|COMPLETED\|NO_SHOW }` |
| POST | /doctor/appointments/:id/cancel | `{reason}` → refund |
| POST | /doctor/appointments/:id/reschedule | `{dateStr,startTime}` |
| POST | /doctor/appointments/:id/extend | Normal validity +N days |
| PATCH | /doctor/appointments/:id/notes | Private notes |
| GET | /doctor/normal-queue | Ordered valid tokens |
| GET | /doctor/earnings?from&to | Ledger + summary; `/earnings/export` CSV |
| GET | /doctor/subscription | Current + history + plans |
| POST | /doctor/subscription/create-order | `{planId}` |
| POST | /doctor/subscription/verify | Signature verify |
| GET | /doctor/subscription/invoices/:id | PDF |
| GET | /notifications, PATCH /notifications/:id/read, POST /notifications/read-all | In-app |

### 11.5 Admin (role ADMIN/SUB_ADMIN with permission)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | /admin/doctors | List / onboard |
| GET/PATCH/DELETE | /admin/doctors/:id | View / edit anything / soft delete |
| POST | /admin/doctors/:id/publish, /unpublish, /suspend, /reactivate, /verify, /resend-invite, /reset-password | Actions |
| GET/POST | /admin/doctors/:id/payout, /payout/resync | Linked account status/update |
| PUT | /admin/doctors/:id/schedules/:type, /fees, /types | Edit on behalf |
| GET/PATCH | /admin/patients, /admin/patients/:id, POST /block, /unblock | Patient mgmt |
| GET | /admin/appointments, /:id | Global list |
| POST | /admin/appointments/:id/cancel, /reschedule | With refund |
| CRUD | /admin/plans | Plans |
| GET | /admin/subscriptions | List |
| POST | /admin/doctors/:id/subscription/grant, /extend, /set-end, /change-plan, /suspend, /reactivate | Manual control |
| GET | /admin/payments, /admin/refunds, POST /admin/payments/:id/retry-transfer, /refund | Money ops |
| GET | /admin/dashboard | KPIs |
| CRUD | /admin/specializations | Master |
| GET/PUT | /admin/settings | Platform settings |
| GET | /admin/audit-logs, /admin/email-logs | Logs |

### 11.6 Webhooks
`POST /webhooks/razorpay` (raw body; signature verified; idempotent).

### 11.7 Validation, Pagination, Rate Limits
- Joi/Zod validation on every body/query/param; strip unknown fields; sanitize HTML (`sanitize-html`) for bio.
- Pagination: `page`, `limit` (max 50). Sorting whitelists.
- Rate limits: auth 10/min/IP, hold 10/min/user, public search 120/min/IP, webhook exempt but signature-protected.

---

## 12. Frontend Specification

**Stack:** React 18 + Vite, React Router v6, TanStack Query (server state), Zustand or Redux Toolkit (auth/UI state), Axios (interceptor for refresh), React Hook Form + Zod, Tailwind CSS (+ shadcn/ui or MUI), dayjs, react-helmet-async, @react-google-maps/api (or Leaflet/OpenStreetMap as a free alternative), sonner (toasts), Recharts (dashboards).

### 12.1 Route Map
| Area | Routes |
|---|---|
| Public | `/` home, `/doctors` (list+filters), `/doctors/:slug`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/set-password`, `/about`, `/contact`, `/privacy`, `/terms`, `/refund-policy` |
| Patient (protected) | `/booking/:appointmentId/pay` (checkout/hold), `/booking/:appointmentId/success`, `/me/appointments`, `/me/appointments/:id`, `/me/doctors`, `/me/payments`, `/me/profile`, `/me/addresses` |
| Doctor | `/doctor` overview, `/doctor/appointments`, `/doctor/queue`, `/doctor/schedule`, `/doctor/profile`, `/doctor/gallery`, `/doctor/fees`, `/doctor/earnings`, `/doctor/subscription`, `/doctor/notifications`, `/doctor/account` |
| Admin | `/admin` dashboard, `/admin/doctors`, `/admin/doctors/new`, `/admin/doctors/:id`, `/admin/patients`, `/admin/patients/:id`, `/admin/appointments`, `/admin/subscriptions`, `/admin/plans`, `/admin/payments`, `/admin/specializations`, `/admin/settings`, `/admin/audit-logs` |

`<ProtectedRoute roles={[...]}>` guards; unauthenticated access to protected route → `/login?redirect=<current path>`. Role mismatch → role's home or 403 page. A **doctor/admin account opening a booking panel** sees "Booking is available for patient accounts only".

### 12.2 Key Components
`DoctorCard`, `FilterSidebar`, `SearchBar`, `DoctorProfileHeader`, `GalleryLightbox`, `ClinicMap`, `BookingPanel` (type selector → step wizard), `SlotPicker` (date strip + slot grid; polling 20 s; disabled/held/booked states), `AddressForm` (with map pin + service-area check), `PatientDetailsForm`, `PriceBreakdown`, `HoldCountdown`, `RazorpayCheckout` hook (loads `checkout.js` lazily), `AppointmentCard`, `StatusBadge`, `TokenCard`, `ScheduleEditor` (weekly grid with multi-window, copy-to-all-days), `LeaveCalendar`, `QueueBoard`, `EarningsTable`, `SubscriptionBanner`, `PlanCards`, `ImageUploader` (crop + progress), `ConfirmDialog` (cancel with reason), `NotificationBell`, data tables with server pagination.

### 12.3 UX Rules
- Booking panel only shows enabled types; each has clear description (Normal: "Pay now, visit within 2 days, served in booking order").
- Disable "Pay" button during request; show spinner; handle double-click.
- On `SLOT_TAKEN` → toast + refresh slots + return to slot step with selection cleared.
- Countdown visible during checkout; on expiry show retry CTA.
- Razorpay modal dismissed ≠ failure: show "Payment not completed. Retry within mm:ss".
- After payment success, if `verify` request fails (network) → poll `GET /appointments/:id` for up to 60 s (webhook will confirm) instead of showing error.
- Loading skeletons, empty states, error boundaries, 404/403 pages, accessibility (labels, focus states, keyboard navigation), responsive down to 360 px.
- Dates/times always displayed in IST with "IST" label.

---

## 13. Background Jobs

| Job | Schedule | Action |
|---|---|---|
| `expireHolds` | every 1 min | `PENDING_PAYMENT` with `holdExpiresAt < now` → `EXPIRED`, unset `slotLock` |
| `reconcilePayments` | every 10 min | Fetch Razorpay status for payments `CREATED/ATTEMPTED` older than 15 min; finalize or fail |
| `retryTransfers` | every 15 min | Retry `TRANSFER_FAILED/PENDING` (max 8 attempts) → alert Admin |
| `retryRefunds` | every 15 min | Retry/monitor `REFUND_INITIATED/FAILED` |
| `sendReminders` | every 5 min + delayed jobs | Premium/Home/Normal reminders (flags prevent duplicates) |
| `expireNormalTokens` | hourly (and 00:05 IST) | `CONFIRMED` Normal with `validUntil < now` → `EXPIRED_TOKEN` |
| `subscriptionTransitions` | hourly | Recompute TRIAL/ACTIVE → GRACE → EXPIRED; update denormalized fields |
| `subscriptionReminders` | daily 09:00 IST | Notifications per 7.4 (deduped) |
| `doctorDigest` | daily 07:30 IST | Today's schedule email (if enabled) |
| `syncLinkedAccounts` | every 6 h | Pull status for non-ACTIVE accounts |
| `cleanup` | daily | Delete old idempotency keys, expired tokens, trim raw events |
Use BullMQ repeatable jobs with unique job IDs; ensure single execution across multiple server instances (BullMQ guarantees this; if using node-cron use a Mongo/Redis distributed lock).

---

## 14. Edge Cases & Real-World Scenarios

| # | Scenario | Required behavior |
|---|---|---|
| 1 | Two users pay for same slot simultaneously | Only one hold succeeds (unique index). Loser gets `SLOT_TAKEN` before paying. |
| 2 | User A's hold expires, B holds, A's payment arrives late | Case C in 5.5: A auto-refunded in full, emailed. B unaffected. |
| 3 | A's late payment arrives and slot still free | Case B: re-acquire and confirm. |
| 4 | User closes browser after paying, before `verify` call | Webhook confirms booking; email sent; "My Appointments" shows it. |
| 5 | Webhook delivered twice / out of order | `WebhookEvent` idempotency; `finalizePayment` is state-guarded. |
| 6 | Webhook never arrives | `reconcilePayments` job finalizes. |
| 7 | Payment success but doctor suspended/expired meanwhile | If hold was valid when paid → honor (booking confirmed). Subscription expiry never cancels confirmed bookings. |
| 8 | Doctor adds leave on a date with bookings | 409 with conflicts; doctor picks reschedule or "cancel all + refund". Normal tokens auto-extend instead. |
| 9 | Doctor turns off a type | New bookings blocked; existing confirmed stay; open holds for that type are allowed to complete (≤10 min). |
| 10 | Doctor changes fee while user is mid-checkout | Hold's fee snapshot is used; order amount = snapshot. |
| 11 | User clicks Pay twice / double tabs | Idempotency key + reuse of the same hold/order. |
| 12 | User tries to hold many slots to block others | Max active holds per user + rate limits. |
| 13 | Patient wants to cancel | Not allowed; message to contact clinic; doctor can cancel with refund. |
| 14 | Refund for payment whose transfer already settled to doctor | Use `reverse_all`; if doctor's balance insufficient the platform fronts the refund and Admin records recoverable amount (ledger entry `RECOVERABLE`). |
| 15 | Doctor linked account suspended after payment | Transfer fails → `TRANSFER_FAILED`, funds remain in platform balance, Admin alerted; retried after account is active. |
| 16 | Home visit address outside service area | Reject at address step and at hold (server-side). |
| 17 | Home visit slot adjacent to a premium slot | Cross-type overlap check + travel buffer prevents conflict. |
| 18 | Doctor changes slot duration/schedule with existing bookings | See 4.6; existing bookings preserved; conflicts reported. |
| 19 | Daylight/timezone issues | IST only (no DST); dates are strings; slot comparisons use `startAt` UTC. |
| 20 | Subscription expires at midnight with a user mid-booking | Allowed if hold started while GRACE/active; after hold expiry the doctor is hidden. |
| 21 | Doctor renews while in GRACE/EXPIRED | Immediately ACTIVE; stacked from `max(now, endsAt)`; listing restored (cache busted). |
| 22 | Admin grants extension while doctor pays simultaneously | Both create Subscription records; end date computed in a transaction by stacking; no overwrite. |
| 23 | Trial abuse (doctor deleted & re-created) | `trialUsed` tied to registration number + PAN hash + email; Admin warned on duplicates. |
| 24 | Booking for a time earlier than now / within min-notice | Rejected server-side. |
| 25 | Normal booking at 11:55 PM | Validity still counts until end of `bookingDate + validityDays − 1`; UI states exact expiry date-time. |
| 26 | Normal token daily limit race | Atomic counter check at confirm; honor paid users if hold was valid; else refund. |
| 27 | Duplicate email/phone registration | 409 with message; phone uniqueness optional per setting. |
| 28 | Unverified email tries to pay | Blocked with `EMAIL_NOT_VERIFIED` and resend CTA. |
| 29 | Patient blocked with upcoming appointments | Appointments remain; Admin decides; doctor notified. |
| 30 | Doctor soft-deleted with future appointments | Blocked until cancelled/refunded or completed. |
| 31 | Email delivery fails | Retried; Admin sees `EmailLog`; patient can re-download receipt/token from dashboard. |
| 32 | Razorpay down/timeouts at create-order | Hold remains valid until expiry; user may retry; error toast; no duplicate orders (reuse). |
| 33 | Amount tampering from client | Amount always server-computed; verify order amount == snapshot in `finalizePayment`. |
| 34 | Open redirect via `redirect` param | Whitelist relative paths only. |
| 35 | Image upload attacks | MIME sniffing, size limit, re-encode via sharp, random file names. |
| 36 | Unpublished/expired doctor URL | 404 for public; existing patients see history only. |
| 37 | Same patient books same doctor repeatedly | Allowed for Normal/Premium/Home (different slots), but not same slot; configurable max active normal tokens per patient per doctor (default 2). |
| 38 | Server crash between hold and order creation | Hold expires via sweeper; no orphan since appointment is `PENDING_PAYMENT` only. |
| 39 | Mongo transaction unavailable | Deployment must use replica set (Atlas/Replica); fall back to unique index only. |
| 40 | Doctor marks complete on wrong appointment | Revert within 24h with audit. |
| 41 | Cancelled by doctor after reminder already queued | Reminder jobs removed/skipped via status check at send-time. |
| 42 | Mobile browser kills Razorpay popup / UPI app switch | Handled by webhook + polling; no dependence on JS callback. |
| 43 | Fee set to 0 | Disallowed (min ₹1); no free bookings in v1. |
| 44 | Admin changes global settings (e.g., holdMinutes) | Applies to new holds only. |
| 45 | Patient books Normal while doctor has already hit token limit but a hold expired | Limit computed on issued + active holds; freed tokens become available again. |

---

## 15. Non-Functional Requirements, Security & Compliance

**Performance:** doctor list p95 < 400 ms (indexed, paginated, lean queries, projected fields); slot fetch p95 < 300 ms; support 1,000 concurrent users; slot computation cached 15–30 s per (doctor,type,date) with invalidation on booking/schedule change (optional Redis).
**Availability:** 99.5%; graceful degradation if Redis/email down (retry queues).
**Security:**
- bcrypt (cost ≥ 12), JWT secrets rotated, httpOnly cookies, CSRF protection for cookie flows (SameSite + CSRF token on state-changing requests), Helmet, strict CORS, `express-mongo-sanitize`, `hpp`, XSS sanitization, request size limits, rate limiting, brute-force lockout.
- RBAC middleware + **ownership checks** on every resource (doctor accesses only own data; patient only own appointments).
- Secrets in env/secret manager; Razorpay secret never exposed to frontend; webhook signature verification; HTTPS only; HSTS.
- PII minimization: no card data stored (Razorpay hosts); bank account/PAN not stored in full; sensitive fields excluded from default queries (`select: false`).
- Audit logging for admin and money-related actions.
**Privacy/Compliance (India):** Privacy Policy, Terms, Refund Policy and consent checkbox at registration (DPDP Act 2023); data export/delete request handling (Admin); health-related notes (reason for visit) stored minimally and visible only to the patient, the booked doctor and Admin; razorpay KYC/RBI norms handled by Razorpay; GST invoices for subscriptions; medical advertising rules—no misleading claims, "Verified" only after registration verification.
**Observability:** structured logs (pino) with request IDs, Sentry for errors, health endpoint `/healthz`, metrics for hold conflicts/payment failures/webhook lag, alerts on failed transfers/refunds.
**Backups:** daily Mongo backups with PITR; media in durable storage.
**Accessibility & SEO:** WCAG 2.1 AA basics; sitemap for doctor pages; canonical URLs.
**Browser support:** latest 2 versions of Chrome, Edge, Safari, Firefox; Android/iOS browsers.

---

## 16. Project Structure & Environment

### 16.1 Repository
```
/server
  /src
    /config        (env, db, razorpay, cloudinary, mail, redis)
    /models        (User, DoctorProfile, Schedule, ScheduleException, Appointment, Payment, Plan, Subscription, ...)
    /controllers   (auth, doctors, appointments, payments, doctor, admin, webhooks)
    /services      (slotService, bookingService, paymentService, refundService, subscriptionService,
                    razorpayRouteService, notificationService, emailService, receiptService, scheduleService, auditService)
    /middlewares   (auth, rbac, validate, rateLimit, error, upload, idempotency, rawBody)
    /routes        (v1/*.routes.js)
    /validators    (zod/joi schemas)
    /jobs          (queues, workers, schedulers)
    /templates     (email .hbs, receipt/invoice)
    /utils         (date, money, codes, logger, ApiError, asyncHandler)
    app.js  server.js
  /tests (unit, integration)
  seed (admin user, plans, specializations, settings)
/client
  /src
    /api  /app (router, providers)  /components  /features (auth, doctors, booking, patient, doctor, admin)
    /hooks  /pages  /layouts  /utils  /styles
```
Use a service layer (controllers thin) so business rules live in services and are unit-testable.

### 16.2 Environment Variables
```
NODE_ENV, PORT, CLIENT_URL, API_URL
MONGO_URI                         # replica set / Atlas
REDIS_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_DOMAIN
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_ACCOUNT_ID
CLOUDINARY_* (or S3_*)
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
GOOGLE_MAPS_API_KEY               # client key (restricted by HTTP referrer)
SENTRY_DSN
PLATFORM_GSTIN, PLATFORM_NAME, PLATFORM_ADDRESS
TZ=Asia/Kolkata
```
Seed script creates the first Super Admin, default plans, specializations and default settings.

---

## 17. Testing & Acceptance Criteria

**Test layers:** unit (services: slot generation, fee gross-up, state machine, validity calc), integration (API with in-memory replica set), concurrency tests, Razorpay sandbox end-to-end, E2E (Playwright/Cypress) for core flows.

**Must-pass acceptance tests**
1. 50 parallel `hold` calls for one slot → exactly 1 success, 49 × `SLOT_TAKEN`; DB has exactly one locked appointment.
2. Hold expiry: unpaid hold frees slot ≤ 1 min after `holdExpiresAt` (and instantly at next hold attempt); another user can then book.
3. Late payment scenarios B, C, D (5.5) behave exactly as specified, with refunds issued.
4. Webhook replay (same event 3×) results in one confirmation, one email, one token.
5. Normal tokens: 20 parallel confirmations produce unique, increasing `tokenSeq`; queue sorted by booking order; validity ends at correct IST time; leave auto-extends.
6. Premium/Home slot generation correct for multi-window days, leaves, custom hours, min-notice, buffer, cross-type overlap rule.
7. Home visit outside service area rejected; inside accepted; address snapshot immutable.
8. Doctor cancel → refund created with transfer reversal; patient emailed; slot reusable.
9. Patients cannot call any cancel route (403/404).
10. Guest → login → register → returns to same doctor page with selection restored; external redirect URLs rejected.
11. Subscription: trial 7 days from onboarding; expiry reminders at 7/3/1/0; grace; expired hides listing and blocks bookings; renewal restores; admin manual extension works and is audited.
12. Razorpay Route: payment transfers net amount per fee-bearer mode; earnings ledger matches Razorpay data.
13. Receipt + token email delivered for each confirmed booking; reminders at configured offsets, rescheduled upon reschedule, suppressed on cancel.
14. RBAC: doctor A cannot read/modify doctor B's appointments/profile; patient cannot access others' appointments.
15. Search/filter combinations return correct, paginated results using indexes (explain plan check).

---

## 18. Delivery Phases

| Phase | Scope |
|---|---|
| **1 – Foundation** | Project setup, auth/RBAC, models, admin doctor onboarding, doctor profile/gallery/clinic map, public listing/search/detail |
| **2 – Booking Core** | Schedules/exceptions/slot engine, hold & concurrency, Premium + Normal flows, Razorpay orders/verify/webhooks, confirmation emails/receipts, patient dashboard |
| **3 – Home Visit & Doctor Ops** | Home visit flow + service area, doctor dashboard (status actions, queue, reschedule, cancel+refund), reminders, notifications |
| **4 – Money & Subscription** | Razorpay Route linked accounts + transfers + earnings ledger, subscription plans/payments/invoices/trial/grace/expiry jobs, admin manual controls, admin dashboard & reports |
| **5 – Hardening** | Load/concurrency testing, security review, observability, SEO, accessibility, UAT, production deployment |
| **Future** | Reviews/ratings, Socket.IO live queue, autopay subscription, SMS/WhatsApp, sub-admins, coupons, video consult, multi-clinic, on-hold settlements |

---

## 19. Assumptions & Items To Verify

**Assumptions made in this PRD (change if your intent differs):**
1. "Payments go directly to the doctor chosen by the user" = the patient pays for the doctor they select and money is transferred to **that doctor's** bank account (patients do not enter bank details).
2. The platform earns only from **subscriptions** (platform commission defaults to 0% but is configurable).
3. Normal appointment "2 days validity" = valid from booking until the end of the next calendar day (configurable); "priority by first booking" = queue ordered by payment-confirmation order.
4. Subscriptions are **one-time purchases per period** (no auto-debit in v1).
5. Trial begins at admin onboarding time.
6. Slot hold duration is 10 minutes (configurable).
7. Fee bearer default: patient pays a small "payment processing fee" so the doctor receives the full fee; switchable to doctor-bears.
8. Single clinic per doctor; INR only; IST only.

**To verify before/while building:**
- Razorpay **Route** eligibility, KYC requirements for doctors (individual/proprietor), current fee structure, whether transfer fees/GST can be bundled, `reverse_all` refund behavior, and any settlement-hold rules—Razorpay's current documentation and account manager must confirm, as policies change.
- RBI/Razorpay marketplace compliance for the platform acting as an intermediary (legal review).
- GST treatment of subscription fees and of the processing/convenience fee (CA review).
- Medical advertising/telemedicine-adjacent regulations for listing practitioners and the "Verified" badge.
- Data-protection obligations (DPDP Act) for health-related data and consent text.

---
*End of PRD*
