import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PLAN_TIERS } from '@mrrokesh/shared';
import { clearRefreshCookie, readCookie, refreshCookie } from '../http/cookies';
import { ApiError } from '../errors';
import { ORG_ROLES } from '../store/types';
import {
  AUDIT_ROLES,
  BILLING_ROLES,
  DOMAIN_ROLES,
  SECURITY_ROLES,
  USER_READERS,
  asUuid,
  assertEntitled,
  assertRole,
  clientIp,
  enforceRate,
  loadTenant,
  parseBody,
  presentOrg,
  presentUser,
} from '../services/access';
import {
  authenticatePasskey,
  beginTotp,
  changePassword,
  confirmTotp,
  forgotPassword,
  loginAccount,
  logoutSession,
  passkeyOptions,
  refreshSession,
  registerPasskey,
  resetPassword,
  signupAccount,
  type AuthMeta,
} from '../services/auth';
import {
  applyRazorpayWebhook,
  createCheckout,
  invoiceList,
  planCatalog,
  usageSummary,
} from '../services/billing';
import {
  createDomain,
  dnsRecordsFor,
  presentDomain,
  setCatchAll,
  verifyDomain,
} from '../services/domains';
import { flattenSignup, withClientUser } from '../services/client-session';
import {
  handleJmap,
  listClientMessages,
  openSession,
  presentSentMessage,
  protocolAccess,
  readClientMessage,
  submitMessage,
} from '../services/mail';
import {
  createAlias,
  createAppPassword,
  createDelegation,
  createMailbox,
  createUserAccount,
  deleteUserAccount,
  listAppPasswords,
  listVisibleMailboxes,
  removeAlias,
  resetUserPassword,
  restoreUserAccount,
  setUserActive,
} from '../services/mailboxes';

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.normalize('NFKC').toLowerCase());
const passwordSchema = z.string().min(1).max(128);
const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .transform((value) => value.normalize('NFKC').toLowerCase())
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    'Use lowercase letters, numbers, and hyphens.',
  );
const platformSchema = z.enum(['web', 'android', 'ios']);

function meta(
  request: { id: string; ip: string },
  extra?: Pick<AuthMeta, 'deviceLabel' | 'platform'>,
): AuthMeta {
  return {
    requestId: asUuid(request.id),
    ip: request.ip && request.ip.length > 0 ? request.ip : null,
    ...extra,
  };
}

function slugFromName(value: string): string {
  const base = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  return `${base.length >= 3 ? base : 'org'}-${crypto.randomUUID().slice(0, 8)}`;
}

function setSessionCookie(
  app: FastifyInstance,
  reply: { header: (name: string, value: string) => void },
  refreshToken: string,
) {
  reply.header(
    'set-cookie',
    refreshCookie(
      refreshToken,
      app.deps.config.refreshTtlSec,
      app.deps.config.nodeEnv === 'production',
    ),
  );
}

const signupSchema = z
  .object({
    organizationName: z.string().trim().min(2).max(80).optional(),
    organization: z.string().trim().min(2).max(80).optional(),
    slug: slugSchema.optional(),
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(80).optional(),
    planTier: z.enum(PLAN_TIERS).optional(),
    plan: z.enum(PLAN_TIERS).optional(),
    trial: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.fullName || value.name), {
    message: 'Enter a name.',
    path: ['fullName'],
  });

