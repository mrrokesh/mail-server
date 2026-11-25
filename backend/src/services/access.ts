import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import {
  TRIAL_EXTERNAL_RECIPIENTS_PER_DAY,
  type FeatureFlag,
  type PlanLimits,
  minimumTier,
} from '../billing/entitlements';
import type { AccessClaims } from '../crypto/jwt';
import { verifyAccess } from '../crypto/jwt';
import { ApiError } from '../errors';
import type { RateLimitRule } from '../config';
import type { MemoryRateLimiter } from '../http/rate-limit';
import type {
  AuditRecord,
  ControlStore,
  InvoiceRecord,
  MailboxRecord,
  OrgRecord,
  OrgRole,
  PlanRecord,
  SubscriptionRecord,
  UserRecord,
} from '../store/types';
import type { AppDeps } from '../app-deps';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuid(value: string): string {
  return UUID_RE.test(value) ? value : crypto.randomUUID();
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    throw new ApiError('API-VAL-001', {
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export function enforceRate(
  limiter: MemoryRateLimiter,
  key: string,
  rule: RateLimitRule,
  now: Date,
  reply: FastifyReply,
): void {
  const result = limiter.hit(key, rule, now.getTime());
  if (!result.allowed) {
    reply.header('retry-after', String(result.retryAfterSec));
    throw new ApiError('API-RATE-429', { retryAfterSec: result.retryAfterSec });
  }
}

export function assertRole(role: OrgRole, allowed: readonly OrgRole[]): void {
  if (!allowed.includes(role)) throw new ApiError('API-AUTH-003');
}

export const USER_MANAGERS = ['owner', 'user_admin'] as const satisfies readonly OrgRole[];
export const PASSWORD_HELPERS = [
  'owner',
  'user_admin',
  'helpdesk',
] as const satisfies readonly OrgRole[];
export const USER_READERS = [
  'owner',
  'billing_admin',
  'user_admin',
  'helpdesk',
  'security_admin',
  'compliance_admin',
  'read_only',
] as const satisfies readonly OrgRole[];
export const BILLING_ROLES = ['owner', 'billing_admin'] as const satisfies readonly OrgRole[];
export const SECURITY_ROLES = ['owner', 'security_admin'] as const satisfies readonly OrgRole[];
export const DOMAIN_ROLES = [
  'owner',
  'user_admin',
  'security_admin',
] as const satisfies readonly OrgRole[];
export const AUDIT_ROLES = [
  'owner',
  'billing_admin',
  'user_admin',
  'security_admin',
  'compliance_admin',
  'read_only',
] as const satisfies readonly OrgRole[];
export const COMPLIANCE_ROLES = ['owner', 'compliance_admin'] as const satisfies readonly OrgRole[];

export function assertEntitled(limits: PlanLimits, feature: FeatureFlag): void {
  const allowed =
    feature === 'audit'
      ? limits.auditRetentionDays > 0
      : feature === 'sharedMailbox'
        ? limits.maxSharedMailboxes !== 0
        : limits[feature] === true;
  if (!allowed) {
    throw new ApiError('API-BILL-003', { feature, requiredTier: minimumTier(feature) });
  }
}

export function assertWritable(subscription: SubscriptionRecord, now: Date): void {
  if (subscription.status === 'suspended') throw new ApiError('API-TEN-001');
  if (subscription.status === 'read_only' || subscription.status === 'canceled') {
    throw new ApiError('API-BILL-005');
  }
  if (
    subscription.status === 'trialing' &&
    subscription.currentPeriodEnd.getTime() <= now.getTime()
  ) {
    throw new ApiError('API-BILL-005', { reason: 'trial_ended' });
  }
}

export function effectiveLimits(plan: PlanRecord, subscription: SubscriptionRecord): PlanLimits {
  const limits: PlanLimits = { ...plan.entitlements };
  if (plan.tier === 'enterprise' && subscription.limitOverrides) {
    Object.assign(limits, subscription.limitOverrides);
  }
  if (subscription.status === 'trialing' && subscription.paidAt === null) {
    limits.externalRecipientsPerDay = Math.min(
      limits.externalRecipientsPerDay,
      TRIAL_EXTERNAL_RECIPIENTS_PER_DAY,
    );
  }
  return limits;
}

export interface TenantContext {
  claims: AccessClaims;
  user: UserRecord;
  org: OrgRecord;
  subscription: SubscriptionRecord;
  plan: PlanRecord;
  limits: PlanLimits;
}

export async function loadTenant(
  request: FastifyRequest,
  mode: 'session' | 'enroll',
): Promise<TenantContext> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError('API-AUTH-002', { reason: 'missing' });
  }
  const token = header.slice('Bearer '.length).trim();
  const claims = verifyAccess(
    token,
    request.server.deps.config.jwtSecret,
    request.server.deps.now(),
  );
  if (mode === 'session' && claims.scope !== 'session') {
    throw new ApiError('API-SEC-001', { reason: 'enrollment_required' });
  }
  if (claims.scope === 'mfa_challenge' && mode !== 'session') {
    throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  }
  const user = await request.server.deps.store.findUser(claims.org, claims.sub);
  if (!user || !user.isActive || user.deletedAt) throw new ApiError('API-AUTH-001');
  const org = await request.server.deps.store.findOrg(claims.org);
  if (!org) throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  if (org.status === 'suspended') throw new ApiError('API-TEN-001');
  if (mode === 'session' && org.enforceMfa && !user.mfaEnabled) {
    throw new ApiError('API-SEC-001', { reason: 'enrollment_required' });
  }
  const subscription = await request.server.deps.store.findSubscription(org.id);
  if (!subscription) throw new ApiError('API-SRV-500');
  const plan = await request.server.deps.store.findPlanById(subscription.planId);
  if (!plan) throw new ApiError('API-SRV-500');
  const tenant: TenantContext = {
    claims,
    user,
    org,
    subscription,
    plan,
    limits: effectiveLimits(plan, subscription),
  };
  await request.server.deps.workspace.hydrate(org.id);
  request.tenant = tenant;
  return tenant;
}

export async function writeAudit(
  store: ControlStore,
  row: Omit<AuditRecord, 'id' | 'createdAt'> & { at: Date },
): Promise<void> {
  await store.insertAudit({
    id: crypto.randomUUID(),
    createdAt: row.at,
    organizationId: row.organizationId,
    actorUserId: row.actorUserId,
    requestId: row.requestId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    ipAddress: row.ipAddress,
    metadata: row.metadata,
  });
}

export function presentUser(user: UserRecord) {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    fullName: user.fullName,
    name: user.fullName,
    role: user.role,
    status: user.isActive ? ('active' as const) : ('suspended' as const),
    mfaEnabled: user.mfaEnabled,
    isActive: user.isActive,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function presentOrg(org: OrgRecord) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    enforceMfa: org.enforceMfa,
    dataResidencyRegion: org.dataResidencyRegion,
    stalwartTenantId: org.stalwartTenantId,
    sendingPaused: org.sendingPaused,
    gstin: org.gstin,
    placeOfSupply: org.placeOfSupply,
  };
}

