import { api, ApiError } from './api';
import type { ProfileResponse } from './types';

type DirectUploadOffer = { direct: false } | { direct: true; key: string; url: string; fields: Record<string, string> };

/**
 * Uploads a salary slip. When the API's storage supports it (S3), the browser sends the file straight
 * to storage with a short-lived signed form and the API then verifies it; this avoids hosting limits on
 * request size. With local storage it falls back to a normal multipart upload through the API.
 */
export async function uploadSalarySlip(file: File): Promise<ProfileResponse> {
  const offer = await api<DirectUploadOffer>('/borrower/salary-slip/direct-upload', {
    body: { fileName: file.name, contentType: file.type, size: file.size },
  });

  if (!offer.direct) {
    const body = new FormData();
    body.append('file', file);
    return api<ProfileResponse>('/borrower/salary-slip', { body });
  }

  const form = new FormData();
  Object.entries(offer.fields).forEach(([name, value]) => form.append(name, value));
  form.append('file', file); // must be the last field
  let stored: Response;
  try {
    stored = await fetch(offer.url, { method: 'POST', body: form, credentials: 'omit' });
  } catch {
    throw new ApiError(0, 'UPLOAD_FAILED', 'The upload did not go through. Check your connection and try again.');
  }
  if (!stored.ok) throw new ApiError(stored.status, 'UPLOAD_FAILED', 'The upload was rejected by storage. Try again.');

  return api<ProfileResponse>('/borrower/salary-slip/direct-upload/complete', {
    body: { key: offer.key, fileName: file.name },
  });
}
