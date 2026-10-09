# Loan Management System Implementation Plan

> **For agentic workers:** Execute task-by-task with TDD (red → green → commit). Steps use checkbox (`- [ ]`) syntax.

**Goal:** A working end-to-end LMS: borrower applies (BRE, slip upload, loan config) and staff move the loan
APPLIED → SANCTIONED → DISBURSED → CLOSED under role-based access.

**Architecture:** Express + Mongoose API organised by feature module (`auth`, `borrower`, `sales`,
`sanction`, `disbursement`, `collection`), pure domain helpers in `lib/` (BRE, loan math, money, status
machine), and a pluggable storage driver. A Next.js App Router frontend proxies `/api` to the API.

**Tech Stack:** Node 20+, TypeScript, Express 5, Mongoose 9, Zod 4, bcryptjs, jsonwebtoken, multer,
@aws-sdk/client-s3, Vitest, supertest, mongodb-memory-server; Next.js 16, React 19, Tailwind CSS 4.

**Spec:** `docs/specs/2026-10-09-lms-design.md`

## Global Constraints

- Money stored as integer paise; API accepts and returns rupees (≤ 2 decimals).
- Interest 12% p.a. simple: `SI = P × R × T / (365 × 100)`, rounded to the nearest paisa.
- Principal ₹50,000–₹5,00,000; tenure 30–365 days.
- BRE: age 23–50 inclusive, salary ≥ ₹25,000, PAN `^[A-Z]{3}[ABCFGHLJPT][A-Z][0-9]{4}[A-Z]$`, not UNEMPLOYED.
- Slip: PDF/JPG/PNG, ≤ 5 MB.
- 401 = not authenticated, 403 = wrong role, 409 = conflict/duplicate/illegal transition, 422 = BRE failure.
- Error body: `{ error: { code, message, details? } }`.

---

### Task 1: Backend scaffold + test harness
**Files:** `backend/{package.json,tsconfig.json,vitest.config.ts,.env.example}`, `src/config/env.ts`,
`src/app.ts`, `src/server.ts`, `src/lib/errors.ts`, `src/middleware/errorHandler.ts`, `tests/setup.ts`, `tests/health.test.ts`
**Produces:** `createApp(deps: { storage: StorageDriver }): Express`, `AppError(status, code, message, details?)`,
test helper `setupTestDb()` (memory server, clears collections between tests).
- [ ] Test: `GET /api/health` → 200 `{ status: 'ok' }`; unknown route → 404 error shape. Run → fail.
- [ ] Implement app, error handler, 404 handler. Run → pass. Commit.

### Task 2: Domain helpers (pure, unit-tested)
**Files:** `src/lib/{money,loanMath,bre,loanStatus,roles}.ts` + `tests/unit/*.test.ts`
**Produces:**
- `toPaise(rupees: number): number`, `toRupees(paise: number): number`, `hasAtMostTwoDecimals(n)`
- `calculateLoan(principalPaise, tenureDays) → { simpleInterest, totalRepayment }` (paise), `LOAN_LIMITS`, `INTEREST_RATE_PA = 12`
- `PAN_REGEX`, `ageOn(dob, today)`, `evaluateBre(input, today) → { passed, failures: {rule, message}[] }`
- `LoanStatus` enum, `assertTransition(from, to, role) ` throws AppError 409/403
- `Role` enum, `MODULE_ROLES`
- [ ] Tests: SI for ₹1,00,000 × 365 d = ₹12,000; ₹50,000 × 30 d = ₹493.15; boundary ages 22/23/50/51 (birthday
  edge); salary 24,999.99 vs 25,000; valid/invalid PANs (lowercase normalised before check, wrong 4th char,
  wrong length); unemployed; multiple failures reported together; illegal transitions rejected. Run → fail.
- [ ] Implement. Run → pass. Commit.

### Task 3: User model, auth routes, authenticate/authorize middleware
**Files:** `src/models/User.ts`, `src/modules/auth/{auth.routes,auth.service,auth.schemas}.ts`,
`src/middleware/{authenticate,authorize,validate}.ts`, `tests/auth.test.ts`, `tests/rbac.test.ts`
**Produces:** `authenticate`, `authorize(...roles: Role[])`, `signToken(user)`, `validate(schema, 'body'|'query')`;
test helper `createUserAndLogin(role) → { user, cookie }`.
- [ ] Tests: register creates BORROWER (role in body ignored), hashed password, duplicate email 409, weak
  password 400; login success sets httpOnly cookie, wrong password 401; `/me` 401 without token, works with
  cookie or Bearer; tampered token 401. Run → fail.
- [ ] Implement. Run → pass. Commit.