export function presentPlan(plan: PlanRecord) {
  return {
    id: plan.id,
    tier: plan.tier,
    displayName: plan.displayName,
    priceInrMonthlyPaise: plan.priceInrMonthlyPaise,
    priceInrAnnualPaise: plan.priceInrAnnualPaise,
    currency: 'INR' as const,
    gstIncluded: true,
    entitlements: plan.entitlements,
  };
}

export function presentMailbox(mailbox: MailboxRecord) {
  return {
    id: mailbox.id,
    organizationId: mailbox.organizationId,
    domainId: mailbox.domainId,
    userId: mailbox.userId,
    kind: mailbox.kind,
    address: mailbox.address,
    stalwartPrincipalId: mailbox.stalwartPrincipalId,
    quotaBytes: mailbox.quotaBytes,
    usedBytes: mailbox.usedBytes,
    archiveAutoExpand: mailbox.archiveAutoExpand,
    createdAt: mailbox.createdAt.toISOString(),
  };
}

export function presentInvoice(invoice: InvoiceRecord) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    gstin: invoice.gstin,
    placeOfSupply: invoice.placeOfSupply,
    taxablePaise: invoice.taxablePaise,
    cgstPaise: invoice.cgstPaise,
    sgstPaise: invoice.sgstPaise,
    igstPaise: invoice.igstPaise,
    totalPaise: invoice.totalPaise,
    sacCode: invoice.sacCode,
    currency: 'INR' as const,
    createdAt: invoice.createdAt.toISOString(),
  };
}

export function clientIp(request: FastifyRequest): string | null {
  return request.ip && request.ip.length > 0 ? request.ip : null;
}

export function depsOf(request: FastifyRequest): AppDeps {
  return request.server.deps;
}
