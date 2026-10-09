# Kosh — Loan Management System

A lending platform where borrowers apply for personal loans and internal teams take each loan through its lifecycle:
**Applied → Sanctioned → Disbursed → Closed** (or **Rejected**).

- **Borrower portal**: sign up, personal details with a server-side eligibility check (BRE), salary-slip upload, and a loan configurator with a live simple-interest calculation.
- **Operations dashboard**: four modules (Sales, Sanction, Disbursement, Collection). Each executive sees only their own module and Admin sees all four. Access is enforced in the UI and by the API.

| Layer    | Stack |
|----------|-------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend  | Node.js, Express 5, TypeScript, Zod |
| Database | MongoDB + Mongoose |
| Auth     | JWT (httpOnly cookie) + bcrypt |
| Tests    | Vitest, supertest, mongodb-memory-server, Testing Library |

---

## Quick start

**Prerequisites:** Node.js 20.9+ and MongoDB 7 or newer. If you don't have MongoDB installed, run `docker compose up -d` to start one.

```bash
git clone <repo-url> lms-assignment && cd lms-assignment
npm install                                  # installs root, backend and frontend

cp backend/.env.example backend/.env         # set JWT_SECRET to any long random string
cp frontend/.env.example frontend/.env.local

npm run seed                                 # creates one account per role
npm run dev                                  # API on :4000, web app on :3000
```

Open **http://localhost:3000**.

### Login credentials

Every seeded account uses the password **`Password@123`**. You can re-run `npm run seed` at any time; it resets these accounts and leaves other data alone.

| Role         | Email                  | Lands on |
|--------------|------------------------|----------|
| Admin        | `admin@lms.dev`        | All four modules |
| Sales        | `sales@lms.dev`        | `/dashboard/sales` |
| Sanction     | `sanction@lms.dev`     | `/dashboard/sanction` |
| Disbursement | `disbursement@lms.dev` | `/dashboard/disbursement` |
| Collection   | `collection@lms.dev`   | `/dashboard/collection` |
| Borrower     | `borrower@lms.dev`     | `/apply` |

New borrowers can also sign up at `/register`. Public sign-up always creates a borrower account.

### Trying the full flow

1. Log in as `borrower@lms.dev`, or register a new borrower.
2. **BRE failure:** enter a monthly salary of `20000` or choose *Unemployed*, then click **Check eligibility**. The server rejects the application and lists every failed rule.
3. **BRE pass:** use PAN `ABCPE1234F`, a date of birth that makes the applicant 23 to 50 years old, a salary of at least ₹25,000, and *Salaried*.
4. Upload a PDF, JPG or PNG salary slip (5 MB maximum).
5. Move the sliders, check the repayment panel, and click **Apply**. The loan is created as **Applied**.
6. As `sanction@lms.dev`, click **Approve**. You can also click **Reject**, which asks for a reason.
7. As `disbursement@lms.dev`, click **Mark as disbursed**.
8. As `collection@lms.dev`, record payments with unique UTRs. When the amount paid reaches the total repayment, the loan **closes automatically**.
9. To check RBAC: while logged in as Sanction, open `/dashboard/collection`. The route guard redirects you. Calling `/api/collection/loans` directly returns **403**.

---

## Scripts

Run these from the repo root:

| Command | What it does |
|---|---|
| `npm run dev` | API (`tsx watch`) and web app (`next dev`) together |
| `npm run seed` | Upserts the six role accounts |
| `npm test` | Backend and frontend test suites |
| `npm run typecheck` | `tsc --noEmit` for both apps |
| `npm run lint` | ESLint for the frontend |
| `npm run build` | Production builds (`backend/dist`, `frontend/.next`) |

Production run: `npm --prefix backend start` and `npm --prefix frontend start`.

---

## Architecture

```
Browser ──► Next.js (:3000) ── rewrite /api/* ──► Express API (:4000) ──► MongoDB
              │  proxy.ts: route guard by role                │
              │  React client pages                           └──► Storage driver (local disk | S3)
```

The browser only talks to the Next.js origin. Next forwards `/api/*` to Express, so the JWT can live in a first-party **httpOnly** cookie. The web app never stores or reads the token itself, no CORS round-trips are needed, and the same setup works when the frontend and backend are deployed separately.

### Folder structure

