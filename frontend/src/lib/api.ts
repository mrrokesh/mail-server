import { ERROR_CODES, healthResponseSchema, isErrorCode, type ErrorCode } from '@mrrokesh/shared';
import { noteSource, resetSource } from './data-source';

const TOKEN_KEY = 'mrrokesh.token';

export class ApiProblem extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly action: string;

  constructor(code: ErrorCode, httpStatus: number) {
    const spec = ERROR_CODES[code];
    super(spec.message || spec.meaning);
    this.name = 'ApiProblem';
    this.code = code;
    this.httpStatus = httpStatus;
    this.action = spec.action;
  }
}

let reachability: Promise<'up' | 'down'> | null = null;

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function resetApiCache() {
  reachability = null;
  resetSource();
}

function clientFault(status: number): boolean {
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 409 ||
    status === 413 ||
    status === 422 ||
    status === 429 ||
    status === 507
  );
}

async function probe(): Promise<'up' | 'down'> {
  if (!reachability) {
    reachability = (async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 800);
      try {
        const response = await fetch('/api/v1/health', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) return 'down';
        const payload: unknown = await response.json();
        return healthResponseSchema.safeParse(payload).success ? 'up' : 'down';
      } catch {
        return 'down';
      } finally {
        window.clearTimeout(timer);
      }
    })();
  }
  return reachability;
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const token = readToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`/api/v1${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const record =
        payload && typeof payload === 'object' ? (payload as { code?: unknown }) : undefined;
      const code =
        record && typeof record.code === 'string' && isErrorCode(record.code)
          ? record.code
          : 'API-SRV-500';
      throw new ApiProblem(code, response.status);
    }
    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Reads a `/api/v1` route. Network failure, a missing route, or an unexpected
 * body returns `fallback` and marks the session as preview data.
 * Auth and validation failures still throw `ApiProblem`.
 */
export async function readOrFallback<T>(
  path: string,
  parse: (input: unknown) => T | null,
  fallback: T,
): Promise<T> {
  if ((await probe()) === 'down') {
    noteSource('preview');
    return fallback;
  }
  try {
    const parsed = parse(await request(path));
    if (!parsed) {
      noteSource('preview');
      return fallback;
    }
    noteSource('live');
    return parsed;
  } catch (error) {
    if (error instanceof ApiProblem && clientFault(error.httpStatus)) throw error;
    noteSource('preview');
    return fallback;
  }
}

export async function writeOrFallback<T>(
  path: string,
  init: RequestInit,
  parse: (input: unknown) => T | null,
  fallback: () => T,
): Promise<{ data: T; source: 'live' | 'preview' }> {
  if ((await probe()) === 'down') {
    noteSource('preview');
    return { data: fallback(), source: 'preview' };
  }
  try {
    const parsed = parse(await request(path, init));
    if (!parsed) {
      noteSource('preview');
      return { data: fallback(), source: 'preview' };
    }
    noteSource('live');
    return { data: parsed, source: 'live' };
  } catch (error) {
    if (error instanceof ApiProblem && clientFault(error.httpStatus)) throw error;
    noteSource('preview');
    return { data: fallback(), source: 'preview' };
  }
}
