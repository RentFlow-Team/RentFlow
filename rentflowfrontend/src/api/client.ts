import { API_URL } from './config';
import { demoEnabled, demoForced, demoRequest } from './demo';

/** Error thrown for any non-2xx response or network failure. */
export class ApiError extends Error {
  /** HTTP status code, or 0 for a network-level failure. */
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Bearer token used for authenticated requests. The auth store keeps this in
 * sync so every request module can stay stateless. Held in memory only — it's
 * cleared on reload (see the auth store for the persistence follow-up).
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Once a request fails at the network level we remember the backend is down and
 * route every subsequent call straight to the demo data, so we don't pay a
 * connection timeout on each request.
 */
let backendUnreachable = false;

/**
 * How long to wait for the backend before treating it as unreachable.
 *
 * A refused connection rejects immediately, but a *dropped* one never does — a
 * firewall silently blocking port 8080, or the phone being on another network,
 * leaves `fetch` hanging until the OS-level TCP timeout (a minute or more).
 * That's the "app looks frozen" symptom demo mode exists to avoid, so we cap the
 * wait ourselves and let the fallback take over.
 */
const REQUEST_TIMEOUT_MS = 8000;

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Backend occasionally returns a plain-text error body.
    return text;
  }
}

function extractMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = record.error ?? record.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  if (typeof body === 'string' && body.length > 0) return body;
  return `Request failed with status ${status}`;
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  // Demo mode: skip the network when forced, or once we've learned the backend
  // is unreachable, and serve canned data so the app stays fully usable offline.
  if (demoForced || (demoEnabled && backendUnreachable)) {
    return demoRequest<T>(method, path, body);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  // Aborts the request if the backend doesn't respond in time; cleared as soon
  // as the headers arrive so a slow body read is never cut short.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // Genuine "can't reach the server" — refused, dropped, or timed out above.
    // Fall back to demo data if allowed, otherwise surface the network error.
    // Real HTTP errors below are never masked; only connection failures land here.
    if (demoEnabled) {
      backendUnreachable = true;
      return demoRequest<T>(method, path, body);
    }
    throw new ApiError(
      0,
      'Cannot reach the server. Check your connection and that the backend is running.',
    );
  } finally {
    clearTimeout(timeout);
  }

  const parsed = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(parsed, response.status));
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
