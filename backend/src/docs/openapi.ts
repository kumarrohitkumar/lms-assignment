/** OpenAPI 3.1 description of the API, served at /api/openapi.json and rendered at /api/docs. */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const body = (schema: object, required = true) => ({ required, content: json(schema) });
const ok = (description: string, schema?: object) => (schema ? { description, content: json(schema) } : { description });
const err = (description: string) => ({ description, content: json(ref('Error')) });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId' };
const qParam = { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search by applicant name, PAN, or borrower name/email' };

const E401 = err('Not logged in');
const E403 = err('Your role cannot use this endpoint');
const E404 = err('Not found');
const E409 = err('Conflict: the loan is not at this stage, or a duplicate');
const E400 = err('Validation failed; `details` lists the fields');

const loans = (description: string) => ok(description, { type: 'object', properties: { loans: { type: 'array', items: ref('Loan') } } });
const loan = (description: string) => ok(description, { type: 'object', properties: { loan: ref('Loan') } });
const profileView = (description: string) => ok(description, ref('ProfileView'));
const staff = (tag: string) => ({ tags: [tag], security: [{ cookieAuth: [] }, { bearerAuth: [] }] });

const rejectBody = (categories: string[]) =>
  body({
    type: 'object',
    properties: {
      category: { type: 'string', enum: categories },
      note: { type: 'string', maxLength: 500, description: 'Shown to the borrower. Required when category is OTHER.' },
      reason: { type: 'string', description: 'Legacy form: treated as category OTHER with this note.' },
    },
  });

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Kosh Loan Management API',
    version: '1.0.0',
    description:
      'Borrowers apply for loans; staff move them through APPLIED → SANCTIONED → DISBURSED → CLOSED (or REJECTED). ' +
      'Money is in rupees with at most 2 decimals. Log in with POST /api/auth/login (seeded accounts use Password@123); ' +
      'the session cookie is then sent automatically from this page.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth' },
    { name: 'Borrower', description: 'BORROWER role' },
    { name: 'Loans', description: 'Loan records, history and documents' },
    { name: 'Sales', description: 'SALES and ADMIN' },
    { name: 'Sanction', description: 'SANCTION and ADMIN' },
    { name: 'Disbursement', description: 'DISBURSEMENT and ADMIN' },
    { name: 'Collection', description: 'COLLECTION and ADMIN' },
    { name: 'Admin', description: 'ADMIN only' },
    { name: 'System' },
  ],
  paths: {
    '/api/health': { get: { tags: ['System'], summary: 'Health check', responses: { 200: ok('OK', { type: 'object', properties: { status: { const: 'ok' } } }) } } },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Sign up as a borrower',
        requestBody: body({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } } }),
        responses: { 201: ok('Signed up; session cookie set', ref('Session')), 400: E400, 409: err('Email already registered'), 429: err('Too many attempts') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: body({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'admin@lms.dev' }, password: { type: 'string', example: 'Password@123' } } }),
        responses: { 200: ok('Logged in; session cookie set', ref('Session')), 401: err('Wrong email or password'), 429: err('Too many failed attempts') },
      },
    },
    '/api/auth/logout': { post: { tags: ['Auth'], summary: 'Log out (clears the cookie)', responses: { 204: ok('Logged out') } } },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: [{ cookieAuth: [] }, { bearerAuth: [] }], responses: { 200: ok('User', { type: 'object', properties: { user: ref('User') } }), 401: E401 } } },

    '/api/borrower/profile': {
      get: { tags: ['Borrower'], summary: 'My details and application stage', responses: { 200: profileView('Profile and stage'), 401: E401, 403: E403 } },
      put: {
        tags: ['Borrower'],
        summary: 'Save personal details and run the eligibility check (BRE)',
        requestBody: body(ref('ProfileInput')),
        responses: { 200: profileView('Eligible'), 400: E400, 409: err('A loan is already in progress'), 422: err('Not eligible: `details` lists every failed rule') },
      },
    },
    '/api/borrower/salary-slip': {
      post: {
        tags: ['Borrower'],
        summary: 'Upload the salary slip through the API (PDF/JPG/PNG, ≤ 5 MB)',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { 201: profileView('Uploaded'), 400: err('Wrong type or content'), 409: err('Eligibility not passed'), 413: err('Over 5 MB') },
      },
    },
    '/api/borrower/salary-slip/direct-upload': {
      post: {
        tags: ['Borrower'],
        summary: 'Start a browser-to-storage upload (S3 storage only)',
        requestBody: body({ type: 'object', required: ['fileName', 'contentType', 'size'], properties: { fileName: { type: 'string' }, contentType: { type: 'string', enum: ['application/pdf', 'image/png', 'image/jpeg'] }, size: { type: 'integer' } } }),
        responses: {
          200: ok('`{ direct: false }` with local storage, otherwise a presigned form', { type: 'object', properties: { direct: { type: 'boolean' }, key: { type: 'string' }, url: { type: 'string' }, fields: { type: 'object' } } }),
          400: err('Unsupported type'),
          409: err('Eligibility not passed'),
          413: err('Over 5 MB'),
        },
      },
    },
    '/api/borrower/salary-slip/direct-upload/complete': {
      post: {
        tags: ['Borrower'],
        summary: 'Verify a direct upload (size and file signature) and link it',
        requestBody: body({ type: 'object', required: ['key', 'fileName'], properties: { key: { type: 'string' }, fileName: { type: 'string' } } }),
        responses: { 201: profileView('Linked'), 400: err('Unknown key, not uploaded, or wrong content'), 413: err('Over 5 MB') },
      },
    },
    '/api/borrower/loans': {
      get: { tags: ['Borrower'], summary: 'My loans, newest first', responses: { 200: loans('Loans'), 401: E401, 403: E403 } },
      post: {
        tags: ['Borrower'],
        summary: 'Apply for a loan (interest is computed by the server)',
        requestBody: body({ type: 'object', required: ['principal', 'tenureDays'], properties: { principal: { type: 'number', minimum: 50000, maximum: 500000 }, tenureDays: { type: 'integer', minimum: 30, maximum: 365 } } }),
        responses: { 201: loan('Created with status APPLIED'), 400: E400, 409: err('Eligibility not passed, no slip, or a loan already in progress') },
      },
    },

    '/api/loans': {
      get: {
        ...staff('Admin'),
        summary: 'All loans (admin history)',
        parameters: [
          { name: 'status', in: 'query', schema: ref('LoanStatus') },
          qParam,
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: ok('A page of loans', { type: 'object', properties: { loans: { type: 'array', items: ref('Loan') }, total: { type: 'integer' }, page: { type: 'integer' }, pageSize: { type: 'integer' } } }), 403: E403 },
      },
    },
    '/api/loans/{id}': {
      get: {
        ...staff('Loans'),
        summary: 'One loan with its full timeline and payments (owner or loan-handling staff)',
        parameters: [idParam],
        responses: { 200: ok('Loan detail', { type: 'object', properties: { loan: ref('Loan'), timeline: { type: 'array', items: ref('TimelineEvent') }, payments: { type: 'array', items: ref('Payment') } } }), 403: E403, 404: E404 },
      },
    },
    '/api/loans/{id}/salary-slip': {
      get: { ...staff('Loans'), summary: 'Download the salary slip', parameters: [idParam], responses: { 200: { description: 'The file' }, 403: E403, 404: E404 } },
    },

    '/api/sales/leads': {
      get: { ...staff('Sales'), summary: 'Registered borrowers who have not applied yet', responses: { 200: ok('Leads', { type: 'object', properties: { leads: { type: 'array', items: ref('Lead') } } }), 403: E403 } },
    },

    '/api/sanction/loans': { get: { ...staff('Sanction'), summary: 'Applications waiting for a decision (APPLIED)', parameters: [qParam], responses: { 200: loans('Queue'), 403: E403 } } },
    '/api/sanction/decisions': {
      get: {
        ...staff('Sanction'),
        summary: 'Applications already approved or rejected, newest first, with who decided, when and why',
        parameters: [qParam],
        responses: { 200: loans('Decided loans, each with a decision { outcome, at, by, reason, note, reference } and counts { approved, rejected }'), 403: E403 },
      },
    },
    '/api/sanction/loans/{id}/approve': {
      post: {
        ...staff('Sanction'),
        summary: 'Approve: APPLIED → SANCTIONED',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { remark: { type: 'string', maxLength: 500 } } }, false),
        responses: { 200: loan('Sanctioned'), 403: E403, 404: E404, 409: E409 },
      },
    },
    '/api/sanction/loans/{id}/reject': {
      post: {
        ...staff('Sanction'),
        summary: 'Reject with a reason: APPLIED → REJECTED',
        parameters: [idParam],
        requestBody: rejectBody(['INCOME_MISMATCH', 'SLIP_UNREADABLE', 'DOCUMENT_INVALID', 'EMPLOYMENT_UNVERIFIED', 'HIGH_RISK', 'OTHER']),
        responses: { 200: loan('Rejected'), 400: E400, 403: E403, 404: E404, 409: E409 },
      },
    },

    '/api/disbursement/loans': { get: { ...staff('Disbursement'), summary: 'Sanctioned loans ready to pay out', parameters: [qParam], responses: { 200: loans('Queue'), 403: E403 } } },
    '/api/disbursement/decisions': {
      get: {
        ...staff('Disbursement'),
        summary: 'Loans already paid out or stopped, newest first, with the bank reference or the reason',
        parameters: [qParam],
        responses: { 200: loans('Decided loans, each with a decision { outcome, at, by, reason, note, reference } and counts { approved, rejected }'), 403: E403 },
      },
    },
    '/api/disbursement/loans/{id}/disburse': {
      post: {
        ...staff('Disbursement'),
        summary: 'Mark as disbursed: SANCTIONED → DISBURSED',
        parameters: [idParam],
        requestBody: body({ type: 'object', required: ['reference'], properties: { reference: { type: 'string', pattern: '^[A-Za-z0-9]{6,30}$', description: 'Bank transfer reference' }, remark: { type: 'string' } } }),
        responses: { 200: loan('Disbursed'), 400: E400, 403: E403, 404: E404, 409: E409 },
      },
    },
    '/api/disbursement/loans/{id}/reject': {
      post: {
        ...staff('Disbursement'),
        summary: 'Stop a sanctioned loan with a reason: SANCTIONED → REJECTED',
        parameters: [idParam],
        requestBody: rejectBody(['BANK_DETAILS', 'KYC', 'BORROWER_WITHDREW', 'OTHER']),
        responses: { 200: loan('Rejected'), 400: E400, 403: E403, 404: E404, 409: E409 },
      },
    },

    '/api/collection/loans': {
      get: {
        ...staff('Collection'),
        summary: 'Active loans (overdue first), or closed loans with view=closed',
        parameters: [{ name: 'view', in: 'query', schema: { type: 'string', enum: ['active', 'closed'] } }, qParam],
        responses: { 200: loans('Loans'), 403: E403 },
      },
    },
    '/api/collection/loans/{id}/payments': {
      get: { ...staff('Collection'), summary: 'Payment history for a loan', parameters: [idParam], responses: { 200: ok('Loan and payments', { type: 'object', properties: { loan: ref('Loan'), payments: { type: 'array', items: ref('Payment') } } }), 404: E404 } },
      post: {
        ...staff('Collection'),
        summary: 'Record a payment; the loan closes automatically when fully paid',
        parameters: [idParam],
        requestBody: body({ type: 'object', required: ['utr', 'amount', 'paymentDate'], properties: { utr: { type: 'string', pattern: '^[A-Za-z0-9]{8,30}$' }, amount: { type: 'number', exclusiveMinimum: 0 }, paymentDate: { type: 'string', format: 'date' } } }),
        responses: {
          201: ok('Recorded', { type: 'object', properties: { loan: ref('Loan'), payment: ref('Payment') } }),
          400: err('Invalid amount or date, or above the outstanding balance'),
          409: err('Duplicate UTR, or the loan is not active'),
        },
      },
    },
    '/api/collection/payments/{id}/reverse': {
      post: {
        ...staff('Collection'),
        summary: 'Reverse a payment with a reason (reopens a loan it had closed)',
        parameters: [idParam],
        requestBody: body({ type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 3 } } }),
        responses: { 200: ok('Reversed', { type: 'object', properties: { loan: ref('Loan'), payment: ref('Payment') } }), 400: E400, 404: E404, 409: err('Already reversed') },
      },
    },

    '/api/decisions/rejection-categories': {
      get: { ...staff('Loans'), summary: 'Rejection reasons for each stage', responses: { 200: ok('Categories by stage', { type: 'object', additionalProperties: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' }, label: { type: 'string' } } } } }) } },
    },
    '/api/admin/overview': {
      get: { ...staff('Admin'), summary: 'Portfolio summary: loans by stage, money totals, overdue', responses: { 200: ok('Overview', ref('Overview')), 403: E403 } },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'lms_token', description: 'Set by login/register (httpOnly)' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'The token returned by login' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } } } },
      Role: { type: 'string', enum: ['ADMIN', 'SALES', 'SANCTION', 'DISBURSEMENT', 'COLLECTION', 'BORROWER'] },
      LoanStatus: { type: 'string', enum: ['APPLIED', 'SANCTIONED', 'REJECTED', 'DISBURSED', 'CLOSED'] },
      User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: ref('Role'), createdAt: { type: ['string', 'null'], format: 'date-time' }, lastLoginAt: { type: ['string', 'null'], format: 'date-time' } } },
      Session: { type: 'object', properties: { user: ref('User'), token: { type: 'string' } } },
      ProfileInput: {
        type: 'object',
        required: ['fullName', 'pan', 'dateOfBirth', 'monthlySalary', 'employmentMode'],
        properties: {
          fullName: { type: 'string' },
          pan: { type: 'string', example: 'ABCPE1234F' },
          dateOfBirth: { type: 'string', format: 'date' },
          monthlySalary: { type: 'number' },
          employmentMode: { type: 'string', enum: ['SALARIED', 'SELF_EMPLOYED', 'UNEMPLOYED'] },
        },
      },
      ProfileView: { type: 'object', properties: { profile: { type: ['object', 'null'] }, stage: { type: 'string', enum: ['REGISTERED', 'BRE_FAILED', 'DETAILS_SUBMITTED', 'SLIP_UPLOADED'] } } },
      EligibilityCheck: { type: 'object', properties: { rule: { type: 'string' }, label: { type: 'string' }, passed: { type: 'boolean' }, detail: { type: 'string' } } },
      Loan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: ref('LoanStatus'),
          borrower: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } },
          applicant: { type: 'object' },
          principal: { type: 'number' },
          tenureDays: { type: 'integer' },
          interestRatePa: { type: 'number', const: 12 },
          simpleInterest: { type: 'number' },
          totalRepayment: { type: 'number' },
          amountPaid: { type: 'number' },
          outstanding: { type: 'number' },
          eligibility: { type: 'array', items: ref('EligibilityCheck') },
          rejection: { type: ['object', 'null'], properties: { stage: { type: 'string' }, category: { type: 'string' }, categoryLabel: { type: 'string' }, note: { type: ['string', 'null'] } } },
          disbursement: { type: ['object', 'null'], properties: { reference: { type: 'string' }, remark: { type: ['string', 'null'] } } },
          dueDate: { type: ['string', 'null'], format: 'date' },
          daysToDue: { type: ['integer', 'null'] },
          overdue: { type: 'boolean' },
          statusHistory: { type: 'array', items: { type: 'object' } },
        },
      },
      Payment: {
        type: 'object',
        properties: { id: { type: 'string' }, utr: { type: 'string' }, amount: { type: 'number' }, paymentDate: { type: 'string', format: 'date' }, status: { type: 'string', enum: ['RECEIVED', 'REVERSED'] }, reversal: { type: ['object', 'null'] } },
      },
      TimelineEvent: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['STATUS', 'PAYMENT', 'REVERSAL'] },
          at: { type: 'string', format: 'date-time' },
          from: { type: ['string', 'null'] },
          to: { type: 'string' },
          utr: { type: 'string' },
          amount: { type: 'number' },
          note: { type: ['string', 'null'] },
          actor: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } },
        },
      },
      Lead: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, stage: { type: 'string' }, registeredAt: { type: 'string', format: 'date-time' } } },
      Overview: {
        type: 'object',
        properties: {
          counts: { type: 'object', additionalProperties: { type: 'integer' } },
          leads: { type: 'integer' },
          borrowers: { type: 'integer' },
          overdue: { type: 'object', properties: { count: { type: 'integer' }, outstanding: { type: 'number' } } },
          money: { type: 'object', properties: { disbursed: { type: 'number' }, collected: { type: 'number' }, outstanding: { type: 'number' } } },
        },
      },
    },
  },
} as const;
