# Loan Management System — Design

Source: `LMS_Assignment.pdf` (Full-Stack Assignment). This document records the design decisions the
assignment leaves open (Section 5).

## 1. Stack & layout

| Part     | Choice                                                                 |
|----------|------------------------------------------------------------------------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS, Vitest unit tests    |
| Backend  | Node.js + Express + TypeScript, Zod validation, Vitest + supertest     |
| Database | MongoDB + Mongoose (local or `docker compose up -d mongo`)             |
| Auth     | bcrypt password hashes, JWT in an httpOnly cookie (Bearer also accepted) |
| Files    | `StorageDriver` interface: `local` (default, `backend/uploads/`) or `s3` |

```
lms-assignment/
├── backend/            Express API (src/{config,models,modules,middleware,lib,storage}, tests/)
├── frontend/           Next.js app (src/{app,components,lib}, tests via vitest)
├── docs/               design + plan
├── docker-compose.yml  MongoDB only
└── README.md
```

The frontend proxies `/api/*` to the backend through a Next.js rewrite, so the browser sees one origin.
That keeps the auth cookie first-party and lets the Next.js route guard read it.

## 2. Roles & RBAC

Roles are stored as a single string enum on the user: `ADMIN | SALES | SANCTION | DISBURSEMENT | COLLECTION | BORROWER`.

| Module        | Roles allowed               |
|---------------|-----------------------------|
| Borrower portal | BORROWER                  |
| Sales         | SALES, ADMIN                |
| Sanction      | SANCTION, ADMIN             |
| Disbursement  | DISBURSEMENT, ADMIN         |
| Collection    | COLLECTION, ADMIN           |

- `authenticate` middleware: verifies JWT (cookie `lms_token` or `Authorization: Bearer`), loads user → `req.user`. Missing/invalid → **401**.
- `authorize(...roles)` middleware: role not in list → **403**.
- Frontend: a route guard (Next.js proxy/middleware) decodes the token's role and redirects; the dashboard
  nav renders only allowed modules. The backend remains the authority.
- Public registration always creates a `BORROWER`. Staff accounts come from the seed script.

## 3. Data model

All money is stored as **integer paise** to avoid floating-point drift; the API speaks rupees
(numbers with at most 2 decimals) and converts at the boundary.

### users
`name, email (unique, lowercase), passwordHash, role, createdAt, updatedAt`

### borrowerprofiles (1:1 with a BORROWER user)
`user (ref, unique), fullName, pan (uppercase), dateOfBirth, monthlySalary (paise), employmentMode
(SALARIED | SELF_EMPLOYED | UNEMPLOYED), bre { passed, failures[{rule, message}], checkedAt },
salarySlip { storageKey, originalName, mimeType, size, uploadedAt } | null`

The profile is the pre-application state; Sales reads it for lead tracking.

### loans
`borrower (ref users), applicant snapshot { fullName, pan, dateOfBirth, monthlySalary, employmentMode },
salarySlip (snapshot of the profile's slip), principal, tenureDays, interestRatePa (12),
simpleInterest, totalRepayment, amountPaid (all paise), status, rejectionReason,
statusHistory[{ from, to, by, at, note }], sanctionedAt, disbursedAt, closedAt, timestamps`

Snapshotting the applicant data makes a loan immutable evidence of what was approved, even if the
profile is edited later. Outstanding = `totalRepayment − amountPaid` (derived, never stored).

### payments
`loan (ref), utr (unique index, uppercase, trimmed), amount (paise), paymentDate, recordedBy (ref users), createdAt`

## 4. Loan status machine

```
APPLIED ──approve (SANCTION/ADMIN)──▶ SANCTIONED ──disburse (DISBURSEMENT/ADMIN)──▶ DISBURSED ──full payment (system)──▶ CLOSED
   └──reject + reason (SANCTION/ADMIN)──▶ REJECTED
```

"Pending" in the PDF = `APPLIED`. Transitions live in one table (`lib/loanStatus.ts`); any other
transition returns **409 Conflict**. A borrower may hold only one open loan (APPLIED, SANCTIONED or
DISBURSED) at a time; after REJECTED or CLOSED they may apply again.

## 5. Business rules

**BRE** (server-side, authoritative; the client runs the same checks only for instant feedback). All
failing rules are reported together.

