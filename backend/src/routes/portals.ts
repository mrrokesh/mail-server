import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import {
  BILLING_ROLES,
  asUuid,
  assertRole,
  assertWritable,
  clientIp,
  loadTenant,
  parseBody,
  writeAudit,
} from '../services/access';
import type { OrgStatus } from '../store/types';

const PARTNER_TIER_MARGIN = {
  authorized: 20,
  silver: 28,
  gold: 35,
} as const;

const partnerTierSchema = z.enum(['authorized', 'silver', 'gold']);
const childPlanSchema = z.enum(['starter', 'business', 'business_plus', 'enterprise']);

function assertOperator(app: FastifyInstance, email: string): void {
  const allowed = app.deps.config.operatorEmails;
  if (!allowed.includes(email.trim().toLowerCase())) {
    throw new ApiError('API-AUTH-003');
  }
}

export function registerPortals(app: FastifyInstance): void {
  // ── Portal #8: Reseller / Partner Console (/api/v1/partner/*) ──────────

  app.get('/api/v1/partner/overview', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, BILLING_ROLES);
    const profile = app.deps.workspace.partnerProfileOf(tenant.org.id, tenant.org.name);
    const plans = await app.deps.store.listPlans();
    const rate = 1 - profile.marginPercent / 100;
    const wholesaleCatalog = plans
      .filter((plan) => plan.tier !== 'free')
      .map((plan) => ({
        tier: plan.tier,
        displayName: plan.displayName,
        retailMonthlyPaise: plan.priceInrMonthlyPaise,
        wholesaleMonthlyPaise: Math.round(plan.priceInrMonthlyPaise * rate),
        retailAnnualPaise: plan.priceInrAnnualPaise,
        wholesaleAnnualPaise: Math.round(plan.priceInrAnnualPaise * rate),
      }));
    const tenants = app.deps.workspace.listPartnerTenants(tenant.org.id);
    const priceByTier = new Map(
      wholesaleCatalog.map((item) => [item.tier, item.wholesaleAnnualPaise]),
    );
    const monthlyWholesalePaise = tenants
      .filter((item) => item.status !== 'suspended')
      .reduce((sum, item) => sum + (priceByTier.get(item.planTier) ?? 0) * item.seats, 0);
    return {
      profile,
      wholesaleCatalog,
      tenants,
      webhooks: app.deps.workspace.listPartnerWebhooks(tenant.org.id),
      metrics: {
        tenantCount: tenants.length,
        activeSeats: tenants.reduce((sum, item) => sum + item.seats, 0),
        monthlyWholesalePaise,
      },
    };
  });

  app.put('/api/v1/partner/profile', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const body = parseBody(
      z.object({
        tier: partnerTierSchema,
        companyLegalName: z.string().trim().min(2).max(120),
        gstin: z
          .string()
          .trim()
          .regex(/^[0-9A-Z]{15}$/)
          .nullable()
          .optional(),
      }),
      request.body,
    );
    const profile = app.deps.workspace.savePartnerProfile({
      organizationId: tenant.org.id,
      tier: body.tier,
      marginPercent: PARTNER_TIER_MARGIN[body.tier],
      companyLegalName: body.companyLegalName,
      gstin: body.gstin ?? null,
      updatedAt: app.deps.now().toISOString(),
    });
    await writeAudit(app.deps.store, {
      organizationId: tenant.org.id,
      actorUserId: tenant.user.id,
      requestId: asUuid(request.id),
      action: 'partner.profile.updated',
      targetType: 'organization',
      targetId: tenant.org.id,
      ipAddress: clientIp(request),
      metadata: { tier: body.tier, marginPercent: profile.marginPercent },
      at: app.deps.now(),
    });
    return { profile };
  });

  app.post('/api/v1/partner/tenants', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const body = parseBody(
      z.object({
        customerName: z.string().trim().min(2).max(120),
        primaryDomain: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
        planTier: childPlanSchema,
        seats: z.number().int().min(1).max(5000),
        loginHost: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)
          .nullable()
          .optional(),
      }),
      request.body,
    );
    const row = app.deps.workspace.savePartnerTenant({
      id: crypto.randomUUID(),
      organizationId: tenant.org.id,
      customerName: body.customerName,
      primaryDomain: body.primaryDomain,
      planTier: body.planTier,
      seats: body.seats,
      status: 'trialing',
      loginHost: body.loginHost ?? null,
      createdAt: app.deps.now().toISOString(),
    });
    await writeAudit(app.deps.store, {
      organizationId: tenant.org.id,
      actorUserId: tenant.user.id,
      requestId: asUuid(request.id),
      action: 'partner.tenant.created',
      targetType: 'partner_tenant',
      targetId: row.id,
      ipAddress: clientIp(request),
      metadata: { domain: row.primaryDomain, planTier: row.planTier, seats: row.seats },
      at: app.deps.now(),
    });
    return reply.code(201).send({ tenant: row });
  });

  app.patch('/api/v1/partner/tenants/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const existing = app.deps.workspace
      .listPartnerTenants(tenant.org.id)
      .find((item) => item.id === params.id);
    if (!existing) throw new ApiError('API-RES-404');
    const body = parseBody(
      z.object({
        seats: z.number().int().min(1).max(5000).optional(),
        planTier: childPlanSchema.optional(),
        status: z.enum(['active', 'trialing', 'suspended']).optional(),
      }),
      request.body,
    );
    const updated = app.deps.workspace.savePartnerTenant({
      ...existing,
      ...(body.seats !== undefined ? { seats: body.seats } : {}),
      ...(body.planTier !== undefined ? { planTier: body.planTier } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });
    await writeAudit(app.deps.store, {
      organizationId: tenant.org.id,
      actorUserId: tenant.user.id,
      requestId: asUuid(request.id),
      action: 'partner.tenant.updated',
      targetType: 'partner_tenant',
      targetId: updated.id,
      ipAddress: clientIp(request),
      metadata: { status: updated.status, seats: updated.seats, planTier: updated.planTier },
      at: app.deps.now(),
    });
    return { tenant: updated };
  });

  app.post('/api/v1/partner/tenants/:id/act-as-admin', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const target = app.deps.workspace
      .listPartnerTenants(tenant.org.id)
      .find((item) => item.id === params.id);
    if (!target) throw new ApiError('API-RES-404');
    const handoffId = crypto.randomUUID();
    await writeAudit(app.deps.store, {
      organizationId: tenant.org.id,
      actorUserId: tenant.user.id,
      requestId: asUuid(request.id),
      action: 'partner.act_as_admin',
      targetType: 'partner_tenant',
      targetId: target.id,
      ipAddress: clientIp(request),
      metadata: { customerName: target.customerName, domain: target.primaryDomain, handoffId },
      at: app.deps.now(),
    });
    return {
      handoffId,
      customerName: target.customerName,
      primaryDomain: target.primaryDomain,
      audited: true as const,
      expiresInSec: 900,
    };
  });

  app.post('/api/v1/partner/webhooks', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const body = parseBody(
      z.object({
        url: z
          .string()
          .trim()
          .url()
          .refine((val) => val.startsWith('https://'), 'Use HTTPS webhook URLs.'),
        events: z.array(z.string().trim().min(2).max(60)).min(1).max(10),
      }),
      request.body,
    );
    const secret = `whsec_ptn_${crypto.randomBytes(12).toString('hex')}`;
    const webhook = app.deps.workspace.addPartnerWebhook({
      id: crypto.randomUUID(),
      organizationId: tenant.org.id,
      url: body.url,
      events: body.events,
      secretHint: `${secret.slice(0, 12)}...`,
      enabled: true,
      createdAt: app.deps.now().toISOString(),
    });
    return reply.code(201).send({ webhook, signingSecretOnce: secret });
  });

  app.delete('/api/v1/partner/webhooks/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertWritable(tenant.subscription, app.deps.now());
    assertRole(tenant.user.role, BILLING_ROLES);
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    if (!app.deps.workspace.deletePartnerWebhook(tenant.org.id, params.id)) {
      throw new ApiError('API-RES-404');
    }
    return reply.code(204).send();
  });

  // ── Portal #7: MR Rokesh Operator & Abuse Console (/api/v1/operator/*) ──

  app.get('/api/v1/operator/overview', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertOperator(app, tenant.user.email);
    const rawOrgs = app.deps.store.listAllOrgs ? await app.deps.store.listAllOrgs() : [tenant.org];
    const orgs = await Promise.all(
      rawOrgs.map(async (org) => {
        const [sub, domains, mailboxes, activeUsers] = await Promise.all([
          app.deps.store.findSubscription(org.id),
          app.deps.store.listDomains(org.id),
          app.deps.store.listMailboxes(org.id),
          app.deps.store.countActiveUsers(org.id),
        ]);
        const plan = sub ? await app.deps.store.findPlanById(sub.planId) : null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          sendingPaused: org.sendingPaused,
          dataResidencyRegion: org.dataResidencyRegion,
          planTier: plan?.tier ?? 'free',
          subscriptionStatus: sub?.status ?? 'active',
          activeUsers,
          domainCount: domains.length,
          verifiedDomains: domains.filter((d) => d.isVerified).length,
          mailboxCount: mailboxes.length,
          createdAt: org.createdAt.toISOString(),
        };
      }),
    );
    const queue = app.deps.workspace.listOperatorQueue();
    return {
      operatorEmail: tenant.user.email,
      orgs,
      queue,
      summary: {
        totalOrgs: orgs.length,
        pausedSendingCount: orgs.filter((o) => o.sendingPaused).length,
        suspendedCount: orgs.filter((o) => o.status === 'suspended').length,
        openAbuseAlerts: queue.filter((q) => q.status === 'open').length,
      },
    };
  });

  app.post('/api/v1/operator/orgs/:orgId/inspect', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertOperator(app, tenant.user.email);
    const params = parseBody(z.object({ orgId: z.string().min(1) }), request.params);
    const body = parseBody(z.object({ reason: z.string().trim().min(3).max(200) }), request.body);
    const target = await app.deps.store.findOrg(params.orgId);
    if (!target) throw new ApiError('API-RES-404');
    // Mandatory append-only operator access log visible inside the target tenant's audit log
    await writeAudit(app.deps.store, {
      organizationId: target.id,
      actorUserId: null,
      requestId: asUuid(request.id),
      action: 'operator.inspect',
      targetType: 'organization',
      targetId: target.id,
      ipAddress: clientIp(request),
      metadata: {
        operatorEmail: tenant.user.email,
        operatorUserId: tenant.user.id,
        reason: body.reason,
      },
      at: app.deps.now(),
    });
    const [domains, users, mailboxes] = await Promise.all([
      app.deps.store.listDomains(target.id),
      app.deps.store.listUsers(target.id),
      app.deps.store.listMailboxes(target.id),
    ]);
    return {
      org: {
        id: target.id,
        name: target.name,
        slug: target.slug,
        status: target.status,
        sendingPaused: target.sendingPaused,
        enforceMfa: target.enforceMfa,
        dataResidencyRegion: target.dataResidencyRegion,
      },
      counts: {
        users: users.length,
        domains: domains.length,
        verifiedDomains: domains.filter((d) => d.isVerified).length,
        mailboxes: mailboxes.length,
      },
      domains: domains.map((d) => ({
        id: d.id,
        domainName: d.domainName,
        isVerified: d.isVerified,
        spfStatus: d.spfVerified ? 'verified' : 'waiting',
        dkimStatus: d.dkimVerified ? 'verified' : 'waiting',
        dmarcStatus: d.dmarcVerified ? 'verified' : 'waiting',
      })),
    };
  });

  app.patch('/api/v1/operator/orgs/:orgId', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertOperator(app, tenant.user.email);
    const params = parseBody(z.object({ orgId: z.string().min(1) }), request.params);
    const body = parseBody(
      z.object({
        sendingPaused: z.boolean().optional(),
        status: z.enum(['active', 'suspended']).optional(),
        reason: z.string().trim().min(3).max(200),
      }),
      request.body,
    );
    const target = await app.deps.store.findOrg(params.orgId);
    if (!target) throw new ApiError('API-RES-404');
    const updated = await app.deps.store.updateOrg(target.id, {
      ...(body.sendingPaused !== undefined ? { sendingPaused: body.sendingPaused } : {}),
      ...(body.status !== undefined ? { status: body.status as OrgStatus } : {}),
    });
    if (!updated) throw new ApiError('API-RES-404');
    await writeAudit(app.deps.store, {
      organizationId: target.id,
      actorUserId: null,
      requestId: asUuid(request.id),
      action: 'operator.moderation',
      targetType: 'organization',
      targetId: target.id,
      ipAddress: clientIp(request),
      metadata: {
        operatorEmail: tenant.user.email,
        sendingPaused: updated.sendingPaused,
        status: updated.status,
        reason: body.reason,
      },
      at: app.deps.now(),
    });
    return { org: updated };
  });

  app.post('/api/v1/operator/queue', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    assertOperator(app, tenant.user.email);
    const body = parseBody(
      z.object({
        organizationId: z.string().min(1),
        category: z.enum(['abuse_spike', 'spam_complaint', 'bounce_rate', 'trial_review']),
        summary: z.string().trim().min(4).max(240),
        severity: z.enum(['high', 'medium', 'low']),
        ipPool: z.enum(['trial', 'shared', 'dedicated']),
      }),
      request.body,
    );
    const target = await app.deps.store.findOrg(body.organizationId);
    if (!target) throw new ApiError('API-RES-404');
    const item = app.deps.workspace.saveOperatorQueueItem({
      id: crypto.randomUUID(),
      organizationId: target.id,
      orgName: target.name,
      category: body.category,
      summary: body.summary,
      severity: body.severity,
      status: 'open',
      ipPool: body.ipPool,
      createdAt: app.deps.now().toISOString(),
    });
    return reply.code(201).send({ item });
  });

  app.patch('/api/v1/operator/queue/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertOperator(app, tenant.user.email);
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const body = parseBody(z.object({ status: z.enum(['open', 'resolved']) }), request.body);
    const existing = app.deps.workspace.listOperatorQueue().find((row) => row.id === params.id);
    if (!existing) throw new ApiError('API-RES-404');
    const updated = app.deps.workspace.saveOperatorQueueItem({ ...existing, status: body.status });
    return { item: updated };
  });
}
