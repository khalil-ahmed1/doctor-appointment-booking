# AGENTS.md — Instructions for AI Coding Agents

Project: **Doctor Booking & Appointment System** (Node.js, Express, MongoDB/Mongoose, React JavaScript, Razorpay)

> Read this file completely at the start of EVERY session. Then read `PROGRESS.md`. Do not write any code before doing both.

---

## 1. Source of Truth

| File | Purpose |
|---|---|
| `PRD.md` (put in repo root) | What to build: business rules, models, APIs, edge cases |
| `AGENTS.md` (this file) | How to work: process, rules, conventions |
| `PROGRESS.md` | Where we are: what is done, in progress, decisions, blockers |

Rules:
- The PRD is the specification. If code and PRD disagree, the PRD wins, unless the Owner approves a change.
- If the PRD is unclear, conflicting, or missing something: **do not guess silently**. Choose the simplest safe option, write it in `PROGRESS.md` under "Decisions", and tell the Owner in your final message.
- Never change PRD business rules on your own. Propose changes in `PROGRESS.md` → "Open Questions".

---

## 2. Session Protocol (MANDATORY)

### 2.1 Start of every session
1. Read `AGENTS.md`, then `PROGRESS.md` fully (especially "Current Focus", "Decisions", "Blockers", last 3 Session Log entries).
2. Run `git status` and `git log -5 --oneline`. If there are uncommitted changes you did not expect, report them before continuing.
3. Run the existing tests/lint (`npm test`, `npm run lint` in `/server` and `/client` if they exist) to know the baseline. Note any pre-existing failures in `PROGRESS.md`; do not hide them.
4. Pick the **next unchecked feature** in the Feature Checklist in order (or the one in "Current Focus"). Work on **one feature at a time**.
5. Add a new entry at the top of the Session Log: date, goal, feature IDs. Set the feature status to 🚧 In Progress and update "Current Focus".

### 2.2 During the session
- Commit small and often (one logical change per commit), message format: `feat(F-12): premium slot generation` / `fix(F-12): ...` / `test(...)` / `docs(...)`.
- Whenever you make a decision, hit a blocker, add an env variable, or deviate from the PRD, record it in `PROGRESS.md` **immediately** (not at the end).
- If the session may be cut off at any time, `PROGRESS.md` must always reflect reality. Update it after every completed sub-step.

### 2.3 End of every session (or when stopping)
Update `PROGRESS.md`:
1. Feature statuses (⬜ Not started, 🚧 In progress, ✅ Done, ⛔ Blocked).
2. Session Log entry: what was done, files/modules touched, tests added, what is left, exact **next step** (specific enough that a new session can continue without guessing).
3. "Current Focus" and "Next Up" sections.
4. New env vars, new commands, new API endpoints, new models, known issues, TODOs.
5. Make sure the repo is in a working state (app starts, tests pass). If something is half done, mark it clearly, keep it behind a flag or in a separate commit, and describe it in the log.

A feature is **never** marked ✅ unless it meets the Definition of Done (section 9).

---

## 3. How to Build: Step by Step, Feature by Feature

Follow the order in `PROGRESS.md` Feature Checklist (it mirrors the PRD phases). Do not jump ahead, and do not build several features at once.

### The loop for each feature
1. **Read** the related PRD sections (listed next to the feature ID in PROGRESS.md).
2. **Plan briefly** (5–10 lines in the session log): models touched, endpoints, UI pages, edge cases from PRD Section 14 that apply.
3. **Backend first**: model → service (business logic) → controller → route → validation → tests.
4. **Verify the backend** (tests and/or curl/Postman examples noted in PROGRESS.md).
5. **Frontend**: API hook → page/components → loading/empty/error states.
6. **Edge cases**: go through the checklist in section 7 and implement/verify each that applies.
7. **Update** PROGRESS.md, commit.

### Keep it simple (very important)
Prefer the simplest approach that fully satisfies the PRD rule. Specifically:
- Plain, readable JavaScript. Small functions. No clever one-liners, no premature abstraction, no generic "framework" code. Duplicate a little rather than over-engineer.
- No new libraries unless truly needed. Prefer the stack in the PRD. Record any new dependency and the reason in PROGRESS.md.
- Compute slots **on read** (no pre-generated slot collections). Use **polling** (e.g. every 20–30 s) instead of WebSockets.
- Controllers are thin; all business rules live in `/services`.
- Background jobs: start with simple scheduled functions (`node-cron`) that are **idempotent** (safe to run twice, use status/flag checks). Redis/BullMQ is an optional later upgrade; if introduced, record it as a Decision.
- Skip Phase "Future" items entirely.