export function registerApi(app: FastifyInstance): void {
  const postSignup = async (request: FastifyRequest, reply: FastifyReply) => {
    enforceRate(
      app.deps.rates,
      `signup:${clientIp(request) ?? 'local'}`,
      app.deps.config.rateLimits.signup,
      app.deps.now(),
      reply,
    );
    const body = parseBody(signupSchema, request.body);
    const fullName = body.fullName ?? body.name ?? '';
    let organizationName = (
      body.organizationName ??
      body.organization ??
      `${fullName}'s workspace`
    ).trim();
    if (organizationName.length > 80) organizationName = organizationName.slice(0, 80).trim();
    if (organizationName.length < 2) {
      throw new ApiError('API-VAL-001', {
        fields: [{ path: 'organizationName', message: 'Enter an organization name.' }],
      });
    }
    const planTier = body.planTier ?? body.plan ?? 'free';
    const trial = body.trial ?? (body.plan === 'business' && body.planTier === undefined);
    const result = await signupAccount(
      app.deps,
      {
        organizationName,
        slug: body.slug ?? slugFromName(organizationName),
        email: body.email,
        password: body.password,
        fullName,
        planTier,
        trial,
      },
      meta(request),
    );
    const session = await withClientUser(app.deps, result.session);
    setSessionCookie(app, reply, session.refreshToken);
    return reply.code(201).send(flattenSignup(session, result.syncStatus));
  };
  app.post('/api/v1/auth/signup', postSignup);
  app.post('/api/v1/auth/sign-up', postSignup);

  const postLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = parseBody(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        totpCode: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
        deviceLabel: z.string().trim().max(80).optional(),
        platform: platformSchema.optional(),
      }),
      request.body,
    );
    enforceRate(
      app.deps.rates,
      `login:${clientIp(request) ?? 'local'}:${body.email}`,
      app.deps.config.rateLimits.login,
      app.deps.now(),
      reply,
    );
    const session = await loginAccount(
      app.deps,
      body,
      meta(request, { deviceLabel: body.deviceLabel, platform: body.platform }),
    );
    setSessionCookie(app, reply, session.refreshToken);
    return withClientUser(app.deps, session);
  };
  app.post('/api/v1/auth/login', postLogin);
  app.post('/api/v1/auth/sign-in', postLogin);

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const body = parseBody(z.object({ refreshToken: z.string().min(20).optional() }), request.body);
    const cookie = request.headers.cookie;
    const token =
      body.refreshToken ??
      readCookie(typeof cookie === 'string' ? cookie : undefined, 'mr_refresh');
    if (!token) throw new ApiError('API-AUTH-002', { reason: 'missing' });
    const session = await refreshSession(app.deps, token, meta(request));
    setSessionCookie(app, reply, session.refreshToken);
    return session;
  });

  const postLogout = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = parseBody(z.object({ refreshToken: z.string().optional() }), request.body);
    const cookie = request.headers.cookie;
    const token =
      body.refreshToken ??
      readCookie(typeof cookie === 'string' ? cookie : undefined, 'mr_refresh');
    await logoutSession(app.deps, token);
    reply.header('set-cookie', clearRefreshCookie(app.deps.config.nodeEnv === 'production'));
    return reply.code(204).send();
  };
  app.post('/api/v1/auth/logout', postLogout);
  app.post('/api/v1/auth/sign-out', postLogout);

  app.post('/api/v1/auth/password', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({ currentPassword: passwordSchema, newPassword: passwordSchema }),
      request.body,
    );
    await changePassword(app.deps, tenant.user, body.currentPassword, body.newPassword);
    return reply.code(204).send();
  });

  const postForgot = async (request: FastifyRequest, reply: FastifyReply) => {
    enforceRate(
      app.deps.rates,
      `reset:${clientIp(request) ?? 'local'}`,
      app.deps.config.rateLimits.passwordReset,
      app.deps.now(),
      reply,
    );
    const body = parseBody(z.object({ email: emailSchema }), request.body);
    return forgotPassword(app.deps, body.email, meta(request));
  };
  app.post('/api/v1/auth/password/forgot', postForgot);
  app.post('/api/v1/auth/password/reset-request', postForgot);
  app.post('/api/v1/auth/password-resets', postForgot);

  app.post('/api/v1/auth/password/reset', async (request, reply) => {
    const body = parseBody(
      z.object({ token: z.string().min(20), password: passwordSchema }),
      request.body,
    );
    await resetPassword(app.deps, body.token, body.password);
    return reply.code(204).send();
  });

  app.get('/api/v1/auth/sessions', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const rows = await app.deps.store.listRefreshForUser(tenant.org.id, tenant.user.id);
    return rows.map((row) => ({
      id: row.id,
      deviceLabel: row.deviceLabel,
      platform: row.platform,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    }));
  });

  app.delete('/api/v1/auth/sessions/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    await app.deps.store.revokeRefresh(tenant.org.id, params.id, app.deps.now());
    return reply.code(204).send();
  });

  app.post('/api/v1/auth/mfa/totp/setup', async (request) => {
    const tenant = await loadTenant(request, 'enroll');
    return beginTotp(app.deps, tenant.user);
  });

  app.post('/api/v1/auth/mfa/totp/confirm', async (request, reply) => {
    const tenant = await loadTenant(request, 'enroll');
    const body = parseBody(z.object({ code: z.string().regex(/^\d{6}$/) }), request.body);
    const result = await confirmTotp(
      app.deps,
      tenant.user,
      tenant.org,
      body.code,
      meta(request),
      tenant.claims.scope === 'mfa_enroll',
    );
    if ('refreshToken' in result) setSessionCookie(app, reply, result.refreshToken);
    return result;
  });

  app.post('/api/v1/auth/passkeys/options', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return passkeyOptions(app.deps, 'register', tenant.user);
  });

  app.post('/api/v1/auth/passkeys', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        challenge: z.string().min(10),
        credentialId: z.string().min(8).max(256),
        publicKey: z.string().min(16),
        label: z.string().trim().min(1).max(80),
        transports: z.array(z.string()).optional(),
      }),
      request.body,
    );
    const created = await registerPasskey(app.deps, tenant.user, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/auth/passkeys', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const rows = await app.deps.store.listPasskeys(tenant.org.id, tenant.user.id);
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      signCount: row.signCount,
      createdAt: row.createdAt.toISOString(),
    }));
  });

  app.post('/api/v1/auth/passkeys/authenticate/options', async (request, reply) => {
    const body = parseBody(z.object({ email: emailSchema }), request.body);
    enforceRate(
      app.deps.rates,
      `login:${clientIp(request) ?? 'local'}:${body.email}`,
      app.deps.config.rateLimits.login,
      app.deps.now(),
      reply,
    );
    const user = await app.deps.store.findUserByEmail(body.email);
    return passkeyOptions(app.deps, 'authenticate', user ?? undefined);
  });

  app.post('/api/v1/auth/passkeys/authenticate', async (request, reply) => {
    const body = parseBody(
      z.object({
        challenge: z.string().min(10),
        credentialId: z.string().min(8),
        signCount: z.number().int().nonnegative(),
      }),
      request.body,
    );
    const session = await authenticatePasskey(app.deps, body, meta(request));
    setSessionCookie(app, reply, session.refreshToken);
    return session;
  });

  app.get('/api/v1/me', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return { user: presentUser(tenant.user), organization: presentOrg(tenant.org) };
  });

  app.get('/api/v1/org', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return presentOrg(tenant.org);
  });

  app.patch('/api/v1/org', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, ['owner']);
    const body = parseBody(z.object({ name: z.string().trim().min(2).max(80) }), request.body);
    const updated = await app.deps.store.updateOrg(tenant.org.id, { name: body.name });
    if (!updated) throw new ApiError('API-SRV-500');
    return presentOrg(updated);
  });

  app.put('/api/v1/org/mfa-policy', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, SECURITY_ROLES);
    assertEntitled(tenant.limits, 'orgMfaPolicy');
    const body = parseBody(z.object({ enforce: z.boolean() }), request.body);
    const updated = await app.deps.store.updateOrg(tenant.org.id, { enforceMfa: body.enforce });
    if (!updated) throw new ApiError('API-SRV-500');
    return { enforceMfa: updated.enforceMfa };
  });

  app.get('/api/v1/users', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, USER_READERS);
    const users = await app.deps.store.listUsers(tenant.org.id);
    return users.map(presentUser);
  });

  app.post('/api/v1/users', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        email: emailSchema,
        fullName: z.string().trim().min(1).max(80),
        password: passwordSchema,
        role: z.enum(ORG_ROLES).default('member'),
      }),
      request.body,
    );
    const created = await createUserAccount(
      app.deps,
      tenant,
      { ...body, role: body.role ?? 'member' },
      meta(request),
    );
    return reply.code(201).send(created);
  });

  app.post('/api/v1/users/:id/suspend', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return setUserActive(app.deps, tenant, params.id, false);
  });

  app.post('/api/v1/users/:id/restore', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return restoreUserAccount(app.deps, tenant, params.id);
  });

  app.delete('/api/v1/users/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    await deleteUserAccount(app.deps, tenant, params.id);
    return reply.code(204).send();
  });

  app.post('/api/v1/users/:id/password', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(z.object({ password: passwordSchema }), request.body);
    await resetUserPassword(app.deps, tenant, params.id, body.password);
    return reply.code(204).send();
  });

  app.delete('/api/v1/users/:id/sessions', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, SECURITY_ROLES);
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const user = await app.deps.store.findUser(tenant.org.id, params.id);
    if (!user) throw new ApiError('API-RES-404');
    await app.deps.store.revokeAllRefreshForUser(tenant.org.id, params.id, app.deps.now());
    return reply.code(204).send();
  });

  app.get('/api/v1/domains', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, [...DOMAIN_ROLES, 'read_only', 'billing_admin']);
    const rows = await app.deps.store.listDomains(tenant.org.id);
    return rows.map(presentDomain);
  });

  app.post('/api/v1/domains', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, DOMAIN_ROLES);
    const body = parseBody(
      z.object({
        domainName: z
          .string()
          .trim()
          .toLowerCase()
          .transform((value) => value.normalize('NFKC')),
      }),
      request.body,
    );
    const created = await createDomain(app.deps, tenant, body.domainName, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/domains/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const domain = await app.deps.store.findDomain(tenant.org.id, params.id);
    if (!domain) throw new ApiError('API-RES-404');
    return presentDomain(domain);
  });

  app.get('/api/v1/domains/:id/dns', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return { records: await dnsRecordsFor(app.deps, tenant, params.id) };
  });

  app.post('/api/v1/domains/:id/verify', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, DOMAIN_ROLES);
    enforceRate(
      app.deps.rates,
      `dns:${tenant.org.id}`,
      app.deps.config.rateLimits.dns,
      app.deps.now(),
      reply,
    );
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return verifyDomain(app.deps, tenant, params.id, meta(request));
  });

  app.patch('/api/v1/domains/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, DOMAIN_ROLES);
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({ catchAllMailboxId: z.string().uuid().nullable() }),
      request.body,
    );
    return setCatchAll(app.deps, tenant, params.id, body.catchAllMailboxId);
  });

  app.get('/api/v1/mailboxes', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listVisibleMailboxes(app.deps, tenant);
  });

  app.post('/api/v1/mailboxes', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        domainId: z.string().uuid(),
        localPart: z.string().trim().toLowerCase(),
        kind: z.enum(['user', 'shared', 'room_resource', 'equipment_resource']).default('user'),
        userId: z.string().uuid().optional(),
      }),
      request.body,
    );
    const created = await createMailbox(
      app.deps,
      tenant,
      { ...body, kind: body.kind ?? 'user' },
      meta(request),
    );
    return reply.code(201).send(created);
  });

  app.post('/api/v1/mailboxes/:id/aliases', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        localPart: z.string().trim().toLowerCase(),
        domainId: z.string().uuid(),
        label: z.string().trim().max(80).optional(),
      }),
      request.body,
    );
    const created = await createAlias(app.deps, tenant, params.id, body, meta(request));
    return reply.code(201).send(created);
  });

  app.delete('/api/v1/mailboxes/:id/aliases/:aliasId', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(
      z.object({ id: z.string().uuid(), aliasId: z.string().uuid() }),
      request.params,
    );
    await removeAlias(app.deps, tenant, params.id, params.aliasId);
    return reply.code(204).send();
  });

  app.post('/api/v1/mailboxes/:id/delegations', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        delegateUserId: z.string().uuid(),
        canRead: z.boolean().default(true),
        canSendAs: z.boolean().default(false),
        canSendOnBehalf: z.boolean().default(false),
      }),
      request.body,
    );
    const created = await createDelegation(app.deps, tenant, params.id, {
      delegateUserId: body.delegateUserId,
      canRead: body.canRead ?? true,
      canSendAs: body.canSendAs ?? false,
      canSendOnBehalf: body.canSendOnBehalf ?? false,
    });
    return reply.code(201).send(created);
  });

  app.post('/api/v1/mailboxes/:id/app-passwords', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(z.object({ label: z.string().trim().min(1).max(80) }), request.body);
    const created = await createAppPassword(app.deps, tenant, params.id, body.label);
    return reply.code(201).send(created);
  });

  app.get('/api/v1/mailboxes/:id/app-passwords', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return listAppPasswords(app.deps, tenant, params.id);
  });

  app.get('/api/v1/audit', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertEntitled(tenant.limits, 'audit');
    assertRole(tenant.user.role, AUDIT_ROLES);
    const since = new Date(
      app.deps.now().getTime() - tenant.limits.auditRetentionDays * 24 * 60 * 60 * 1000,
    );
    const rows = await app.deps.store.listAudit(tenant.org.id, since);
    return rows.slice(0, 200).map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      ipAddress: row.ipAddress,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }));
  });

  app.get('/api/v1/billing/plans', async () => planCatalog(app.deps));

  app.get('/api/v1/billing/subscription', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, BILLING_ROLES);
    return {
      id: tenant.subscription.id,
      status: tenant.subscription.status,
      cycle: tenant.subscription.cycle,
      currency: tenant.subscription.currency,
      seatLimit: tenant.subscription.seatLimit,
      paidAt: tenant.subscription.paidAt ? tenant.subscription.paidAt.toISOString() : null,
      currentPeriodEnd: tenant.subscription.currentPeriodEnd.toISOString(),
      plan: {
        tier: tenant.plan.tier,
        displayName: tenant.plan.displayName,
      },
    };
  });

  app.get('/api/v1/billing/usage', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, BILLING_ROLES);
    return usageSummary(app.deps, tenant);
  });

  app.get('/api/v1/billing/invoices', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, BILLING_ROLES);
    return invoiceList(app.deps, tenant);
  });

  app.post('/api/v1/billing/checkout', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, BILLING_ROLES);
    const body = parseBody(
      z.object({
        tier: z.enum(PLAN_TIERS),
        cycle: z.enum(['monthly', 'annual']),
        seats: z.number().int().positive(),
        placeOfSupply: z.string(),
        gstin: z.string().optional(),
      }),
      request.body,
    );
    const checkout = await createCheckout(app.deps, tenant, body, meta(request));
    return reply.code(201).send(checkout);
  });

  app.post('/api/v1/billing/webhooks/razorpay', async (request) => {
    const signature = request.headers['x-razorpay-signature'];
    return applyRazorpayWebhook(
      app.deps,
      request.rawBody ?? '',
      typeof signature === 'string' ? signature : undefined,
    );
  });

  app.get('/api/v1/mail/protocols', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const query = parseBody(
      z.object({ protocol: z.enum(['imap', 'smtp', 'pop3']).optional() }),
      request.query,
    );
    const access = protocolAccess(tenant);
    if (query.protocol && !tenant.limits.imap) {
      throw new ApiError('API-BILL-003', { feature: query.protocol, requiredTier: 'starter' });
    }
    return access;
  });

  app.post('/api/v1/mail/session', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return openSession(app.deps, tenant);
  });

  const folderSchema = z.enum(['inbox', 'sent', 'drafts', 'archive', 'spam']);

  app.get('/api/v1/mail/threads', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const listed = await listClientMessages(app.deps, tenant, {});
    return { threads: listed.messages };
  });

  app.get('/api/v1/mail/messages', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const query = parseBody(
      z
        .object({
          mailboxId: z.string().min(1).optional(),
          mailbox: folderSchema.optional(),
        })
        .refine((value) => Boolean(value.mailboxId || value.mailbox), {
          message: 'Pass mailboxId or mailbox.',
          path: ['mailboxId'],
        }),
      request.query,
    );
    return listClientMessages(app.deps, tenant, {
      ...(query.mailboxId ? { mailboxId: query.mailboxId } : {}),
      ...(query.mailbox ? { mailbox: query.mailbox } : {}),
    });
  });

  app.get('/api/v1/mail/messages/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    return readClientMessage(app.deps, tenant, params.id);
  });

  app.post('/api/v1/mail/messages', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z
        .object({
          from: emailSchema.optional(),
          to: z.union([emailSchema, z.array(z.string().min(1).max(254)).min(1).max(1000)]),
          subject: z.string().max(998),
          text: z.string().max(1_000_000).optional(),
          textBody: z.string().max(1_000_000).optional(),
          sizeBytes: z.number().int().nonnegative().optional(),
        })
        .refine((value) => value.text !== undefined || value.textBody !== undefined, {
          message: 'Add a message body.',
          path: ['text'],
        }),
      request.body,
    );
    let from = body.from;
    if (!from) {
      const own = (await app.deps.store.listMailboxes(tenant.org.id)).find(
        (row) => row.userId === tenant.user.id && row.kind === 'user',
      );
      if (!own) throw new ApiError('API-MAIL-005', { address: tenant.user.email });
      from = own.address;
    }
    const to = (Array.isArray(body.to) ? body.to : [body.to]).map((recipient) =>
      recipient.normalize('NFKC').trim().toLowerCase(),
    );
    const text = body.text ?? body.textBody ?? '';
    const sent = await submitMessage(
      app.deps,
      tenant,
      {
        from,
        to,
        subject: body.subject,
        text,
        ...(body.sizeBytes !== undefined ? { sizeBytes: body.sizeBytes } : {}),
      },
      meta(request),
    );
    return reply
      .code(201)
      .send(presentSentMessage(sent, text, tenant.user.fullName, app.deps.now().toISOString()));
  });

  app.post('/api/v1/mail/jmap', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = request.body as { methodCalls?: [] };
    return handleJmap(app.deps, tenant, body ?? {}, meta(request));
  });
}