| Rule       | Reject when |
|------------|-------------|
| AGE        | age (full years on today's date) < 23 or > 50 |
| SALARY     | monthly salary < ₹25,000 |
| PAN        | not `^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$` (5 letters, 4th = holder type, 4 digits, letter) |
| EMPLOYMENT | employment mode is UNEMPLOYED |

The result is saved on the profile (so Sales can see BRE-rejected leads) and a failure returns **422**
with the list of failed rules. The server must own the BRE because client checks can be bypassed.

**Loan math:** `SI = P × 12 × T / (365 × 100)`, rounded to the nearest paisa; `Total = P + SI`.
Limits: principal ₹50,000–₹5,00,000, tenure 30–365 days. The server recomputes everything; the client's
numbers are for display only.

**Salary slip:** PDF/JPG/PNG, ≤ 5 MB, checked by MIME type and by file signature (magic bytes).
Requires a passed BRE. A loan cannot be applied for without a slip.

**Payments:** loan must be DISBURSED; amount > 0, at most 2 decimals, ≤ outstanding; UTR unique
(duplicate → **409**); payment date not in the future and not before disbursal. The loan's
`amountPaid` is incremented with a conditional atomic update (`amountPaid + amount ≤ totalRepayment`),
so concurrent payments cannot overpay. When `amountPaid == totalRepayment` the loan moves to CLOSED.

## 6. REST API (prefix `/api`)

| Method & path | Roles | Purpose |
|---|---|---|
| POST `/auth/register` | public | borrower sign-up → 201 + cookie |
| POST `/auth/login` | public | → 200 + cookie, 401 on bad credentials |
| POST `/auth/logout` | any | clears cookie |
| GET `/auth/me` | authenticated | current user |
| GET `/borrower/profile` | BORROWER | profile + application step |
| PUT `/borrower/profile` | BORROWER | save personal details, run BRE → 200 / 422 |
| POST `/borrower/salary-slip` | BORROWER | multipart `file` → 201 |
| GET `/borrower/loans` | BORROWER | own loans |
| POST `/borrower/loans` | BORROWER | `{ principal, tenureDays }` → 201 APPLIED |
| GET `/loans/:id/salary-slip` | owner or staff with access to the loan | file download |
| GET `/sales/leads` | SALES, ADMIN | registered borrowers with no loan + their stage |
| GET `/sanction/loans` | SANCTION, ADMIN | APPLIED loans |
| POST `/sanction/loans/:id/approve` | SANCTION, ADMIN | APPLIED → SANCTIONED |
| POST `/sanction/loans/:id/reject` | SANCTION, ADMIN | `{ reason }` APPLIED → REJECTED |
| GET `/disbursement/loans` | DISBURSEMENT, ADMIN | SANCTIONED loans |
| POST `/disbursement/loans/:id/disburse` | DISBURSEMENT, ADMIN | SANCTIONED → DISBURSED |
| GET `/collection/loans` | COLLECTION, ADMIN | DISBURSED loans with outstanding |
| GET `/collection/loans/:id/payments` | COLLECTION, ADMIN | payment history |
| POST `/collection/loans/:id/payments` | COLLECTION, ADMIN | `{ utr, amount, paymentDate }` → 201 |

Errors share one shape: `{ error: { code, message, details? } }`. Codes: 400 validation, 401, 403, 404,
409 conflict/duplicate/invalid transition, 413 file too large, 422 BRE rejection.

## 7. Frontend

- `/login`, `/register`
- `/apply` — borrower stepper: Personal Details → Salary Slip → Loan Config (sliders + live SI panel) →
  status view of the current loan.
- `/dashboard` → redirects to the first allowed module; `/dashboard/{sales,sanction,disbursement,collection}`.
- Responsive Tailwind layout; tables collapse to cards on small screens.

## 8. Testing

- Backend: Vitest + supertest against `mongodb-memory-server` (fresh DB per test file, in-memory storage
  driver). Unit tests for BRE, loan math, the status machine and money helpers; integration tests per route
  covering happy paths, validation, 401/403 and the full lifecycle.
- Frontend: Vitest unit tests for loan math, client BRE, RBAC helpers and the calculator component.

## 9. Seed accounts

`npm run seed` (idempotent) creates one user per role, password `Password@123`:
`admin@lms.dev, sales@lms.dev, sanction@lms.dev, disbursement@lms.dev, collection@lms.dev, borrower@lms.dev`.
