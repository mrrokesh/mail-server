import crypto from 'node:crypto';
import type { PlanTier } from '@mrrokesh/shared';
import { PLAN_CATALOG, TRIAL_DAYS, TRIAL_SEATS } from '../billing/entitlements';
import type { AppConfig } from '../config';
import { encryptString, decryptString } from '../crypto/aes';
import { signAccess, verifyAccess } from '../crypto/jwt';
import {
  hashOpaqueToken,
  hashPassword,
  needsRehash,
  newOpaqueToken,
  passwordPolicyError,
  verifyPassword,
} from '../crypto/password';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../crypto/totp';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { OrgRecord, UserRecord } from '../store/types';
import { presentOrg, presentUser, writeAudit } from './access';

export interface SessionBody {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ReturnType<typeof presentUser>;
  organization: ReturnType<typeof presentOrg>;
}

export type LoginResult = SessionBody | { mfaRequired: true; challengeToken: string };

const MFA_CHALLENGE_SEC = 5 * 60;

export interface AuthMeta {
  requestId: string;
  ip: string | null;
  deviceLabel?: string;
  platform?: 'web' | 'android' | 'ios';
}

const dummyHashes = new Map<string, Promise<string>>();

function dummyHash(config: AppConfig): Promise<string> {
  const key = `${config.passwordPepper}:${config.bcryptCost}`;
  const existing = dummyHashes.get(key);
  if (existing) return existing;
  const pending = hashPassword('not-a-real-password', config.passwordPepper, config.bcryptCost);
  dummyHashes.set(key, pending);
  return pending;
}

function pepperFor(config: AppConfig, version: number): string {
  return config.peppers[version] ?? config.passwordPepper;
}

function assertPassword(password: string): void {
  const message = passwordPolicyError(password);
  if (message) {
    throw new ApiError('API-VAL-001', { fields: [{ path: 'password', message }] });
  }
}

async function issueSession(
  deps: AppDeps,
  user: UserRecord,
  org: OrgRecord,
  meta: AuthMeta,
  familyId?: string,
): Promise<SessionBody> {
  const now = deps.now();
  const refreshToken = newOpaqueToken();
  await deps.store.insertRefresh({
    id: crypto.randomUUID(),
    userId: user.id,
    organizationId: user.organizationId,
    tokenHash: hashOpaqueToken(refreshToken),
    familyId: familyId ?? crypto.randomUUID(),
    deviceLabel: meta.deviceLabel ?? null,
    platform: meta.platform ?? null,
    ipAddress: meta.ip,
    expiresAt: new Date(now.getTime() + deps.config.refreshTtlSec * 1000),
    revokedAt: null,
    createdAt: now,
  });
  return {
    tokenType: 'Bearer',
    accessToken: signAccess(
      {
        sub: user.id,
        org: user.organizationId,
        role: user.role,
        email: user.email,
        scope: 'session',
      },
      deps.config.jwtSecret,
      deps.config.accessTtlSec,
      now,
    ),
    refreshToken,
    expiresIn: deps.config.accessTtlSec,
    user: presentUser(user),
    organization: presentOrg(org),
  };
}

