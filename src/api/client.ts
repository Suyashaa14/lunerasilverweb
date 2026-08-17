const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handle(res: Response) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export function apiGet(path: string) {
  return fetch(`${API_URL}${path}`, { credentials: 'include' }).then(handle);
}

export function apiPost(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPatch(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then(handle);
}

export function apiPut(path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiDelete(path: string) {
  return fetch(`${API_URL}${path}`, { method: 'DELETE', credentials: 'include' }).then(handle);
}

export function apiUpload(path: string, method: 'POST' | 'PUT', formData: FormData) {
  return fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    body: formData,
  }).then(handle);
}
