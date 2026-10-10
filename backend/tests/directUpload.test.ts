import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BorrowerProfile } from '../src/models/BorrowerProfile';
import { createMemoryStorage } from '../src/storage/memoryStorage';
import { PDF_BYTES, PNG_BYTES, validProfile } from './fixtures';
import { buildTestApp, loginAs } from './helpers';

const MB = 1024 * 1024;
const directStorage = createMemoryStorage({ direct: true });
const app = buildTestApp(directStorage);

async function eligibleBorrower(target = app) {
  const session = await loginAs(target, 'BORROWER');
  await request(target).put('/api/borrower/profile').set('Cookie', session.cookie).send(validProfile).expect(200);
  return session;
}

const start = (cookie: string, body: Record<string, unknown>, target = app) =>
  request(target).post('/api/borrower/salary-slip/direct-upload').set('Cookie', cookie).send(body);
const complete = (cookie: string, body: Record<string, unknown>) =>
  request(app).post('/api/borrower/salary-slip/direct-upload/complete').set('Cookie', cookie).send(body);

describe('direct-to-storage salary slip upload', () => {
  it('tells the client to use the normal multipart upload when storage has no direct uploads (local disk)', async () => {
    const localLike = buildTestApp(createMemoryStorage());
    const { cookie } = await eligibleBorrower(localLike);
    const res = await start(cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 1000 }, localLike);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ direct: false });
  });

  it('issues an upload target under the borrower’s own prefix', async () => {
    const { cookie, user } = await eligibleBorrower();
    const res = await start(cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 1000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ direct: true, url: expect.any(String), fields: expect.any(Object) });
    expect(res.body.key).toMatch(new RegExp(`^salary-slips/${user._id}/[0-9a-f-]{36}\\.pdf$`));
  });

  it('refuses unsupported types and files over 5 MB before issuing anything', async () => {
    const { cookie } = await eligibleBorrower();
    expect((await start(cookie, { fileName: 'a.txt', contentType: 'text/plain', size: 10 })).status).toBe(400);
    expect((await start(cookie, { fileName: 'a.pdf', contentType: 'application/pdf', size: 5 * MB + 1 })).status).toBe(413);
    expect((await start(cookie, { fileName: 'a.pdf', contentType: 'application/pdf', size: 0 })).status).toBe(400);
  });

  it('requires a passed BRE', async () => {
    const { cookie } = await loginAs(app, 'BORROWER');
    const res = await start(cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 1000 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BRE_NOT_PASSED');
  });

  it('links an uploaded file up to 5 MB after checking it really is that type', async () => {
    const { cookie, user } = await eligibleBorrower();
    const big = Buffer.concat([PDF_BYTES, Buffer.alloc(Math.floor(4.9 * MB))]);
    const { body } = await start(cookie, { fileName: 'payslip sept.pdf', contentType: 'application/pdf', size: big.length });
    directStorage.files.set(body.key, big); // the browser's upload to storage

    const res = await complete(cookie, { key: body.key, fileName: 'payslip sept.pdf' });
    expect(res.status).toBe(201);
    expect(res.body.stage).toBe('SLIP_UPLOADED');
    expect(res.body.profile.salarySlip).toMatchObject({ originalName: 'payslip sept.pdf', mimeType: 'application/pdf', size: big.length });
    const stored = await BorrowerProfile.findOne({ user: user._id });
    expect(stored!.salarySlip!.storageKey).toBe(body.key);
  });

  it('accepts images too', async () => {
    const { cookie } = await eligibleBorrower();
    const { body } = await start(cookie, { fileName: 'slip.png', contentType: 'image/png', size: PNG_BYTES.length });
    directStorage.files.set(body.key, PNG_BYTES);
    expect((await complete(cookie, { key: body.key, fileName: 'slip.png' })).status).toBe(201);
  });

  it('rejects a key that belongs to someone else or was never uploaded', async () => {
    const a = await eligibleBorrower();
    const b = await eligibleBorrower();
    const { body } = await start(a.cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: PDF_BYTES.length });
    directStorage.files.set(body.key, PDF_BYTES);

    expect((await complete(b.cookie, { key: body.key, fileName: 'slip.pdf' })).status).toBe(400);
    expect((await complete(a.cookie, { key: '../../etc/passwd', fileName: 'x.pdf' })).status).toBe(400);

    const missing = await start(a.cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 100 });
    const res = await complete(a.cookie, { key: missing.body.key, fileName: 'slip.pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UPLOAD_NOT_FOUND');
  });

  it('deletes an uploaded file whose content does not match its type', async () => {
    const { cookie } = await eligibleBorrower();
    const { body } = await start(cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 20 });
    directStorage.files.set(body.key, Buffer.from('this is not a pdf..'));

    const res = await complete(cookie, { key: body.key, fileName: 'slip.pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
    expect(directStorage.files.has(body.key)).toBe(false);
  });

  it('deletes an uploaded file that is larger than 5 MB', async () => {
    const { cookie } = await eligibleBorrower();
    const { body } = await start(cookie, { fileName: 'slip.pdf', contentType: 'application/pdf', size: 100 });
    directStorage.files.set(body.key, Buffer.concat([PDF_BYTES, Buffer.alloc(5 * MB)]));

    const res = await complete(cookie, { key: body.key, fileName: 'slip.pdf' });
    expect(res.status).toBe(413);
    expect(directStorage.files.has(body.key)).toBe(false);
  });
});
