import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadSalarySlip } from '@/lib/upload';

const profileResponse = { profile: { salarySlip: { originalName: 'slip.pdf' } }, stage: 'SLIP_UPLOADED' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('uploadSalarySlip', () => {
  const file = new File(['%PDF-1.4 hello'], 'slip.pdf', { type: 'application/pdf' });

  it('uploads straight to storage when the API offers a direct target, then confirms it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ direct: true, key: 'salary-slips/u/k.pdf', url: 'https://bucket.s3.test/', fields: { key: 'salary-slips/u/k.pdf', Policy: 'p' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(profileResponse, 201));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadSalarySlip(file)).resolves.toEqual(profileResponse);

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/borrower/salary-slip/direct-upload');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ fileName: 'slip.pdf', contentType: 'application/pdf', size: file.size });

    const [s3Url, s3Init] = fetchMock.mock.calls[1]!;
    expect(s3Url).toBe('https://bucket.s3.test/');
    const form = s3Init.body as FormData;
    expect([...form.keys()]).toEqual(['key', 'Policy', 'file']); // S3 requires the file to be the last field
    expect(s3Init.credentials).toBe('omit');

    expect(fetchMock.mock.calls[2]![0]).toBe('/api/borrower/salary-slip/direct-upload/complete');
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ key: 'salary-slips/u/k.pdf', fileName: 'slip.pdf' });
  });

  it('falls back to a multipart upload through the API when storage is local', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ direct: false })).mockResolvedValueOnce(json(profileResponse, 201));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadSalarySlip(file)).resolves.toEqual(profileResponse);
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/borrower/salary-slip');
    expect((fetchMock.mock.calls[1]![1].body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('reports a failed storage upload clearly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ direct: true, key: 'k', url: 'https://bucket.s3.test/', fields: {} }))
      .mockResolvedValueOnce(new Response('<Error/>', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadSalarySlip(file)).rejects.toThrow(/upload/i);
  });
});
