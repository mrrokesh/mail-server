import type { ErrorCode, PlanTier } from '@mrrokesh/shared';
import { PLAN_TIERS } from '@mrrokesh/shared';
import { ApiProblem, writeOrFallback } from '../../lib/api';
import { parseAuth, type AuthResult, type AuthUser } from '../../lib/schemas';
import type { SessionUser } from '../../lib/session';

function previewAuth(user: AuthUser): AuthResult {
  return { accessToken: 'preview', user };
}

export async function requestSignIn(input: {
  email: string;
  password: string;
}): Promise<{ user: SessionUser; accessToken: string | null }> {
  try {
    const result = await writeOrFallback(
      '/auth/sign-in',
      { method: 'POST', body: JSON.stringify(input) },
      parseAuth,
      () =>
        previewAuth({
          id: 'preview-user',
          name: labelFromEmail(input.email),
          email: input.email,
          organization: 'Preview workspace',
          plan: 'business',
          role: 'Owner',
        }),
    );
    if (result.source === 'preview' || result.data.accessToken === 'preview') {
      return { user: { ...result.data.user, preview: true }, accessToken: null };
    }
    return { user: { ...result.data.user, preview: false }, accessToken: result.data.accessToken };
  } catch (error) {
    if (error instanceof ApiProblem) throw error;
    throw new ApiProblem('API-SRV-500', 500);
  }
}

export async function requestSignUp(input: {
  name: string;
  email: string;
  password: string;
  organization: string;
  plan: PlanTier;
}): Promise<{ user: SessionUser; accessToken: string | null }> {
  const result = await writeOrFallback(
    '/auth/sign-up',
    { method: 'POST', body: JSON.stringify(input) },
    parseAuth,
    () =>
      previewAuth({
        id: 'preview-user',
        name: input.name,
        email: input.email,
        organization: input.organization,
        plan: input.plan,
        role: 'Owner',
      }),
  );
  if (result.source === 'preview' || result.data.accessToken === 'preview') {
    return { user: { ...result.data.user, preview: true }, accessToken: null };
  }
  return { user: { ...result.data.user, preview: false }, accessToken: result.data.accessToken };
}

export async function requestPasswordReset(email: string): Promise<'live' | 'preview'> {
  const result = await writeOrFallback(
    '/auth/password-resets',
    { method: 'POST', body: JSON.stringify({ email }) },
    (input) => (input && typeof input === 'object' ? input : null),
    () => ({ accepted: true }),
  );
  return result.source;
}

export function isPlan(value: string | null): value is PlanTier {
  return Boolean(value && (PLAN_TIERS as readonly string[]).includes(value));
}

export function labelFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'Owner';
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Owner';
  return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1);
}

export function problemCode(error: unknown): ErrorCode {
  return error instanceof ApiProblem ? error.code : 'API-SRV-500';
}