export async function signupAccount(
  deps: AppDeps,
  input: {
    organizationName: string;
    slug: string;
    email: string;
    password: string;
    fullName: string;
    planTier: PlanTier;
    trial: boolean;
  },
  meta: AuthMeta,
): Promise<{ session: SessionBody; syncStatus: 'synced' | 'pending' }> {
  assertPassword(input.password);
  if (input.planTier === 'enterprise') {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'planTier', message: 'Enterprise is sold on a contract.' }],
    });
  }
  if (input.trial && input.planTier !== 'business') {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'trial', message: 'The trial is Business for 30 days.' }],
    });
  }
  if (!input.trial && input.planTier !== 'free') {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'planTier', message: 'Start on Free or a Business trial, then check out.' }],
    });
  }
  const tier = input.trial ? 'business' : 'free';
  const plan = await deps.store.findPlanByTier(tier);
  if (!plan) throw new ApiError('API-SRV-500');
  const now = deps.now();
  const passwordHash = await hashPassword(
    input.password,
    deps.config.passwordPepper,
    deps.config.bcryptCost,
  );
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const periodEnd = input.trial
    ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
  const catalog = PLAN_CATALOG[tier];
  const result = await deps.store.signup({
    org: {
      id: orgId,
      name: input.organizationName,
      slug: input.slug,
      stalwartTenantId: `st_${orgId}`,
      dataResidencyRegion: 'ap-south-1',
      enforceMfa: false,
      ssoEnabled: false,
      status: 'active',
      sendingPaused: false,
      gstin: null,
      placeOfSupply: null,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: userId,
      organizationId: orgId,
      email: input.email,
      fullName: input.fullName,
      role: 'owner',
      passwordHash,
      pepperVersion: deps.config.pepperVersion,
      totpSecretEnc: null,
      totpSecretIv: null,
      mfaEnabled: false,
      isActive: true,
      deletedAt: null,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    },
    subscription: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      planId: plan.id,
      status: input.trial ? 'trialing' : 'active',
      cycle: 'monthly',
      currency: 'INR',
      seatLimit: input.trial ? TRIAL_SEATS : catalog.entitlements.maxUsers,
      extraStorageGb: 0,
      paymentGateway: 'razorpay',
      gatewayCustomerId: null,
      gatewaySubId: null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paidAt: null,
      limitOverrides: null,
      createdAt: now,
      updatedAt: now,
    },
    audit: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      actorUserId: userId,
      requestId: meta.requestId,
      action: 'org.created',
      targetType: 'organization',
      targetId: orgId,
      ipAddress: meta.ip,
      metadata: { tier, trial: input.trial },
      createdAt: now,
    },
  });
  if (result === 'duplicate_slug') {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'slug', message: 'That organization address is taken.' }],
    });
  }
  if (result === 'duplicate_email') throw new ApiError('API-MAIL-003');
  const sync = await deps.mail.ensureTenant({
    organizationId: orgId,
    stalwartTenantId: `st_${orgId}`,
    name: input.organizationName,
  });
  if (sync.syncStatus === 'pending') {
    await writeAudit(deps.store, {
      at: deps.now(),
      organizationId: orgId,
      actorUserId: userId,
      requestId: meta.requestId,
      action: 'stalwart.sync_pending',
      targetType: 'organization',
      targetId: orgId,
      ipAddress: meta.ip,
      metadata: {},
    });
  }
  const user = await deps.store.findUser(orgId, userId);
  const org = await deps.store.findOrg(orgId);
  if (!user || !org) throw new ApiError('API-SRV-500');
  return { session: await issueSession(deps, user, org, meta), syncStatus: sync.syncStatus };
}

export async function loginAccount(
  deps: AppDeps,
  input: {
    email: string;
    password: string;
    totpCode?: string;
    deviceLabel?: string;
    platform?: AuthMeta['platform'];
  },
  meta: AuthMeta,
): Promise<LoginResult> {
  const user = await deps.store.findUserByEmail(input.email);
  const pepper = user ? pepperFor(deps.config, user.pepperVersion) : deps.config.passwordPepper;
  const hash = user?.passwordHash ?? (await dummyHash(deps.config));
  const matches = await verifyPassword(input.password, hash, pepper);
  if (!user || !matches || !user.isActive || user.deletedAt) {
    if (user) {
      await writeAudit(deps.store, {
        at: deps.now(),
        organizationId: user.organizationId,
        actorUserId: user.id,
        requestId: meta.requestId,
        action: 'auth.login_failed',
        targetType: 'user',
        targetId: user.id,
        ipAddress: meta.ip,
        metadata: {},
      });
    }
    throw new ApiError('API-AUTH-001');
  }
  const org = await deps.store.findOrg(user.organizationId);
  if (!org) throw new ApiError('API-AUTH-001');
  if (org.status === 'suspended') throw new ApiError('API-TEN-001');
  if (user.mfaEnabled) {
    if (!input.totpCode) {
      return {
        mfaRequired: true,
        challengeToken: signAccess(
          {
            sub: user.id,
            org: user.organizationId,
            role: user.role,
            email: user.email,
            scope: 'mfa_challenge',
          },
          deps.config.jwtSecret,
          MFA_CHALLENGE_SEC,
          deps.now(),
        ),
      };
    }
    if (!user.totpSecretEnc || !user.totpSecretIv) throw new ApiError('API-SEC-002');
    const secret = decryptString(
      deps.config.dataEncryptionKey,
      user.totpSecretEnc,
      user.totpSecretIv,
    );
    if (!verifyTotp(secret, input.totpCode, deps.now())) throw new ApiError('API-SEC-002');
  } else if (org.enforceMfa) {
    throw new ApiError('API-SEC-001', {
      reason: 'enrollment_required',
      enrollmentToken: signAccess(
        {
          sub: user.id,
          org: user.organizationId,
          role: user.role,
          email: user.email,
          scope: 'mfa_enroll',
        },
        deps.config.jwtSecret,
        deps.config.accessTtlSec,
        deps.now(),
      ),
    });
  }
  if (
    user.pepperVersion !== deps.config.pepperVersion ||
    needsRehash(user.passwordHash, deps.config.bcryptCost)
  ) {
    const passwordHash = await hashPassword(
      input.password,
      deps.config.passwordPepper,
      deps.config.bcryptCost,
    );
    await deps.store.updateUser(user.organizationId, user.id, {
      passwordHash,
      pepperVersion: deps.config.pepperVersion,
      lastLoginAt: deps.now(),
    });
  } else {
    await deps.store.updateUser(user.organizationId, user.id, { lastLoginAt: deps.now() });
  }
  const fresh = await deps.store.findUser(user.organizationId, user.id);
  if (!fresh) throw new ApiError('API-SRV-500');
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: user.organizationId,
    actorUserId: user.id,
    requestId: meta.requestId,
    action: 'auth.login',
    targetType: 'user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: { mfa: user.mfaEnabled },
  });
  return issueSession(deps, fresh, org, {
    ...meta,
    deviceLabel: input.deviceLabel,
    platform: input.platform,
  });
}

