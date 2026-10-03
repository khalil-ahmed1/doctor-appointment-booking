# PROGRESS.md — Project Tracker

> This file is the **memory between sessions**. AI agents must read it at the start of every session and update it during and at the end of every session (see `AGENTS.md`).
> Rules: keep it accurate, append-only for logs, never delete history.

**Status legend:** ⬜ Not started · 🚧 In progress · ✅ Done (meets Definition of Done) · ⛔ Blocked · ⏸️ Deferred

---

## 1. Current Focus

| Item | Value |
|---|---|
| Current phase | Phase 1 – Foundation |
| Current feature | F-06 Admin: doctor onboarding |
| Last updated | 2026-10-03 |
| Last session by | Antigravity Agent |
| App runs locally? | Yes |
| Tests passing? | N/A |

### Next Up (exact next step)
1. F-06 Admin: doctor onboarding (account + profile + invite email + 7-day trial), list/view/edit/suspend/publish

---

## 2. Project Facts (fill/update as the project grows)

| Item | Value |
|---|---|
| Module system (server) | _(CommonJS / ESM — decide in F-01)_ |
| Node version | _(e.g. 20 LTS)_ |
| MongoDB | Replica set required (version: _)_ |
| Image storage | _(Cloudinary / S3)_ |
| Email provider | _(SMTP / SES / Resend)_ |
| Maps provider | _(Google Maps / Leaflet-OSM)_ |
| Jobs runner | node-cron (idempotent) — see Decision D-001 |
| Razorpay Route enabled? | _(Unknown — verify; see Blockers)_ |
| Repo/branch strategy | _(trunk / feature branches)_ |

### Environment variables added so far
_(Add each new variable here with a one-line description; keep `.env.example` in sync.)_

| Variable | Purpose | Added in |
|---|---|---|
| — | — | — |

### Commands that differ from AGENTS.md §12
_(none yet)_

---

## 3. Feature Checklist

Build **in this order**. One feature at a time. "PRD" column = sections to read before starting. Split big features into sub-tasks (e.g. F-12a) and list them under the feature when you begin.

### Phase 1 – Foundation
| ID | Feature | PRD | Status | Notes |
|---|---|---|---|---|
| F-01 | Project setup: server/client skeleton, env validation, lint, test setup (in-memory replica set), error handler, logger, health route | 15, 16 | ✅ | |
| F-02 | Core models: User, DoctorProfile, Specialization, Setting, AuditLog, Counter + seed script (admin, settings, specializations, plans) | 10 | ✅ | |
| F-03 | Auth: register, login, refresh/logout, email verification, forgot/reset password, lockout, RBAC middleware | 4.1, 11.1 | ✅ | |
| F-04 | Email service + queue-less sender with EmailLog, base templates | 8 | ✅ | |
| F-05 | Frontend base: layouts, router, ProtectedRoute, auth pages, redirect-after-login (safe redirect) | 4.1, 12 | ✅ | |
| F-06 | Admin: doctor onboarding (account + profile + invite email + 7-day trial), list/view/edit/suspend/publish | 4.2, 4.10 | 🚧 | Razorpay linked-account step stubbed behind interface until F-27 |
| F-07 | Doctor set-password via invite link | 4.2 | ⬜ | |
| F-08 | Doctor profile APIs: details, picture, gallery (upload validation), clinic + map location | 4.3 | ⬜ | |
| F-09 | Doctor profile UI (dashboard) | 4.3, 4.4 | ⬜ | |
| F-10 | Public listing + search + filters + sort + pagination; doctor visibility rule | 4.7 | ⬜ | |
| F-11 | Home page + doctor detail page (profile, gallery, map, SEO tags) | 4.7 | ⬜ | |
| F-12 | Admin: patients management (list, view, block/unblock, edit) | 4.10 | ⬜ | |