```
backend/
  src/
    app.ts                  createApp({ storage }) — wires middleware and routers
    server.ts               connects to Mongo, picks a storage driver, starts the server
    config/env.ts           Zod-validated environment
    lib/                    pure domain logic (unit-tested)
      bre.ts                eligibility rules + PAN regex
      loanMath.ts           simple interest
      loanStatus.ts         status machine (who may move a loan from X to Y)
      money.ts              rupees ↔ paise
      roles.ts              roles and module → role map
      serializers.ts        DB documents → API shapes (paise → rupees)
    middleware/             authenticate, authorize, validateBody, errorHandler
    models/                 User, BorrowerProfile, Loan, Payment
    modules/                one folder per feature: auth, borrower, sales, sanction,
                            disbursement, collection, loans (shared loan service)
    storage/                StorageDriver interface + local / S3 / in-memory drivers
    scripts/seed.ts
  tests/                    API integration tests + tests/unit
frontend/
  src/
    proxy.ts                route guard (Next.js 16's name for middleware)
    app/                    login, register, apply, dashboard/{sales,sanction,disbursement,collection}
    components/             UI primitives, apply flow, dashboard modules
    lib/                    api client, rbac, loan math, client BRE, formatting
  tests/
docs/                       design spec and implementation plan
```

---

## Design decisions

### Data model

All money is stored as **integer paise**, so there is no floating-point drift. The API accepts and returns rupees, with at most 2 decimals.

| Collection | Key fields | Notes |
|---|---|---|
| `users` | name, email (unique), passwordHash (`select: false`), role | Role is a single enum string |
| `borrowerprofiles` | user (unique ref), fullName, pan, dateOfBirth, monthlySalary, employmentMode, `bre {passed, failures, checkedAt}`, salarySlip | Pre-application state. Sales reads this for lead tracking. |
| `loans` | borrower (ref), **applicant snapshot**, salarySlip snapshot, principal, tenureDays, interestRatePa, simpleInterest, totalRepayment, amountPaid, status, rejectionReason, statusHistory[], sanctionedAt / disbursedAt / closedAt | A partial unique index allows only **one open loan per borrower** |
| `payments` | loan (ref), utr (**unique**, uppercased), amount, paymentDate, recordedBy | |

A loan copies the applicant's details when it is created. A later profile edit therefore can't change what the sanction team approved. Every status change is appended to `statusHistory`, which records who made it and when.

### Loan status machine

```
APPLIED ──approve (Sanction/Admin)──► SANCTIONED ──disburse (Disbursement/Admin)──► DISBURSED ──fully paid (system)──► CLOSED
   └──reject + reason (Sanction/Admin)──► REJECTED
```

- The PDF calls the starting state "pending"; this app names it **Applied**.
- Every transition goes through `assertTransition` in `backend/src/lib/loanStatus.ts`. An illegal move returns **409**, and the wrong actor gets **403**.
- The update itself is conditional on the status the server just read. If two executives act on the same loan at once, one succeeds and the other gets a 409.
- A borrower can apply again once their loan is Rejected or Closed.

### Business Rule Engine

| Rule | Rejected when |
|---|---|
| Age | Not 23–50 (completed years, inclusive) |
| Salary | Below ₹25,000 per month |
| PAN | Doesn't match `^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$` |
| Employment | Unemployed |

- **PAN regex:** 5 letters, 4 digits, 1 letter. The 4th character is the holder type (P individual, C company, H HUF, F firm, A AOP, T trust, B BOI, L local authority, J juridical person, G government), so `ABCDE1234F` is rejected. Input is uppercased before the check.
- **Where the BRE runs:** the server is the authority, because anything in the browser can be bypassed. The client runs the same rules only to show hints while the user types. The server reports **all** failing rules in a **422** response, so the user can fix everything at once. The failed result is also saved, so Sales can see which leads were rejected and why.

### Loan math

`SI = (P × 12 × T) / (365 × 100)`, rounded to the nearest paisa, and `Total = P + SI`.

- The server recomputes both values from principal and tenure. The client's numbers are only for display, and any interest or total the client sends is ignored.
- Limits: principal ₹50,000 to ₹5,00,000, tenure 30 to 365 days.
- Example: ₹2,00,000 for 180 days gives SI = ₹11,835.62, so the total is ₹2,11,835.62.

### Payments and outstanding balance