export async function verifyMfaChallenge(
  deps: AppDeps,
  input: {
    challengeToken: string;
    code: string;
    deviceLabel?: string;
    platform?: AuthMeta['platform'];
  },
  meta: AuthMeta,
): Promise<SessionBody> {
  const claims = verifyAccess(input.challengeToken, deps.config.jwtSecret, deps.now());
  if (claims.scope !== 'mfa_challenge') throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  const user = await deps.store.findUser(claims.org, claims.sub);
  if (!user || !user.isActive || user.deletedAt || !user.mfaEnabled)
    throw new ApiError('API-SEC-002');
  if (!user.totpSecretEnc || !user.totpSecretIv) throw new ApiError('API-SEC-002');
  const secret = decryptString(
    deps.config.dataEncryptionKey,
    user.totpSecretEnc,
    user.totpSecretIv,
  );
  if (!verifyTotp(secret, input.code, deps.now())) throw new ApiError('API-SEC-002');
  const org = await deps.store.findOrg(user.organizationId);
  if (!org) throw new ApiError('API-SEC-002');
  if (org.status === 'suspended') throw new ApiError('API-TEN-001');
  await deps.store.updateUser(user.organizationId, user.id, { lastLoginAt: deps.now() });
  const fresh = await deps.store.findUser(user.organizationId, user.id);
  if (!fresh) throw new ApiError('API-SRV-500');
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: user.organizationId,
    actorUserId: user.id,
    requestId: meta.requestId,
    action: 'auth.login',
    targetType: 'user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: { mfa: true, via: 'verify' },
  });
  return issueSession(deps, fresh, org, {
    ...meta,
    deviceLabel: input.deviceLabel,
    platform: input.platform,
  });
}

export async function refreshSession(
  deps: AppDeps,
  refreshToken: string,
  meta: AuthMeta,
): Promise<SessionBody> {
  const row = await deps.store.findRefreshByHash(hashOpaqueToken(refreshToken));
  if (!row) throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  if (row.revokedAt) {
    await deps.store.revokeRefreshFamily(row.organizationId, row.familyId, deps.now());
    await writeAudit(deps.store, {
      at: deps.now(),
      organizationId: row.organizationId,
      actorUserId: row.userId,
      requestId: meta.requestId,
      action: 'auth.refresh_reused',
      targetType: 'session',
      targetId: row.id,
      ipAddress: meta.ip,
      metadata: {},
    });
    throw new ApiError('API-AUTH-002', { reason: 'refresh_reused' });
  }
  if (row.expiresAt.getTime() <= deps.now().getTime()) {
    throw new ApiError('API-AUTH-002', { reason: 'expired' });
  }
  const user = await deps.store.findUser(row.organizationId, row.userId);
  const org = await deps.store.findOrg(row.organizationId);
  if (!user || !user.isActive || user.deletedAt || !org) throw new ApiError('API-AUTH-001');
  if (org.status === 'suspended') throw new ApiError('API-TEN-001');
  await deps.store.revokeRefresh(row.organizationId, row.id, deps.now());
  return issueSession(
    deps,
    user,
    org,
    {
      ...meta,
      deviceLabel: row.deviceLabel ?? undefined,
      platform: row.platform ?? undefined,
    },
    row.familyId,
  );
}