### Phase 2 – Booking Core
| ID | Feature | PRD | Status | Notes |
|---|---|---|---|---|
| F-13 | Doctor fees + type toggles + normal daily limit (API + UI) | 3.5, 4.4 | ⬜ | |
| F-14 | Schedule + exceptions models/APIs/validation (Premium + Home, overlap rules, conflict detection) | 4.6 | ⬜ | |
| F-15 | Schedule editor UI + leaves calendar | 4.6, 12.2 | ⬜ | |
| F-16 | Slot engine: compute slots on read, slots + availability endpoints (with tests) | 4.6, 11.2 | ⬜ | |
| F-17 | Appointment model + state machine service (`transition`) + audit | 9.1, 10.5 | ⬜ | |
| F-18 | Slot hold (unique `slotLock`, transaction, stale-hold cleanup, idempotency key, hold limits) + concurrency test | 5 | ⬜ | Must include 50-parallel-hold test |
| F-19 | Fee/breakdown calculator (gross-up, fee bearer, commission) + unit tests | 6.4 | ⬜ | |
| F-20 | Razorpay service wrapper + create-order + verify + `finalizePayment` (cases A/B/C/D) | 5.5, 6.3 | ⬜ | Mock SDK in tests |
| F-21 | Webhook endpoint (raw body, signature, event idempotency, payment/refund events) | 6.7 | ⬜ | |
| F-22 | Normal appointment: token allocation (atomic), validity, daily limit, hold→pay→confirm | 3.2, 5.6 | ⬜ | |
| F-23 | Premium booking flow UI: SlotPicker, patient details, price breakdown, countdown, Razorpay checkout, success page | 4.8, 12 | ⬜ | |
| F-24 | Normal booking flow UI | 4.8 | ⬜ | |
| F-25 | Receipt PDF + booking confirmation email (token/receipt) + doctor new-booking email | 6.6, 8 | ⬜ | |
| F-26 | Patient dashboard: my appointments, my doctors, payments, receipts, profile, no-cancel messaging | 4.5 | ⬜ | |

### Phase 3 – Home Visit & Doctor Operations
| ID | Feature | PRD | Status | Notes |
|---|---|---|---|---|
| F-27 | Razorpay Route: linked account creation/sync, payout status, transfers after capture, earnings fields | 6.2, 6.3 | ⬜ | May be ⛔ until Route is enabled |
| F-28 | Home Visit: service area, address form + map pin + validation, saved addresses, booking flow | 3.4 | ⬜ | |
| F-29 | Doctor dashboard: overview KPIs + appointment list/filters + status actions (check-in/start/complete/no-show) | 4.4 | ⬜ | |
| F-30 | Doctor cancel with auto refund + refund tracking + emails | 4.9, 6.5 | ⬜ | |
| F-31 | Doctor reschedule (Premium/Home) + Normal extend validity + leave auto-extend | 4.9, 3.2 | ⬜ | |
| F-32 | Normal queue board (ordered by `tokenSeq`) | 4.4 | ⬜ | |
| F-33 | Reminders (Premium/Home/Normal) via scheduled jobs with sent-flags | 8 | ⬜ | |
| F-34 | In-app notifications (bell + list) | 8 | ⬜ | |
| F-35 | Jobs: expireHolds, reconcilePayments, retryTransfers/Refunds, expireNormalTokens | 13 | ⬜ | |
| F-36 | Doctor earnings ledger + CSV export | 4.4, 6.4 | ⬜ | |

### Phase 4 – Subscription & Admin Controls
| ID | Feature | PRD | Status | Notes |
|---|---|---|---|---|
| F-37 | Plans CRUD (admin) + subscription models + state computation (TRIAL/ACTIVE/GRACE/EXPIRED/SUSPENDED) | 7 | ⬜ | |
| F-38 | Doctor subscription purchase (Razorpay order/verify/webhook), stacking rule, GST invoice PDF | 7.3 | ⬜ | |
| F-39 | Subscription jobs: hourly transitions + daily reminders (deduped) + restricted mode UI | 7.4, 4.4 | ⬜ | |
| F-40 | Admin manual subscription controls (grant/extend/set-end/change/suspend) with audit + email | 4.10, 7.3 | ⬜ | |
| F-41 | Admin appointments + payments/refunds views, retry transfer, manual refund | 4.10 | ⬜ | |
| F-42 | Admin dashboard KPIs, settings page, specializations, audit/email logs | 4.10 | ⬜ | |

