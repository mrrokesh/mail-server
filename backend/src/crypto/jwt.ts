import crypto from 'node:crypto';
import type { OrgRole } from '../store/types';
import { ApiError } from '../errors';

export interface AccessClaims {
  sub: string;
  org: string;
  role: OrgRole;
  email: string;
  scope: 'session' | 'mfa_enroll';
}

interface JwtPayload extends AccessClaims {
  iat: number;
  exp: number;
  iss: 'mrrokesh-mail';
}

function b64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function signAccess(
  claims: AccessClaims,
  secret: string,
  ttlSec: number,
  now: Date,
): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const iat = Math.floor(now.getTime() / 1000);
  const payload = b64url(
    JSON.stringify({
      ...claims,
      iat,
      exp: iat + ttlSec,
      iss: 'mrrokesh-mail',
    } satisfies JwtPayload),
  );
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAccess(token: string, secret: string, now: Date): AccessClaims {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  const data = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  let body: JwtPayload;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtPayload;
  } catch {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  if (body.iss !== 'mrrokesh-mail' || typeof body.exp !== 'number') {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  if (body.exp <= Math.floor(now.getTime() / 1000)) {
    throw new ApiError('API-AUTH-002', { reason: 'expired' });
  }
  if (!body.sub || !body.org || !body.role || !body.email || !body.scope) {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  return {
    sub: body.sub,
    org: body.org,
    role: body.role,
    email: body.email,
    scope: body.scope,
  };
}