### Simplicity must NOT weaken these (non-negotiable, build exactly as PRD says)
1. **Slot double-booking protection**: unique partial index on `slotLock` + atomic insert (PRD §5). Never rely on "check then insert" alone.
2. **Slot hold expiry**: unpaid holds auto-expire (default 10 min) and free the slot; cleanup also happens at hold time.
3. **Server-side money**: amounts, fees and breakdown are always computed on the server from DB values. Never trust amounts from the client. Money = integer paise.
4. **Payment finalization is idempotent** and shared by `verify` API and webhook (`finalizePayment`), including late payment cases A/B/C/D.
5. **Webhook**: raw body, signature verification, event-id idempotency.
6. **Patients can never cancel** appointments. No such endpoint or button. Doctor/Admin cancel triggers refund.
7. **RBAC + ownership checks** on every protected route.
8. **Visibility rules**: a doctor is listed/bookable only if published + ACTIVE + subscription (TRIAL/ACTIVE/GRACE) + payout account ACTIVE.
9. **Audit logs** for status changes, admin actions and money actions.

---

## 4. Tech Stack & Conventions

### 4.1 Backend (`/server`)
- Node.js (LTS), Express, Mongoose, JavaScript (CommonJS or ESM; choose once, record in PROGRESS.md, never mix).
- Validation: Zod (or Joi) on every request body, query and params; strip unknown fields.
- Auth: JWT access (15 min) + rotating refresh token (httpOnly cookie, hashed in DB). bcrypt cost ≥ 12.
- Security middleware: helmet, cors (allowed origin only), express-rate-limit, express-mongo-sanitize, hpp.
- Logging: pino (no console.log in committed code). Never log secrets, tokens, full card/bank/PAN data.
- Errors: use a single `ApiError(statusCode, code, message, details)` class and one global error handler. Response shape per PRD §11.
- Dates: `dayjs` with timezone `Asia/Kolkata`. Store UTC `Date` + `dateStr` (`YYYY-MM-DD`) + `startTime` (`HH:mm`).
- Money: integer paise. Helper `formatINR()` only in UI/emails.
- MongoDB must run as a **replica set** (needed for transactions), including local dev (use docker compose or Atlas).
- Folder structure exactly as PRD §16.1. Routes under `/api/v1`.

### 4.2 Frontend (`/client`)
- React 18 + Vite, React Router, TanStack Query, Axios (refresh-token interceptor), React Hook Form + Zod, Tailwind CSS.
- Structure by feature (`/features/auth`, `/features/booking`, ...). Pages are thin; reusable UI in `/components`.
- Every data screen has: loading skeleton, empty state, error state with retry.
- Mobile first and responsive (down to 360 px). Show times as IST.
- Never put secrets in the client. Only `RAZORPAY_KEY_ID` (public) and restricted Maps key.

### 4.3 Code quality
- ESLint + Prettier configured and passing. No unused code, no commented-out blocks, no dead files.
- Naming: camelCase for variables/functions, PascalCase for models/components, kebab-case for file names of routes/pages is acceptable; stay consistent.
- Every service function that changes state has a short comment describing the rule it enforces (with PRD section number).
- Environment variables only via `/config/env.js` (validated at startup; app fails fast if missing). Keep `.env.example` updated.

---

## 5. Git Rules
- Work on a branch per feature (`feature/F-12-premium-slots`) if the Owner uses branches; otherwise commit to the current branch in small commits.
- Never commit `.env`, secrets, `node_modules`, uploaded files, or build outputs.
- Never rewrite history, force-push, or delete branches without Owner approval.
- Do not make unrelated changes (no drive-by refactors). If you notice a problem elsewhere, add it to PROGRESS.md → "Tech Debt / Ideas".

---

## 6. Things You Must Never Do
- Never mark work done without running it and testing it.
- Never skip validation, auth or ownership checks "for now".
- Never hard-delete doctors, patients, appointments or payments (soft delete only).
- Never store raw bank account numbers or PAN in our DB (only last 4 digits + Razorpay IDs).
- Never trust the Razorpay frontend callback alone for confirming payments; webhook/verification on the server is the authority.
- Never add self-registration for doctors or admins. Only Admin onboards doctors.
- Never allow the `redirect` query param to be an absolute/external URL.
- Never leave test credentials, debug routes, or `console.log` of sensitive data in the code.
- Never delete or rewrite earlier entries in PROGRESS.md Session Log (append only; you may fix typos).
- Never install packages or run destructive commands (dropping DB, `rm -rf`, `git reset --hard`) without Owner approval, except on a throwaway test DB.

---

## 7. Edge Case Checklist (apply to every relevant feature)

Before finishing any feature, mentally run through these and make sure the ones that apply are handled **and tested**. The full table is PRD §14.

**Input & Auth**
- [ ] Invalid/missing fields → 422 with clear messages; extra fields stripped.
- [ ] Unauthenticated → 401; wrong role/ownership → 403/404 (no data leak).
- [ ] Duplicate email/phone, blocked user, unverified email (cannot pay).
- [ ] Login redirect keeps selected doctor/type; external redirect rejected.