### Phase 5 – Hardening
| ID | Feature | PRD | Status | Notes |
|---|---|---|---|---|
| F-43 | Full edge-case pass using PRD §14 table (each row verified, see §6 below) | 14 | ⬜ | |
| F-44 | Security review (RBAC audit, rate limits, upload checks, headers, CSRF) | 15 | ⬜ | |
| F-45 | Performance: indexes verified with `explain`, slot caching if needed | 15 | ⬜ | |
| F-46 | E2E tests for main flows (guest→login→book→pay; doctor cancel→refund; subscription expiry) | 17 | ⬜ | |
| F-47 | Observability, backups doc, deployment guide, README | 15, 16 | ⬜ | |
| F-48 | Accessibility + SEO + responsive QA, UAT fixes | 15 | ⬜ | |

---

## 4. Session Log (append newest entry at the TOP of this list)

### Session 5 — 2026-10-03 — Antigravity Agent
Goal: F-05 Frontend base
Plan: Install react-router-dom, react-query, axios, react-hook-form, zod, sonner. Setup AuthContext for global user state. Create layouts (Root, Auth, Dashboard), ProtectedRoute for RBAC and safe redirect. Create pages for login, register, forgot password, reset password, verify email.
Done:
- Installed routing and form validation dependencies.
- Created `src/lib/axios.js` with auto-refresh interceptor and failed request queue.
- Created `src/contexts/AuthContext.jsx` for global user state fetching and login/logout methods.
- Added `sonner` via shadcn UI and wrapped the app in `Toaster`.
- Implemented `ProtectedRoute` that redirects unauthenticated users to `/login?redirect=...`.
- Built `AuthLayout`, `RootLayout`, `DashboardLayout`.
- Built `LoginPage`, `RegisterPage` with React Hook Form, Zod validation, and safe redirect based on PRD.
- Built `ForgotPasswordPage`, `ResetPasswordPage`, and `VerifyEmailPage`.
- Added React Router with public and protected routes in `App.jsx`.
Files/modules touched: `frontend/src/App.jsx`, `frontend/src/contexts/AuthContext.jsx`, `frontend/src/lib/axios.js`, `frontend/src/layouts/*`, `frontend/src/features/auth/pages/*`.
Tests added/updated: N/A
How to verify manually: Start backend server and frontend server (`npm run dev` in both). Navigate to `http://localhost:5173/`. Click "Login", enter invalid credentials to see sonner toast error. Enter valid credentials (from seed) to see safe redirect in action.
Decisions made: Used TanStack Query context but placed auth state in standard React Context since it needs to interact with the Axios interceptor easily. Used standard sonner toasts per user instruction.
New env vars / commands / endpoints / models: 
- Env vars: `VITE_API_URL` (optional, defaults to `http://localhost:5000/api/v1`)
Left undone / known issues: Dashboard placeholders need to be filled in later phases.
NEXT STEP (specific): Start F-06 (Admin: doctor onboarding).