- **Outstanding** is derived as `totalRepayment − amountPaid` and never stored separately, so the two values can't disagree.
- **Validation:**
  - The loan must be Disbursed.
  - The amount must be greater than 0, have at most 2 decimals, and be no more than the outstanding balance.
  - The UTR must be 8–30 letters or digits and unique across all payments. A duplicate returns **409**, and the uniqueness is enforced by a database index.
  - The payment date can't be in the future or before the disbursal date.
- **Concurrency:** `amountPaid` is incremented with one atomic, conditional update (`amountPaid + amount ≤ totalRepayment`). The same update sets status to Closed when the balance reaches zero. If that guard fails, for example because two payments arrive at once, or the update throws, the payment that was just inserted is removed so the UTR can be retried. There is a test that fires three overlapping payments and checks that exactly one is accepted.
- **Known limit:** the payment insert and the loan update are two writes, not one transaction. If the process crashed between them, or a write reached the database just before the connection dropped, the payment list and `amountPaid` could disagree. MongoDB multi-document transactions would close that gap, but they need a replica set. A plain local `mongod` doesn't have one, so this version doesn't use them. On Atlas, which always runs a replica set, wrapping `recordPayment` in `session.withTransaction()` is the next step.
- **Dates:** payment dates and the BRE's "today" use the Indian calendar date (UTC+5:30), so behaviour doesn't change between midnight and 05:30 IST. Impossible dates such as `2026-02-30` are rejected instead of rolling over to March.

### Authentication and RBAC

- Passwords are hashed with bcrypt. A JWT `{ sub, role }` is set as an httpOnly, SameSite=Lax cookie (Secure in production) that expires with the token. The token is also returned in the login response for non-browser API clients, which can send `Authorization: Bearer`.
- Login and sign-up are rate-limited to 30 attempts per 15 minutes per IP. In production the server refuses to start with a short or placeholder `JWT_SECRET`.
- `authenticate` verifies the token and **reloads the user** on every request, so the API applies deleted users or changed roles immediately. A missing or invalid token gets **401**. (The frontend route guard reads the role from the token, so its redirects catch up at the next login.)
- `authorize(...roles)` checks the role against a single `MODULE_ROLES` map. The wrong role gets **403**.
- **Frontend:**
  - `proxy.ts` redirects each role away from pages it can't use.
  - After login, a `?next=` value is honoured only if it is an in-app page the role may open, so it can't be used for open redirects or `javascript:` URLs.
  - If the API rejects a session cookie (for example after a reseed), the app clears the cookie and returns to the login page.
  - The dashboard only renders the modules the role allows.
  - Each module page checks the role again.
  - These checks are for user experience. The API applies the same rules on every request.

### File uploads

- Salary slips go through multer with a 5 MB limit; larger files get **413**.
- The declared MIME type must be PDF, PNG or JPEG, **and** the file's first bytes must match that type. A `.txt` renamed to `.pdf` is rejected.
- Files are stored under server-generated keys and never served statically. Re-uploading keeps the earlier file in storage as an audit trail. A borrower who reapplies after a rejection can reuse the slip on file. They are streamed through `GET /api/loans/:id/salary-slip` only to the owning borrower and to staff who handle loans.
- Storage is pluggable:
  - `STORAGE_DRIVER=local` writes to `backend/uploads/` and is the default.
  - `STORAGE_DRIVER=s3` writes to a private bucket with server-side encryption. Use it on hosts whose disks are wiped on restart.

---

## REST API

Base path: `/api`. Errors always look like `{ "error": { "code", "message", "details?" } }`.