export async function logoutSession(
  deps: AppDeps,
  refreshToken: string | undefined,
): Promise<void> {
  if (!refreshToken) return;
  const row = await deps.store.findRefreshByHash(hashOpaqueToken(refreshToken));
  if (!row || row.revokedAt) return;
  await deps.store.revokeRefresh(row.organizationId, row.id, deps.now());
}

export async function changePassword(
  deps: AppDeps,
  user: UserRecord,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  assertPassword(nextPassword);
  const pepper = pepperFor(deps.config, user.pepperVersion);
  const matches = await verifyPassword(currentPassword, user.passwordHash, pepper);
  if (!matches) throw new ApiError('API-AUTH-001');
  const passwordHash = await hashPassword(
    nextPassword,
    deps.config.passwordPepper,
    deps.config.bcryptCost,
  );
  await deps.store.updateUser(user.organizationId, user.id, {
    passwordHash,
    pepperVersion: deps.config.pepperVersion,
  });
  await deps.store.revokeAllRefreshForUser(user.organizationId, user.id, deps.now());
}

export async function forgotPassword(
  deps: AppDeps,
  email: string,
  meta: AuthMeta,
): Promise<{ status: 'accepted'; resetToken?: string }> {
  const user = await deps.store.findUserByEmail(email);
  if (!user || !user.isActive || user.deletedAt) return { status: 'accepted' };
  const resetToken = newOpaqueToken();
  const now = deps.now();
  await deps.store.insertReset({
    id: crypto.randomUUID(),
    organizationId: user.organizationId,
    userId: user.id,
    tokenHash: hashOpaqueToken(resetToken),
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    usedAt: null,
    createdAt: now,
  });
  await writeAudit(deps.store, {
    at: now,
    organizationId: user.organizationId,
    actorUserId: user.id,
    requestId: meta.requestId,
    action: 'auth.password_reset_requested',
    targetType: 'user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  if (deps.config.nodeEnv === 'test') return { status: 'accepted', resetToken };
  return { status: 'accepted' };
}

export async function resetPassword(deps: AppDeps, token: string, password: string): Promise<void> {
  assertPassword(password);
  const row = await deps.store.findResetByHash(hashOpaqueToken(token));
  if (!row || row.usedAt || row.expiresAt.getTime() <= deps.now().getTime()) {
    throw new ApiError('API-AUTH-001');
  }
  const passwordHash = await hashPassword(
    password,
    deps.config.passwordPepper,
    deps.config.bcryptCost,
  );
  await deps.store.updateUser(row.organizationId, row.userId, {
    passwordHash,
    pepperVersion: deps.config.pepperVersion,
  });
  await deps.store.markResetUsed(row.organizationId, row.id, deps.now());
  await deps.store.revokeAllRefreshForUser(row.organizationId, row.userId, deps.now());
}

export async function beginTotp(
  deps: AppDeps,
  user: UserRecord,
): Promise<{ secret: string; otpauthUrl: string }> {
  const secret = generateTotpSecret();
  const encrypted = encryptString(deps.config.dataEncryptionKey, secret);
  await deps.store.updateUser(user.organizationId, user.id, {
    totpSecretEnc: encrypted.ciphertext,
    totpSecretIv: encrypted.iv,
    mfaEnabled: false,
  });
  return { secret, otpauthUrl: otpauthUrl(user.email, secret) };
}

export async function confirmTotp(
  deps: AppDeps,
  user: UserRecord,
  org: OrgRecord,
  code: string,
  meta: AuthMeta,
  issue: boolean,
): Promise<SessionBody | { mfaEnabled: true }> {
  const fresh = await deps.store.findUser(user.organizationId, user.id);
  if (!fresh?.totpSecretEnc || !fresh.totpSecretIv) throw new ApiError('API-SEC-002');
  const secret = decryptString(
    deps.config.dataEncryptionKey,
    fresh.totpSecretEnc,
    fresh.totpSecretIv,
  );
  if (!verifyTotp(secret, code, deps.now())) throw new ApiError('API-SEC-002');
  await deps.store.updateUser(user.organizationId, user.id, { mfaEnabled: true });
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: user.organizationId,
    actorUserId: user.id,
    requestId: meta.requestId,
    action: 'mfa.totp_enabled',
    targetType: 'user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  if (!issue) return { mfaEnabled: true };
  const enabled = await deps.store.findUser(user.organizationId, user.id);
  if (!enabled) throw new ApiError('API-SRV-500');
  return issueSession(deps, enabled, org, meta);
}

export function passkeyOptions(
  deps: AppDeps,
  purpose: 'register' | 'authenticate',
  user?: UserRecord,
): { challenge: string; rpId: string; rpName: string; userId?: string } {
  const challenge = newOpaqueToken();
  deps.challenges.set(challenge, {
    challenge,
    purpose,
    userId: user?.id,
    organizationId: user?.organizationId,
    expiresAt: deps.now().getTime() + 5 * 60 * 1000,
  });
  return {
    challenge,
    rpId: deps.config.webauthnRpId,
    rpName: deps.config.webauthnRpName,
    ...(user ? { userId: user.id } : {}),
  };
}

export async function registerPasskey(
  deps: AppDeps,
  user: UserRecord,
  input: {
    challenge: string;
    credentialId: string;
    publicKey: string;
    label: string;
    transports?: string[];
  },
  meta: AuthMeta,
): Promise<{ id: string; label: string }> {
  const pending = deps.challenges.get(input.challenge);
  deps.challenges.delete(input.challenge);
  if (
    !pending ||
    pending.purpose !== 'register' ||
    pending.userId !== user.id ||
    pending.expiresAt < deps.now().getTime()
  ) {
    throw new ApiError('API-SEC-002');
  }
  let publicKey: Buffer;
  try {
    publicKey = Buffer.from(input.publicKey, 'base64url');
  } catch {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'publicKey', message: 'Key is invalid.' }],
    });
  }
  if (publicKey.length < 16) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'publicKey', message: 'Key is invalid.' }],
    });
  }
  const row = {
    id: crypto.randomUUID(),
    userId: user.id,
    organizationId: user.organizationId,
    credentialId: input.credentialId,
    publicKey,
    signCount: 0,
    transports: input.transports ?? [],
    label: input.label,
    createdAt: deps.now(),
  };
  const saved = await deps.store.insertPasskey(row);
  if (saved === 'duplicate') throw new ApiError('API-MAIL-003');
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: user.organizationId,
    actorUserId: user.id,
    requestId: meta.requestId,
    action: 'mfa.passkey_registered',
    targetType: 'passkey',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { label: input.label },
  });
  return { id: row.id, label: row.label };
}

export async function authenticatePasskey(
  deps: AppDeps,
  input: { challenge: string; credentialId: string; signCount: number },
  meta: AuthMeta,
): Promise<SessionBody> {
  const pending = deps.challenges.get(input.challenge);
  deps.challenges.delete(input.challenge);
  const passkey = await deps.store.findPasskey(input.credentialId);
  if (
    !pending ||
    pending.purpose !== 'authenticate' ||
    !passkey ||
    pending.expiresAt < deps.now().getTime() ||
    pending.userId !== passkey.userId ||
    input.signCount <= passkey.signCount
  ) {
    throw new ApiError('API-SEC-002');
  }
  const user = await deps.store.findUser(passkey.organizationId, passkey.userId);
  const org = user ? await deps.store.findOrg(user.organizationId) : null;
  if (!user || !user.isActive || user.deletedAt || !org) throw new ApiError('API-SEC-002');
  if (org.status === 'suspended') throw new ApiError('API-TEN-001');
  await deps.store.updatePasskeyCounter(passkey.organizationId, passkey.id, input.signCount);
  return issueSession(deps, user, org, meta);
}