### Session 4 — 2026-10-03 — Antigravity Agent
Goal: F-04 Email service
Plan: Create EmailLog model, create nodemailer email service (queue-less for now), create base templates, and integrate with auth.service.js. Also fix lint issues and jest test setup.
Done:
- Fixed test environment by creating `tests/setup.js` with `mongodb-memory-server` for jest.
- Fixed lint errors in `env.js`, `app.js`, and `auth.service.js`.
- Installed `nodemailer`.
- Created `EmailLog` Mongoose model.
- Created `src/templates/emailTemplates.js` for base templates (verifyEmail, resetPassword, doctorInvite).
- Created `src/services/email.service.js` with `sendEmail` function using nodemailer.
- Integrated `sendEmail` into `auth.service.js` for `registerUser` and `forgotPassword`.
- Added SMTP env variables to Zod schema in `env.js`.
- Wrote basic jest tests for `email.service.js`.
Files/modules touched: `src/models/EmailLog.js`, `src/services/email.service.js`, `src/templates/emailTemplates.js`, `src/services/auth.service.js`, `src/config/env.js`, `src/app.js`, `tests/setup.js`, `tests/email.service.test.js`.
Tests added/updated: `tests/email.service.test.js` (mocked nodemailer).
How to verify manually: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env` (e.g., mailtrap credentials) and use the `/api/v1/auth/register` endpoint via `curl` to see if an email gets sent and an `EmailLog` is created in MongoDB.
Decisions made: Used simple string replacements for templates instead of a full template engine to keep things lightweight. Email sending errors are caught and logged as `FAILED` in the database to allow retry jobs in the future without failing the HTTP request.
New env vars / commands / endpoints / models:
- Models: `EmailLog`
- Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
Left undone / known issues: Background retry job for failed emails is pending (F-35).
NEXT STEP (specific): F-05 Frontend base (Vite + React Router + Layouts + Auth pages).

### Template (copy for each session)
```
### Session N — YYYY-MM-DD — <agent/human name>
Goal: <feature IDs and what we aimed to do>
Plan: <5–10 lines: models/endpoints/pages/edge cases>
Done:
- ...
Files/modules touched: ...
Tests added/updated: ... (result: all passing / failures listed)
How to verify manually: <steps / curl>
Decisions made: <link to D-xxx entries>
New env vars / commands / endpoints / models: ...
Left undone / known issues: ...
NEXT STEP (specific): ...
```

### Session 3 — 2026-10-03 — Antigravity Agent
Goal: F-03 Auth (Registration, Login, Refresh, Logout, JWTs, RBAC)
Plan: Create Zod validations, implement controller & service for Auth, token utils, and RBAC middleware. Also fix the `express-mongo-sanitize` / Express 5 `req.query` getter conflict.
Done:
- Created token utils (JWT, Crypto).
- Created Auth validation schemas (Zod).
- Created Auth service containing logic for register, login, verify, logout, refresh, reset password.
- Created Auth controller and mapped it to routes.
- Added `/api/v1/auth` to Express `app.js`.
- Fixed the Express 5 read-only `req.query` crash by mutating rather than reassigning inside Zod `validate` middleware.
- Disabled `hpp()` due to Express 5 compatibility issues causing crashes.
Files/modules touched: `src/app.js`, `src/utils/token.js`, `src/middlewares/validate.js`, `src/middlewares/auth.js`, `src/validations/auth.validation.js`, `src/services/auth.service.js`, `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`.
Tests added/updated: N/A
How to verify manually: Use `curl` to POST `/api/v1/auth/register` with `{ "name": "Test", "email": "test@test.com", "phone": "9999999999", "password": "Password123!" }`
Decisions made: Disabled `hpp()` parameter pollution middleware for now because it breaks Express 5.
New env vars / commands / endpoints / models:
- Endpoints: `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /verify-email/:token`, `POST /forgot-password`, `POST /reset-password/:token`, `GET /me`
Left undone / known issues: Real emails are not sent yet (returns token directly for dev/test). Wait for F-04.
NEXT STEP (specific): Start F-04 (Email service + queue-less sender).

### Session 2 — 2026-10-03 — Antigravity Agent
Goal: F-02 Core models & seed script
Plan: Create User, DoctorProfile, Specialization, Setting, AuditLog, Counter, and Plan models according to PRD section 10. Write `seed.js`.
Done:
- Created Mongoose schemas for all core models with correct indexing, refs, and validation.
- Created `seed.js` script to populate Admin user (if env vars present), default Settings, base Plans, and Specializations.
- Added `ADMIN_EMAIL` and `ADMIN_PASSWORD` to Zod env validation schema.
- F-01 is marked complete (server setup is functional).
Files/modules touched: `src/models/*.js`, `src/seed.js`, `src/config/env.js`
Tests added/updated: N/A
How to verify manually: Add `ADMIN_EMAIL=your@email.com` and `ADMIN_PASSWORD=yourpass` to `.env` and run `npm run seed` in `/server`. Then check MongoDB to verify data was seeded.
Decisions made: Used bcrypt for password hashing in seed script.
New env vars / commands / endpoints / models:
- Models: User, DoctorProfile, Specialization, Setting, AuditLog, Counter, Plan
- Command: `npm run seed`
Left undone / known issues: Test setup (Jest) is configured but tests for F-01/F-02 aren't explicitly written yet.
NEXT STEP (specific): Start F-03 (Auth).

### Session 1 — 2026-10-03 — Antigravity Agent
Goal: F-01 Project setup (Backend)
Plan: Set up `/server` skeleton, package.json, eslint, prettier, jest, env config, pino logger, global error handler, and Express app with `/api/v1/healthz`.
Done:
- Created `/server` directory and `package.json` with all dependencies.
- Configured `.eslintrc.json`, `.prettierrc`, `jest.config.js`.
- Created `.env.example`, `.env`, and `src/config/env.js` (using Zod).
- Set up `src/utils/logger.js`, `src/utils/ApiError.js`, `src/utils/asyncHandler.js`, and `src/middlewares/error.js`.
- Initialized Express server in `src/app.js` and `src/server.js` with basic middlewares and health route.
Files/modules touched: `/server/*`
Tests added/updated: N/A
How to verify manually: Run `npm install` in `/server`, then `npm run dev`. Hit `GET http://localhost:5000/api/v1/healthz`.
Decisions made: Used `/server` directory strictly as per PRD instead of the existing empty `/backend` directory.
New env vars / commands / endpoints / models:
- `/api/v1/healthz`
Left undone / known issues: User needs to run `npm install`. Frontend skeleton needs review.
NEXT STEP (specific): User to run `npm install` in `/server`. Then agent will write basic tests for server, configure MongoDB replica set instructions, and start on F-02.

### Session 0 — _(date)_ — Planning
Goal: Create PRD, AGENTS.md and PROGRESS.md.
Done: PRD v1.0 written; agent instructions and tracker created.
Left undone: Everything in the Feature Checklist.
NEXT STEP: Start F-01 (project setup).

---

## 5. Decisions Log (D-xxx)
Record every decision, assumption, PRD deviation or technology choice. Never delete; mark superseded ones.

| ID | Date | Decision | Reason | Impacts | Status |
|---|---|---|---|---|---|
| D-001 | _(date)_ | Use `node-cron` + idempotent job functions (status/flag guarded) instead of Redis/BullMQ initially | Simpler setup for v1, single instance | PRD §8 email queue and §13 jobs; email sending retried via DB-driven retry job | Active (revisit before multi-instance deploy) |
| D-002 | _(date)_ | Premium & Home Visit share one slot-lock key space `{doctor}\|{date}\|{start}` plus overlap check | PRD §5.2 | Slot engine, hold logic | Active |
| D-003 | _(date)_ | Fee bearer default = PATIENT (gross-up processing fee) | PRD §6.4 | Fee calculator, UI | Active (Owner may change) |

---

## 6. Edge Case Verification Tracker (PRD §14)
Mark each as ✅ only when there is a passing automated test or a documented manual verification.

| # | Scenario | Verified | Where tested |
|---|---|:--:|---|
| 1 | Two users same slot simultaneously | ⬜ | |
| 2 | Late payment after hold taken by another user → auto refund | ⬜ | |
| 3 | Late payment, slot still free → confirm | ⬜ | |
| 4 | Browser closed after payment → webhook confirms | ⬜ | |
| 5 | Duplicate / out-of-order webhooks | ⬜ | |
| 6 | Missing webhook → reconcile job | ⬜ | |
| 7 | Doctor suspended/expired after payment → booking honored | ⬜ | |
| 8 | Leave added on date with bookings → conflict flow; Normal auto-extend | ⬜ | |
| 9 | Type turned off → existing stay, new blocked | ⬜ | |
| 10 | Fee changed mid-checkout → snapshot used | ⬜ | |
| 11 | Double click / double tab → idempotent | ⬜ | |
| 12 | Hold hoarding limits | ⬜ | |
| 13 | Patient cancel attempt → blocked | ⬜ | |
| 14 | Refund after settlement (reversal / recoverable ledger) | ⬜ | |
| 15 | Linked account suspended → transfer failed + retry + alert | ⬜ | |
| 16 | Home address outside service area | ⬜ | |
| 17 | Home/Premium overlap prevention | ⬜ | |
| 18 | Schedule change with existing bookings | ⬜ | |
| 19 | IST/time handling | ⬜ | |
| 20 | Subscription expiry during booking | ⬜ | |
| 21 | Renewal in GRACE/EXPIRED restores listing | ⬜ | |
| 22 | Admin grant vs doctor payment concurrency | ⬜ | |
| 23 | Trial abuse prevention | ⬜ | |
| 24 | Past/min-notice booking rejected | ⬜ | |
| 25 | Normal booking near midnight validity | ⬜ | |
| 26 | Normal daily limit race | ⬜ | |
| 27 | Duplicate email/phone | ⬜ | |
| 28 | Unverified email cannot pay | ⬜ | |
| 29 | Blocked patient with upcoming appointments | ⬜ | |
| 30 | Doctor soft-delete with future appointments blocked | ⬜ | |
| 31 | Email failure retry/visibility | ⬜ | |
| 32 | Razorpay down at create-order | ⬜ | |
| 33 | Amount tampering | ⬜ | |
| 34 | Open redirect | ⬜ | |
| 35 | Malicious image upload | ⬜ | |
| 36 | Unpublished/expired doctor URL → 404 publicly | ⬜ | |
| 37 | Repeat bookings limits (max active normal tokens per patient/doctor) | ⬜ | |
| 38 | Crash between hold and order → sweeper | ⬜ | |
| 39 | Transactions unavailable → unique index still protects | ⬜ | |
| 40 | Wrong "complete" → revert within 24h | ⬜ | |
| 41 | Cancel after reminder queued → reminder suppressed | ⬜ | |
| 42 | Mobile popup killed / UPI switch → webhook + polling | ⬜ | |
| 43 | Fee 0 disallowed | ⬜ | |
| 44 | Global settings change applies to new holds only | ⬜ | |
| 45 | Token freed after expired hold becomes available | ⬜ | |

---

## 7. Blockers (⛔)
| Date | Blocker | Needed from | Status |
|---|---|---|---|
| _(date)_ | Razorpay Route enablement + test-mode keys not yet confirmed | Owner / Razorpay | Open |
| _(date)_ | Email provider credentials, image storage keys, Maps API key | Owner | Open |

---

## 8. Open Questions for the Owner
| Date | Question | Default we will use if no answer | Answered? |
|---|---|---|---|
| _(date)_ | Confirm Razorpay Route will be used for direct doctor payouts | Build with mockable interface, enable later | No |
| _(date)_ | Confirm fee bearer (patient pays processing fee vs doctor bears) | PATIENT | No |
| _(date)_ | Should unused Normal tokens be refunded on expiry? | No refund | No |

---

## 9. Bugs
| ID | Date found | Description | Found in feature | Status | Fixed in session |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## 10. Tech Debt / Ideas (do NOT build unless Owner approves)
- _(none yet)_

---

## 11. API Endpoints Implemented (keep in sync with PRD §11)
| Method | Path | Feature | Auth | Tested |
|---|---|---|---|:--:|
| GET | /healthz | F-01 | – | ⬜ |

## 12. Models Implemented
| Model | Feature | Notes |
|---|---|---|
| — | — | — |

## 13. Frontend Pages Implemented
| Route | Feature | Status |
|---|---|---|
| — | — | — |

## 14. Scheduled Jobs Implemented
| Job | Schedule | Feature | Idempotent? | Tested |
|---|---|---|:--:|:--:|
| — | — | — | — | — |