### Task 4: Storage drivers
**Files:** `src/storage/{StorageDriver,localStorage,s3Storage,memoryStorage,index}.ts`, `tests/unit/storage.test.ts`
**Produces:** `interface StorageDriver { save(key, buf, mime): Promise<void>; read(key): Promise<{ stream, ... }> | getDownloadUrl? }`
(final: `save`, `getStream`), `createStorage(env)`.
- [ ] Tests: local driver round-trips a buffer in a temp dir and rejects path traversal keys. Run → fail.
- [ ] Implement local, memory, S3 (`PutObject`/`GetObject`). Run → pass. Commit.

### Task 5: Borrower profile + BRE endpoint + slip upload
**Files:** `src/models/BorrowerProfile.ts`, `src/modules/borrower/{borrower.routes,borrower.service,borrower.schemas}.ts`,
`src/lib/fileSignature.ts`, `tests/borrower.test.ts`
- [ ] Tests: PUT profile passing → 200 `bre.passed`; failing → 422 listing every failed rule and persisted;
  invalid body 400; staff role → 403. Upload before BRE pass → 409; PDF/PNG/JPG accepted (201); `.txt` or fake
  PDF (wrong magic bytes) → 400; > 5 MB → 413. Run → fail.
- [ ] Implement. Run → pass. Commit.

### Task 6: Loan application
**Files:** `src/models/Loan.ts`, `src/modules/borrower/loan.service.ts` (+routes), `src/lib/serializers.ts`, `tests/loanApply.test.ts`
- [ ] Tests: apply → 201 APPLIED with server-computed SI/total in rupees; out-of-range principal/tenure 400;
  no slip → 409; failed BRE → 409; second open loan → 409; GET own loans only. Run → fail.
- [ ] Implement. Run → pass. Commit.

### Task 7: Sales, Sanction, Disbursement modules + slip download
**Files:** `src/modules/{sales,sanction,disbursement}/*.ts`, `src/modules/loans/loans.routes.ts`, `tests/{sales,sanction,disbursement}.test.ts`
- [ ] Tests: leads list excludes borrowers with loans and shows stage; approve APPLIED → SANCTIONED with history;
  reject requires reason; approving twice → 409; disburse only SANCTIONED; each route 403 for other executive
  roles and 200 for ADMIN; slip download for owner and staff, 403 for another borrower. Run → fail.
- [ ] Implement. Run → pass. Commit.

### Task 8: Collection + auto-close
**Files:** `src/models/Payment.ts`, `src/modules/collection/*.ts`, `tests/collection.test.ts`, `tests/lifecycle.test.ts`
- [ ] Tests: payment on non-DISBURSED loan 409; amount ≤ 0, 3 decimals, > outstanding → 400; duplicate UTR
  (case-insensitive) 409; future date 400; partial payment reduces outstanding; exact final payment → CLOSED
  with closedAt; full lifecycle register → close in one test. Run → fail.
- [ ] Implement with conditional `$inc` + compensation on failure. Run → pass. Commit.

### Task 9: Seed script
**Files:** `src/scripts/seed.ts`, `tests/seed.test.ts`
- [ ] Test: running seed twice yields exactly one user per role, login works. Implement. Commit.

### Task 10: Frontend scaffold, API client, auth pages, route guard
**Files:** `frontend/` (create-next-app), `next.config.ts` rewrite, `src/lib/{api,session,rbac}.ts`,
`src/proxy.ts`, `src/app/{login,register}/page.tsx`, `tests/rbac.test.ts`
- [ ] Tests: `allowedModules(role)`, `homePathFor(role)`, `canAccessPath(role, path)`. Implement. Commit.

### Task 11: Borrower portal
**Files:** `src/lib/{loanMath,bre}.ts`, `src/components/apply/*`, `src/app/apply/page.tsx`, tests for loanMath/bre/calculator
- [ ] Tests: client math matches server examples; calculator panel updates when sliders change. Implement
  stepper (details → slip → configure → status). Commit.

### Task 12: Operations dashboard
**Files:** `src/app/dashboard/{layout,page}.tsx`, `src/app/dashboard/{sales,sanction,disbursement,collection}/page.tsx`, `src/components/dashboard/*`
- [ ] Implement tables/cards, approve/reject modal with reason, disburse action, payment form with
  outstanding display and error messages. Verify in browser with each seeded role. Commit.

### Task 13: Docs + hygiene + end-to-end verification
**Files:** `README.md`, `docker-compose.yml`, root `package.json` scripts, `.gitignore`s
- [ ] Run all tests, typecheck and lint both apps; run the full flow in the browser (BRE fail + pass →
  approve → disburse → payments → CLOSED); check 403 by calling a forbidden API with another role. Commit.