**Booking & Slots**
- [ ] Two users, same slot, same time → exactly one wins; other gets `SLOT_TAKEN`.
- [ ] Hold expires → slot free again; late payment → cases A/B/C/D.
- [ ] Past slot, slot inside min-notice, outside advance-booking window, doctor on leave → rejected server-side.
- [ ] Doctor disabled the type / fee not set / doctor not bookable → rejected.
- [ ] Double-click / retry → idempotency key reuses hold and order.
- [ ] User hold limits (max active holds, rate limits).
- [ ] Premium vs Home Visit overlap; schedule change with existing bookings → conflict list, not silent break.
- [ ] Normal: daily token limit, atomic token numbers, validity end time (IST), auto-extend on leave.

**Payments**
- [ ] Amount recomputed on server and compared with order amount.
- [ ] Signature invalid → reject. Webhook duplicate/out-of-order → processed once.
- [ ] Payment success but browser closed → webhook confirms. Webhook missing → reconcile job.
- [ ] Refund on doctor/admin cancel with transfer reversal; failed refund/transfer visible to Admin.

**Subscription**
- [ ] Trial once per doctor (7 days from onboarding), expiry reminders deduped, grace, expired = hidden + no new bookings but existing bookings honored.
- [ ] Renewal stacks from `max(now, endsAt)`; admin manual change is audited and emailed.

**UI states**
- [ ] Loading, empty, error, disabled-while-submitting, 404/403 pages, mobile layout.

---

## 8. Testing Rules
- Backend: Jest + Supertest with an in-memory **replica set** (`mongodb-memory-server` with `MongoMemoryReplSet`) so transactions and unique indexes behave like production.
- Every service with business rules gets unit tests (slot generation, fee calculation, validity calculation, state transitions, subscription transitions).
- Every feature adds at least: 1 happy-path test + the relevant edge-case tests from section 7.
- The concurrency test (many parallel holds on one slot) must exist and stay green.
- Razorpay is mocked in tests (wrap SDK in `razorpayService` so it is easy to mock). Use Razorpay test mode keys for manual checks.
- Frontend: component tests for critical pieces (SlotPicker, BookingPanel, ProtectedRoute redirect) and, in the hardening phase, E2E tests for the main flows.
- Do not delete or weaken a failing test to get green. Fix the code or ask the Owner.

---

## 9. Definition of Done (per feature)
A feature may be marked ✅ only if ALL are true:
1. Behavior matches the referenced PRD sections.
2. Backend: model, service, route, validation, auth/ownership, error codes done.
3. Frontend (if applicable): all states (loading/empty/error) and responsive.
4. Applicable edge cases from section 7 handled.
5. Tests added and the full test suite + lint pass.
6. No secrets/debug code; `.env.example` updated if needed.
7. `PROGRESS.md` updated (status, log entry, endpoints/models/env added, next step).
8. How to manually verify is written in the log (steps or curl examples).

---

## 10. Handling Uncertainty, Blockers & Scope
- **Blocked** (missing keys, Razorpay Route not enabled, unclear rule): mark ⛔ in PROGRESS.md, describe exactly what is needed, and continue with another independent feature if possible. For payments, build against a clean interface + mocks so work isn't stalled.
- **Scope creep**: If you think of a nice extra feature, put it in "Tech Debt / Ideas". Do not build it.
- **Large feature**: split it into sub-tasks (F-12a, F-12b) in PROGRESS.md before starting.
- **Bug found in earlier completed feature**: add a row in "Bugs" in PROGRESS.md, fix it with a test, note it in the session log.
- **Conflicting instructions**: Owner's latest explicit instruction > this file > PRD > your own judgment. Record the conflict.

---

## 11. Communication Format (end of each session message to the Owner)
Keep it short and clear:
1. **Done:** features/sub-features completed.
2. **How to test:** exact steps/commands.
3. **Decisions/assumptions made:** (also in PROGRESS.md).
4. **Blockers/questions:** if any.
5. **Next step:** what the next session will do.

---

## 12. Standard Commands (keep this section updated)

```bash
# Server
cd server && npm install
npm run dev        # start API with nodemon
npm test           # jest (in-memory replica set)
npm run lint
npm run seed       # create admin, plans, specializations, settings

# Client
cd client && npm install
npm run dev        # vite dev server
npm test
npm run lint
npm run build
```
If a command changes or a new one is added, update this section and PROGRESS.md.

---

## 13. Local Setup Reminders
- MongoDB replica set required (Atlas free tier or local docker with `--replSet rs0`).
- Razorpay: use **test mode** keys; set webhook secret; for local webhooks use a tunnel (ngrok/cloudflared) pointing to `/api/v1/webhooks/razorpay`.
- Seed creates the first Super Admin from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`); never hard-code credentials.
