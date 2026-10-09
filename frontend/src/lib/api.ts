export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | FormData;

/** Calls the backend through the same-origin `/api` rewrite, so the httpOnly auth cookie is sent automatically. */
export async function api<T>(path: string, options: { method?: string; body?: Body } = {}): Promise<T> {
  const { method = options.body ? 'POST' : 'GET', body } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error;
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? `Request failed (${res.status})`, error?.details);
  }
  return data as T;
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
