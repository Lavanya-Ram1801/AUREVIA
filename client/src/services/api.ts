/** Thin fetch wrapper. Cookies carry the session; the Vite dev proxy / same-origin deploy keeps them first-party. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined | null> } = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  const qs = params.toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }
  const json = (await res.json().catch(() => null)) as { data?: T; meta?: unknown; error?: { message?: string; details?: Record<string, string> } } | null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message ?? 'Something went wrong', typeof json?.error?.details === 'object' ? json.error.details : undefined);
  }
  // Paged endpoints return { data, meta }; others return { data }.
  return (json && 'meta' in json ? json : json?.data) as T;
}

export const get = <T>(p: string, query?: Record<string, string | number | undefined | null>) => api<T>(p, { query });
export const post = <T>(p: string, body?: unknown) => api<T>(p, { method: 'POST', body: body ?? {} });
export const patch = <T>(p: string, body: unknown) => api<T>(p, { method: 'PATCH', body });
export const del = <T>(p: string) => api<T>(p, { method: 'DELETE' });
