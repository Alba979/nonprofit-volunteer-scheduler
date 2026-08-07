# VolunteerShield

**Volunteer shift scheduling with automated background-check verification, SMS reminders, and grant-compliance reporting — built for small-to-mid-size nonprofits.**

VolunteerShield lets volunteers browse and sign up for shifts online. Any shift flagged as requiring a background check is automatically gated: the system checks for a **cleared, non-expired** background check on file before confirming the booking. If the volunteer isn't cleared, the booking is blocked and they're redirected straight into the background-check request flow — no manual screening step, no risk of a coordinator missing it.

Built for a program coordinator with 20–200 volunteers who currently manages shifts through spreadsheets, group texts, and a shared inbox.

---

## Why this exists

Nonprofits that place volunteers in sensitive roles (youth mentoring, elder care, disaster response) are legally and contractually required — often by grant funders — to keep volunteers with expired or missing background checks off restricted shifts, and to produce an auditable attendance record on demand. Doing this by hand doesn't scale past a handful of volunteers and is exactly the kind of process where a spreadsheet error becomes a liability. VolunteerShield makes the check-before-confirm rule impossible to bypass and keeps a permanent, append-only attendance log for exactly that reporting need.

## Core features

- **Background-check gated booking.** Restricted shifts can only be confirmed for volunteers with a `CLEARED` background check that hasn't expired. Everyone else is auto-redirected to the clearance request screen instead of hitting a dead end.
- **SMS shift reminders.** A scheduled job texts every confirmed volunteer ahead of their shift (configurable lead time, default 24h).
- **Last-minute cancellation handling.** Cancelling inside the configurable cutoff window (default 24h) automatically texts up to 5 eligible volunteers from the same program area asking them to cover the open seat — filtered to only volunteers who are actually cleared if the shift is restricted.
- **Permanent grant-compliance log.** Every shift's attendance (`ATTENDED` / `NO_SHOW` / `EXCUSED`) is written to an append-only log with a point-in-time snapshot of the volunteer's clearance status at the time of the shift — so a report pulled a year later reflects what was true then, not what's true now.
- **Retention & no-show analytics.** Dashboard charts show month-over-month volunteer retention and no-show rate, broken out by program area.
- **Role-based access.** Admins and coordinators manage shifts, background checks, and reports; volunteers can book/cancel their own shifts and see their own clearance status.
- **Waitlisting.** Shifts at capacity automatically waitlist new sign-ups and promote the next volunteer in line when a seat opens up.

## Tech stack

| Layer      | Choice                                                                 |
|------------|-------------------------------------------------------------------------|
| Backend    | Node.js, Express, TypeScript, Prisma ORM                                |
| Database   | SQLite by default (zero config); swap to PostgreSQL for production      |
| SMS        | Twilio, with an automatic "simulated" fallback for local dev (no account needed to run the app) |
| Auth       | JWT, bcrypt password hashing                                            |
| Scheduling | `node-cron` for the reminder sweep                                      |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router        |
| Testing    | Vitest                                                                   |
| Deployment | Dockerfile per service + `docker-compose.yml`                           |

## Project structure

```
volunteershield/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # data model (volunteers, shifts, background checks, attendance log, SMS log)
│   │   └── seed.ts             # realistic sample data for a demo nonprofit
│   ├── src/
│   │   ├── config/             # environment config
│   │   ├── controllers/        # request handlers
│   │   ├── jobs/                # cron: shift reminder sweep
│   │   ├── lib/                 # Prisma client
│   │   ├── middleware/         # auth, validation, error handling
│   │   ├── routes/             # Express routers
│   │   ├── services/           # business logic (clearance, scheduling, sms, reporting, auth)
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
└── frontend/
    └── src/
        ├── api/                 # Axios client
        ├── components/          # Navbar, ShiftCard, charts, badges
        ├── hooks/                # auth context
        ├── pages/                # Dashboard, Shifts, Volunteers, Background Checks, Reports, Login
        └── types/
```

## The background-check rule, in one place

The entire "is this volunteer allowed on this shift" decision lives in a single function — `evaluateClearance()` in `backend/src/services/clearance.service.ts` — and every other part of the system (booking, replacement texts, attendance logging) calls through it. That means the rule can't drift or get duplicated with a subtly different bug in a second code path:

```ts
// backend/src/services/clearance.service.ts
export async function evaluateClearance(volunteerId: string): Promise<ClearanceResult> {
  const latest = await prisma.backgroundCheck.findFirst({
    where: { volunteerId },
    orderBy: { requestedAt: "desc" },
  });

  if (!latest) return { cleared: false, reason: "No background check on file" };
  if (latest.status !== "CLEARED") return { cleared: false, reason: `Background check status is ${latest.status}` };
  if (latest.expiresAt && latest.expiresAt.getTime() < Date.now()) {
    return { cleared: false, reason: `Background check expired on ${latest.expiresAt.toISOString().slice(0, 10)}` };
  }
  return { cleared: true, reason: "Cleared" };
}
```

`bookShift()` in `scheduling.service.ts` calls this before confirming any shift flagged `requiresBackgroundCheck`, and returns a `REDIRECTED` result with a `redirectUrl` pointing the client at the background-check request screen instead of a generic error.

## Getting started (local development)

### Prerequisites
- Node.js 20+
- npm 10+

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

The API starts on `http://localhost:4000`. `npm run seed` populates a demo nonprofit ("Riverside Community Outreach") with 5 program areas, 20 volunteers, ~2 months of shift/attendance history, and a realistic mix of cleared, expired, and pending background checks — see [Sample data](#sample-data) below.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173`. Sign in with a seeded account:

| Role        | Email                              | Password       |
|-------------|-------------------------------------|-----------------|
| Admin       | `admin@riversideoutreach.org`       | `Admin123!`     |
| Coordinator | `coordinator@riversideoutreach.org` | `Admin123!`     |
| Volunteer   | any seeded volunteer email (e.g. `maria.gonzalez@example.com`) | `Volunteer123!` |

### 3. Run tests

```bash
cd backend
npm test
```

### 4. Docker (both services)

```bash
docker compose up --build
```

Backend on `:4000`, frontend on `:5173`.

## SMS in development

No Twilio account is required to run or demo this project. If `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` are unset, `sms.service.ts` logs the message and stores it with `status: SIMULATED` in the `SmsMessage` table instead of making a network call — so reminders, cancellation confirmations, and replacement requests all work end-to-end locally. Add real Twilio credentials to `.env` to send live texts.

## Sample data

Running `npm run seed` in `backend/` creates:
- **5 program areas** — Food Pantry, Youth Mentoring, Senior Companionship, Animal Shelter, Disaster Relief (the first two require background checks)
- **20 volunteers** spread across those areas, joined over the past 1–10 months
- **Background checks** for every volunteer in a restricted program area, deliberately mixed: mostly cleared and current, a few expiring within 30 days, one expired, one still pending — so the "blocked booking → redirect" flow and the "expiring soon" dashboard widget both have real data to show
- **~250 past shifts** (last 60 days) with bookings, attendance (`ATTENDED` / `NO_SHOW` / `EXCUSED`), and some last-minute cancellations — this is what feeds the retention and no-show charts
- **~50 upcoming shifts** (next 21 days), some already booked, most open for the demo login to book live

## API overview

All endpoints are under `/api` and (except `/api/auth/*`) require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in, receive a JWT |
| POST | `/api/auth/register` | Self-register a volunteer account |
| GET | `/api/shifts` | List shifts (filter by program area / date range) |
| POST | `/api/shifts/:id/book` | Book a shift — returns `CONFIRMED`, `WAITLISTED`, or `REDIRECTED` |
| POST | `/api/shifts/bookings/:bookingId/cancel` | Cancel a booking; triggers replacement outreach if last-minute |
| POST | `/api/shifts/bookings/:bookingId/attendance` | Coordinator: log attendance for grant compliance |
| GET | `/api/background-checks/volunteer/:id` | A volunteer's background-check history |
| GET | `/api/background-checks/volunteer/:id/clearance` | Current clearance decision (cleared/not + reason) |
| POST | `/api/background-checks/request` | Start a new background-check request |
| PATCH | `/api/background-checks/:id` | Coordinator: record a check's outcome |
| GET | `/api/reports/retention` | Monthly retention % by program area |
| GET | `/api/reports/no-show-rate` | No-show rate by program area |
| GET | `/api/reports/compliance-export` | Full attendance log with clearance snapshots |

## Production notes

- Swap the Prisma `datasource` provider from `sqlite` to `postgresql` and point `DATABASE_URL` at a managed instance before deploying — SQLite is intentionally the zero-config default for local dev and small single-instance deployments.
- Set a strong, unique `JWT_SECRET`.
- Add real Twilio credentials for live SMS.
- Consider putting the reminder cron (`backend/src/jobs/reminder.job.ts`) behind a dedicated worker/queue if volunteer volume grows past a few thousand.

## License

MIT — see [LICENSE](LICENSE).

---

*Built as a demonstration of production-quality nonprofit operations tooling. Replace this section with your own description when publishing to your Git host.*
