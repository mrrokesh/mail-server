import assert from 'node:assert/strict';
import test from 'node:test';
import { testConfig } from './config';
import { buildServer } from './server';

async function signupUser(
  app: ReturnType<typeof buildServer>,
  input: { email: string; name: string; org: string },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-up',
    payload: {
      name: input.name,
      email: input.email,
      password: 'Password!2026',
      organization: input.org,
      plan: 'business',
    },
  });
  assert.equal(res.statusCode, 201);
  return res.json() as {
    accessToken: string;
    user: { id: string; isOperator: boolean };
    organization: { id: string; name: string };
  };
}

test('operator console enforces operator allowlist and records tenant-visible audit trails', async () => {
  const app = buildServer({ logger: false, config: testConfig() });

  const customer = await signupUser(app, {
    email: 'owner@customer.example',
    name: 'Customer Owner',
    org: 'Customer Co',
  });
  const operator = await signupUser(app, {
    email: 'operator@mrrokesh.com',
    name: 'Platform Operator',
    org: 'MR Rokesh Internal',
  });

  assert.equal(customer.user.isOperator, false);
  assert.equal(operator.user.isOperator, true);

  // Regular tenant owner is denied (fail-closed)
  const denied = await app.inject({
    method: 'GET',
    url: '/api/v1/operator/overview',
    headers: { authorization: `Bearer ${customer.accessToken}` },
  });
  assert.equal(denied.statusCode, 403);
  assert.equal((denied.json() as { code: string }).code, 'API-AUTH-003');

  // Operator lists both orgs
  const overview = await app.inject({
    method: 'GET',
    url: '/api/v1/operator/overview',
    headers: { authorization: `Bearer ${operator.accessToken}` },
  });
  assert.equal(overview.statusCode, 200);
  const overviewBody = overview.json() as { orgs: { id: string }[] };
  assert.ok(overviewBody.orgs.some((o) => o.id === customer.organization.id));

  // Operator inspects and pauses sending on Customer Co -> writes audit inside Customer Co
  const inspected = await app.inject({
    method: 'POST',
    url: `/api/v1/operator/orgs/${customer.organization.id}/inspect`,
    headers: { authorization: `Bearer ${operator.accessToken}` },
    payload: { reason: 'Investigating bounce spike report' },
  });
  assert.equal(inspected.statusCode, 200);

  const moderated = await app.inject({
    method: 'PATCH',
    url: `/api/v1/operator/orgs/${customer.organization.id}`,
    headers: { authorization: `Bearer ${operator.accessToken}` },
    payload: { sendingPaused: true, reason: 'Temporary outbound hold' },
  });
  assert.equal(moderated.statusCode, 200);
  assert.equal((moderated.json() as { org: { sendingPaused: boolean } }).org.sendingPaused, true);

  // Customer tenant sees both operator actions in its own compliance audit log
  const customerAudit = await app.inject({
    method: 'GET',
    url: '/api/v1/audit',
    headers: { authorization: `Bearer ${customer.accessToken}` },
  });
  assert.equal(customerAudit.statusCode, 200);
  const actions = (customerAudit.json() as { action: string }[]).map((entry) => entry.action);
  assert.ok(actions.includes('operator.inspect'));
  assert.ok(actions.includes('operator.moderation'));

  // Operator queue triage works
  const queueCreate = await app.inject({
    method: 'POST',
    url: '/api/v1/operator/queue',
    headers: { authorization: `Bearer ${operator.accessToken}` },
    payload: {
      organizationId: customer.organization.id,
      category: 'bounce_rate',
      summary: 'High 550 bounce ratio on trial pool',
      severity: 'high',
      ipPool: 'trial',
    },
  });
  assert.equal(queueCreate.statusCode, 201);
  const queueId = (queueCreate.json() as { item: { id: string } }).item.id;
  const queueResolve = await app.inject({
    method: 'PATCH',
    url: `/api/v1/operator/queue/${queueId}`,
    headers: { authorization: `Bearer ${operator.accessToken}` },
    payload: { status: 'resolved' },
  });
  assert.equal(queueResolve.statusCode, 200);
  assert.equal((queueResolve.json() as { item: { status: string } }).item.status, 'resolved');

  await app.close();
});

test('partner reseller portal manages child tenants, margin pricing, act-as-admin, and webhooks', async () => {
  const app = buildServer({ logger: false, config: testConfig() });

  const reseller = await signupUser(app, {
    email: 'partner@agency.example',
    name: 'Partner Owner',
    org: 'CloudHost Partners',
  });

  // Update tier to gold (35% margin)
  const profRes = await app.inject({
    method: 'PUT',
    url: '/api/v1/partner/profile',
    headers: { authorization: `Bearer ${reseller.accessToken}` },
    payload: { tier: 'gold', companyLegalName: 'CloudHost Partners Pvt Ltd', gstin: null },
  });
  assert.equal(profRes.statusCode, 200);
  assert.equal(
    (profRes.json() as { profile: { marginPercent: number } }).profile.marginPercent,
    35,
  );

  // Provision managed customer tenant
  const createTenant = await app.inject({
    method: 'POST',
    url: '/api/v1/partner/tenants',
    headers: { authorization: `Bearer ${reseller.accessToken}` },
    payload: {
      customerName: 'Apex Designs',
      primaryDomain: 'apexdesigns.in',
      planTier: 'business',
      seats: 12,
      loginHost: 'mail.apexdesigns.in',
    },
  });
  assert.equal(createTenant.statusCode, 201);
  const tenantId = (createTenant.json() as { tenant: { id: string } }).tenant.id;

  // Audited act-as-admin
  const actRes = await app.inject({
    method: 'POST',
    url: `/api/v1/partner/tenants/${tenantId}/act-as-admin`,
    headers: { authorization: `Bearer ${reseller.accessToken}` },
    payload: {},
  });
  assert.equal(actRes.statusCode, 200);
  assert.equal((actRes.json() as { audited: boolean }).audited, true);

  // Webhook creation & overview aggregation
  const hookRes = await app.inject({
    method: 'POST',
    url: '/api/v1/partner/webhooks',
    headers: { authorization: `Bearer ${reseller.accessToken}` },
    payload: { url: 'https://hooks.agency.example/mrrokesh', events: ['tenant.created'] },
  });
  assert.equal(hookRes.statusCode, 201);

  const overview = await app.inject({
    method: 'GET',
    url: '/api/v1/partner/overview',
    headers: { authorization: `Bearer ${reseller.accessToken}` },
  });
  assert.equal(overview.statusCode, 200);
  const body = overview.json() as {
    metrics: { tenantCount: number; activeSeats: number; monthlyWholesalePaise: number };
    webhooks: { id: string }[];
  };
  assert.equal(body.metrics.tenantCount, 1);
  assert.equal(body.metrics.activeSeats, 12);
  assert.ok(body.metrics.monthlyWholesalePaise > 0);
  assert.equal(body.webhooks.length, 1);

  await app.close();
});
