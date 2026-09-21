const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// Auth is mounted at the server root rather than under /api, so it never passes
// through the gate that rejects untokened requests.
const AUTH_URL = import.meta.env.VITE_AUTH_URL || `${API_URL.replace(/\/api\/?$/, '')}/auth`;

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

  const request = fetch(`${API_URL}${path}`, { headers: withAuth() })
    .then(handle)
    .finally(() => inFlightGets.delete(path));

  inFlightGets.set(path, request);
  return request;
}

export function apiPost(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: withAuth(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPatch(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiPut(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: withAuth(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiDelete(path: string) {
  return fetch(`${API_URL}${path}`, { method: 'DELETE', headers: withAuth() }).then(handle);
}

export function apiUpload(path: string, method: 'POST' | 'PUT', formData: FormData) {
  // No Content-Type here on purpose: the browser sets the multipart boundary.
  return fetch(`${API_URL}${path}`, {
    method,
    headers: withAuth(),
    body: formData,
  }).then(handle);
}

// Login / signup / logout live at the base level, outside /api.
export function authPost(path: string, body?: unknown) {
  return fetch(`${AUTH_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}
