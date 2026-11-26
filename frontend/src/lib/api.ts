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

async function request(path: string, init?: RequestInit, timeoutMs = 4000): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
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
 * Live-only read. The `fallback` argument is ignored — preview/sample data is
 * never invented when the API is down or returns an unexpected body.
 */
export async function readOrFallback<T>(
  path: string,
  parse: (input: unknown) => T | null,
  _fallback?: T,
): Promise<T> {
  void _fallback;
  if ((await probe()) === 'down') throw new ApiProblem('API-SRV-503', 503);
  return readLive(path, parse);
}

export async function readLive<T>(path: string, parse: (input: unknown) => T | null): Promise<T> {
  const parsed = parse(await request(path));
  if (parsed == null) throw new ApiProblem('API-SRV-500', 500);
  noteSource('live');
  return parsed;
}

export async function writeLive<T>(
  path: string,
  init: RequestInit,
  parse: (input: unknown) => T | null,
): Promise<{ data: T; source: 'live' }> {
  const parsed = parse(await request(path, init, 20000));
  if (parsed == null) throw new ApiProblem('API-SRV-500', 500);
  noteSource('live');
  return { data: parsed, source: 'live' };
}

/**
 * Live-only write. The `fallback` factory is ignored — never invent success.
 */
export async function writeOrFallback<T>(
  path: string,
  init: RequestInit,
  parse: (input: unknown) => T | null,
  _fallback?: () => T,
): Promise<{ data: T; source: 'live' }> {
  void _fallback;
  if ((await probe()) === 'down') throw new ApiProblem('API-SRV-503', 503);
  return writeLive(path, init, parse);
}
