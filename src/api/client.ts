// Base URL is the server origin only. Each call appends its own mount, so /api
// is never carried in configuration and cannot be left out of it. A trailing
// slash or a leftover /api suffix is stripped so the value cannot break the URL.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const TOKEN_KEY = 'lunera.token';

// localStorage throws in some privacy modes, so every access is guarded and the
// app degrades to "signed out" rather than crashing.
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function withAuth(headers?: Record<string, string>): Record<string, string> | undefined {
  const token = getToken();
  const merged = { ...(headers ?? {}) };
  if (token) merged.Authorization = `Bearer ${token}`;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

async function handle(res: Response) {
  if (res.status === 401) {
    // The token is missing, expired or rejected -- drop it so the next load
    // starts clean instead of retrying with a credential the server refuses.
    clearToken();
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Request failed (${res.status})`, res.status);
  }
  return data;
}

// Concurrent identical GETs share a single request. Two things make the same
// endpoint get asked for repeatedly in one tick: StrictMode runs effects twice
// in dev, and responsive layouts mount the same widget at both breakpoints.
// The entry is dropped as soon as the request settles, so this only ever merges
// genuinely overlapping calls -- a GET issued after a mutation still hits the network.
const inFlightGets = new Map<string, Promise<any>>();

export function apiGet(path: string) {
  const pending = inFlightGets.get(path);
  if (pending) return pending;

  const request = fetch(`${BASE_URL}/api${path}`, { headers: withAuth() })
    .then(handle)
    .finally(() => inFlightGets.delete(path));

  inFlightGets.set(path, request);
  return request;
}

export function apiPost(path: string, body?: unknown) {
  return fetch(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: withAuth(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPatch(path: string, body?: unknown) {
  return fetch(`${BASE_URL}/api${path}`, {
    method: 'PATCH',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiPut(path: string, body?: unknown) {
  return fetch(`${BASE_URL}/api${path}`, {
    method: 'PUT',
    headers: withAuth(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiDelete(path: string) {
  return fetch(`${BASE_URL}/api${path}`, { method: 'DELETE', headers: withAuth() }).then(handle);
}

export function apiUpload(path: string, method: 'POST' | 'PUT', formData: FormData) {
  // No Content-Type here on purpose: the browser sets the multipart boundary.
  return fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: withAuth(),
    body: formData,
  }).then(handle);
}

// Login / signup / logout live at the base level, outside /api.
export function authPost(path: string, body?: unknown) {
  return fetch(`${BASE_URL}/auth${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

/**
 * Downloads a file from an authenticated endpoint.
 *
 * A plain <a href> cannot carry the bearer token, so the browser would be sent
 * an unauthenticated request and get a 401 back as the "file". Fetch it
 * properly, then hand the blob to a temporary link.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api${path}`, { headers: withAuth() });

  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new ApiError(`Could not download (${res.status})`, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
