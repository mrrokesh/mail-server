import { ERROR_CODES, isErrorCode } from '@mrrokesh/shared';
import { z } from 'zod';
import { apiBaseUrl } from './config';
import { clearStoredSession, readStoredSession, writeStoredSession } from './secure-session';

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().optional(),
});

export const ackSchema = z.union([z.null(), z.object({}).passthrough()]);

const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type FormMessage = {
  code: string | null;
  message: string;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: unknown;

  constructor(status: number, code: string | null, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

function messageFor(code: string, serverMessage: string): string {
  if (serverMessage.trim().length > 0) return serverMessage;
  if (isErrorCode(code) && ERROR_CODES[code].message.length > 0) {
    return ERROR_CODES[code].message;
  }
  return ERROR_CODES['API-SRV-500'].message;
}

function apiUrl(path: string): string {
  if (!path.startsWith('/api/v1/')) {
    throw new ApiClientError(0, null, 'This app only calls /api/v1.');
  }
  return `${apiBaseUrl()}${path}`;
}

export async function apiRequest<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth) {
    const session = await readStoredSession();
    if (!session || session.mode !== 'live') {
      throw new ApiClientError(401, 'API-AUTH-002', 'Sign in to continue.');
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      0,
      null,
      'The API could not be reached. Check that it is running, then try again.',
    );
  }

  if (response.status === 401 && options.auth && options.retry !== false) {
    const next = await refreshAccessToken();
    if (!next) {
      throw new ApiClientError(401, 'API-AUTH-002', 'Sign in to continue.');
    }
    return apiRequest(path, schema, { ...options, retry: false });
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ApiClientError(response.status, null, 'The API response was not valid JSON.');
    }
  }

  if (!response.ok) {
    const errorBody = errorBodySchema.safeParse(payload);
    if (errorBody.success) {
      throw new ApiClientError(
        response.status,
        errorBody.data.code,
        messageFor(errorBody.data.code, errorBody.data.message),
        errorBody.data.details,
      );
    }
    throw new ApiClientError(response.status, null, ERROR_CODES['API-SRV-500'].message);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(response.status, null, 'The API response did not match the app.');
  }
  return parsed.data;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const current = await readStoredSession();
    if (!current || current.mode !== 'live') return null;
    try {
      const next = await apiRequest('/api/v1/auth/refresh', tokenPairSchema, {
        method: 'POST',
        auth: false,
        retry: false,
        body: { refreshToken: current.refreshToken },
      });
      await writeStoredSession({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        mode: 'live',
        email: current.email,
      });
      return next.accessToken;
    } catch {
      await clearStoredSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function formatApiError(error: unknown): FormMessage {
  if (error instanceof ApiClientError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: ERROR_CODES['API-SRV-500'].code,
    message: ERROR_CODES['API-SRV-500'].message,
  };
}
