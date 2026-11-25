import { z } from 'zod';
import { ackSchema, apiRequest, tokenPairSchema } from '../../lib/api';

const mfaChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  challengeToken: z.string().min(1),
});

const sessionSchema = tokenPairSchema.extend({
  mfaRequired: z.literal(false).optional(),
});

const signInResponseSchema = z.union([mfaChallengeSchema, sessionSchema]);
const signUpResponseSchema = z.union([sessionSchema, z.object({ created: z.literal(true) })]);

export type AuthSession = {
  kind: 'session';
  accessToken: string;
  refreshToken: string;
};

export type AuthChallenge = {
  kind: 'mfa';
  challengeToken: string;
};

function asSession(result: z.infer<typeof sessionSchema>): AuthSession {
  return {
    kind: 'session',
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export async function signInRequest(input: {
  email: string;
  password: string;
}): Promise<AuthSession | AuthChallenge> {
  const result = await apiRequest('/api/v1/auth/sign-in', signInResponseSchema, {
    method: 'POST',
    body: input,
  });
  if (result.mfaRequired === true) {
    return { kind: 'mfa', challengeToken: result.challengeToken };
  }
  return asSession(result);
}

export async function signUpRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession | { kind: 'created' }> {
  const result = await apiRequest('/api/v1/auth/sign-up', signUpResponseSchema, {
    method: 'POST',
    body: input,
  });
  if ('accessToken' in result) {
    return asSession(result);
  }
  return { kind: 'created' };
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/api/v1/auth/password/reset-request', ackSchema, {
    method: 'POST',
    body: { email },
  });
}

export async function verifyMfaRequest(input: {
  challengeToken: string;
  code: string;
}): Promise<AuthSession> {
  const result = await apiRequest('/api/v1/auth/mfa/verify', sessionSchema, {
    method: 'POST',
    body: input,
  });
  return asSession(result);
}

export async function signOutRequest(refreshToken?: string): Promise<void> {
  await apiRequest('/api/v1/auth/sign-out', ackSchema, {
    method: 'POST',
    auth: true,
    retry: false,
    body: refreshToken ? { refreshToken } : {},
  });
}