| Method & path | Roles | Success | Notable errors |
|---|---|---|---|
| `POST /auth/register` `{name,email,password}` | public | 201 `{user, token}` + cookie | 400, 409 email taken, 429 |
| `POST /auth/login` `{email,password}` | public | 200 `{user, token}` + cookie | 401, 429 too many attempts |
| `POST /auth/logout` | any | 204 | |
| `GET /auth/me` | authenticated | 200 `{user}` | 401 |
| `GET /borrower/profile` | Borrower | 200 `{profile, stage}` | |
| `PUT /borrower/profile` `{fullName,pan,dateOfBirth,monthlySalary,employmentMode}` | Borrower | 200 | 400, **422 BRE_REJECTED** with failed rules, 409 open loan |
| `POST /borrower/salary-slip` multipart `file` | Borrower | 201 | 400 type/content, 413 size, 409 BRE not passed |
| `GET /borrower/loans` | Borrower | 200 `{loans}` | |
| `POST /borrower/loans` `{principal,tenureDays}` | Borrower | 201 `{loan}` | 400 limits, 409 BRE / slip missing / open loan |
| `GET /loans/:id/salary-slip` | owner, Admin, Sanction, Disbursement, Collection | 200 file stream | 403, 404 |
| `GET /sales/leads` | Sales, Admin | 200 `{leads}` | 403 |
| `GET /sanction/loans` | Sanction, Admin | 200 `{loans}` (Applied) | 403 |
| `POST /sanction/loans/:id/approve` | Sanction, Admin | 200 `{loan}` | 404, 409 |
| `POST /sanction/loans/:id/reject` `{reason}` | Sanction, Admin | 200 `{loan}` | 400, 404, 409 |
| `GET /disbursement/loans` | Disbursement, Admin | 200 `{loans}` (Sanctioned) | 403 |
| `POST /disbursement/loans/:id/disburse` | Disbursement, Admin | 200 `{loan}` | 404, 409 |
| `GET /collection/loans` | Collection, Admin | 200 `{loans}` (Disbursed) | 403 |
| `GET /collection/loans/:id/payments` | Collection, Admin | 200 `{loan, payments}` | 404 |
| `POST /collection/loans/:id/payments` `{utr,amount,paymentDate}` | Collection, Admin | 201 `{loan, payment}` | 400 amount/date, **409 DUPLICATE_UTR**, 409 loan not active |

A loan in API responses has this shape (amounts in rupees):

```json
{
  "id": "…", "status": "DISBURSED",
  "borrower": { "id": "…", "name": "Priya Sharma", "email": "priya@example.com" },
  "applicant": { "fullName": "Priya Sharma", "pan": "ABCPE1234F", "dateOfBirth": "1994-03-15", "monthlySalary": 65000, "employmentMode": "SALARIED" },
  "principal": 200000, "tenureDays": 180, "interestRatePa": 12,
  "simpleInterest": 11835.62, "totalRepayment": 211835.62, "amountPaid": 100000, "outstanding": 111835.62,
  "statusHistory": [{ "from": null, "to": "APPLIED", "by": "…", "at": "…", "note": null }, "…"],
  "rejectionReason": null, "sanctionedAt": "…", "disbursedAt": "…", "closedAt": null
}
```

---

## Testing

```bash
npm test
```

- **Backend (126 tests):**
  - Unit tests for the BRE (age boundaries, PAN formats, multiple failures), loan math, money conversion, the status machine and the storage driver.
  - API tests against an in-memory MongoDB for every route: success paths, validation, 401/403 for every module, 409 conflicts, duplicate UTR, overpayment, concurrent payments, auto-close, rollback when the loan update fails, Indian-date boundaries, impossible dates, and a full lifecycle test using the seeded accounts.
- **Frontend (36 tests):** loan math matches the server, client BRE, RBAC helpers including the safe `?next=` redirect, INR formatting, and a component test that moves the sliders and checks the live repayment panel.

The first backend run downloads a MongoDB binary for `mongodb-memory-server`. To use an installed `mongod` instead, set `MONGOMS_SYSTEM_BINARY=/path/to/mongod`.

---

## Environment variables

**backend/.env**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `MONGO_URI` | `mongodb://localhost:27017/lms` | Database |
| `JWT_SECRET` | none, **required** | Token signing secret (32+ random characters in production) |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:3000` | Only needed if a browser calls the API directly |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `UPLOAD_DIR` | `uploads` | Folder for the local driver |
| `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | | Needed only for the S3 driver |

**frontend/.env.local**

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:4000` | Where `/api/*` is forwarded. Must be set **before** `next build`. |

## Deploying

The app runs on any Node host. A typical free setup:

1. **MongoDB Atlas:** create a cluster and use its connection string as `MONGO_URI`.
2. **Backend** (Render, Railway or Fly):
   - Root directory `backend`, build `npm install && npm run build`, start `npm start`.
   - Set `NODE_ENV=production`, `JWT_SECRET`, `MONGO_URI` and `STORAGE_DRIVER=s3` with the bucket variables.
   - Run `npm run seed` once against the production database.
3. **Frontend** (Vercel): root directory `frontend`, and set `BACKEND_URL` to the backend's public URL.
