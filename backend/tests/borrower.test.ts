import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BorrowerProfile } from '../src/models/BorrowerProfile';
import { createMemoryStorage } from '../src/storage/memoryStorage';
import { JPG_BYTES, PDF_BYTES, PNG_BYTES, validProfile } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const storage = createMemoryStorage();
const app = buildTestApp(storage);

describe('borrower profile + BRE', () => {
  it('starts with no profile at the DETAILS stage', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app).get('/api/borrower/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profile: null, stage: 'REGISTERED' });
  });

  it('saves details, normalises PAN and passes BRE', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app).put('/api/borrower/profile').set('Cookie', cookie).send(validProfile);

    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('DETAILS_SUBMITTED');
    expect(res.body.profile).toMatchObject({
      fullName: 'Asha Rao',
      pan: 'ABCPE1234F',
      dateOfBirth: '1995-05-20',
      monthlySalary: 60000,
      employmentMode: 'SALARIED',
      bre: { passed: true, failures: [] },
      salarySlip: null,
    });
  });

  it('returns 422 with every failed rule and stores the rejection', async () => {
    const { cookie, user } = await loginAs(app, 'BORROWER');
    const res = await request(app)
      .put('/api/borrower/profile')
      .set('Cookie', cookie)
      .send({ ...validProfile, pan: 'ABCDE1234F', monthlySalary: 20000, employmentMode: 'UNEMPLOYED' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BRE_REJECTED');
    expect(res.body.error.details.map((f: { rule: string }) => f.rule)).toEqual(['SALARY', 'PAN', 'EMPLOYMENT']);

    const stored = await BorrowerProfile.findOne({ user: user._id });
    expect(stored!.bre!.passed).toBe(false);
  });

  it.each([
    ['missing full name', { fullName: '' }],
    ['invalid date', { dateOfBirth: '1995-13-40' }],
    ['date in the future', { dateOfBirth: '2999-01-01' }],
    ['negative salary', { monthlySalary: -5 }],
    ['unknown employment mode', { employmentMode: 'STUDENT' }],
  ])('rejects %s with 400', async (_label, patch) => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app).put('/api/borrower/profile').set('Cookie', cookie).send({ ...validProfile, ...patch });
    expect(res.status).toBe(400);
  });

  it('is borrower-only: staff get 403, anonymous get 401', async () => {
    const { cookie } = await loginAs(app, 'ADMIN');
    expect((await request(app).get('/api/borrower/profile').set('Cookie', cookie)).status).toBe(403);
    expect((await request(app).get('/api/borrower/profile')).status).toBe(401);
  });
});

describe('salary slip upload', () => {
  async function borrowerWithDetails() {
    const session = await loginAs(app, 'BORROWER');
    await request(app).put('/api/borrower/profile').set('Cookie', session.cookie).send(validProfile).expect(200);
    return session;
  }

  it.each([
    ['PDF', PDF_BYTES, 'slip.pdf', 'application/pdf'],
    ['PNG', PNG_BYTES, 'slip.png', 'image/png'],
    ['JPG', JPG_BYTES, 'slip.jpg', 'image/jpeg'],
  ])('accepts a %s and links it to the profile', async (_label, bytes, filename, contentType) => {
    const { cookie, user } = await borrowerWithDetails();
    const res = await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', cookie)
      .attach('file', bytes, { filename, contentType });

    expect(res.status).toBe(201);
    expect(res.body.stage).toBe('SLIP_UPLOADED');
    expect(res.body.profile.salarySlip).toMatchObject({ originalName: filename, mimeType: contentType, size: bytes.length });

    const stored = await BorrowerProfile.findOne({ user: user._id });
    expect(storage.files.get(stored!.salarySlip!.storageKey)).toEqual(bytes);
  });

  it('requires a passed BRE first', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', cookie)
      .attach('file', PDF_BYTES, { filename: 'slip.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BRE_NOT_PASSED');
  });

  it('rejects unsupported types and files whose content does not match the type', async () => {
    const { cookie } = await borrowerWithDetails();
    const txt = await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('hello'), { filename: 'slip.txt', contentType: 'text/plain' });
    expect(txt.status).toBe(400);
    expect(txt.body.error.code).toBe('UNSUPPORTED_FILE');

    const fakePdf = await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('not really a pdf'), { filename: 'slip.pdf', contentType: 'application/pdf' });
    expect(fakePdf.status).toBe(400);
    expect(fakePdf.body.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('rejects files over 5 MB with 413', async () => {
    const { cookie } = await borrowerWithDetails();
    const big = Buffer.concat([PDF_BYTES, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await request(app)
      .post('/api/borrower/salary-slip')
      .set('Cookie', cookie)
      .attach('file', big, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
  });

  it('returns 400 when no file is sent', async () => {
    const { cookie } = await borrowerWithDetails();
    expect((await request(app).post('/api/borrower/salary-slip').set('Cookie', cookie)).status).toBe(400);
  });
});
