import assert from 'node:assert/strict';
import test from 'node:test';
import { testConfig } from '../config';
import { MapDns } from '../dns/lookup';
import { MockMailPlane } from '../mail/mock-plane';
import { buildServer } from '../server';
import { MemoryStore } from '../store/memory';

let serial = 0;
function nid(prefix: string): string {
  serial += 1;
  return `${prefix}-${serial}`;
}

function makeApp() {
  const store = new MemoryStore();
  const app = buildServer({
    logger: false,
    config: testConfig(),
    store,
    mail: new MockMailPlane(),
    dns: new MapDns(),
  });
  return { app, store };
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

interface Account {
  accessToken: string;
  email: string;
  orgId: string;
}

async function signup(
  app: ReturnType<typeof makeApp>['app'],
  extra?: { trial?: boolean; planTier?: string },
): Promise<Account> {
  const email = `${nid('owner')}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: {
      organizationName: 'Acme',
      slug: nid('acme'),
      email,
      password: 'correct-horse',
      fullName: 'Ada Owner',
      planTier: extra?.planTier ?? 'free',
      trial: extra?.trial ?? false,
    },
  });
  assert.equal(response.statusCode, 201, response.body);
  const json = response.json() as {
    session: { accessToken: string; organization: { id: string } };
  };
  return { accessToken: json.session.accessToken, email, orgId: json.session.organization.id };
}

async function useTier(
  ctx: ReturnType<typeof makeApp>,
  account: Account,
  tier: 'starter' | 'business' | 'business_plus',
) {
  const plan = await ctx.store.findPlanByTier(tier);
  assert.ok(plan);
  await ctx.store.updateSubscription(account.orgId, {
    planId: plan.id,
    status: 'active',
    paidAt: new Date(),
  });
}

test('drive, tasks, notes, calendar, and contacts work on free', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  const headers = bearer(account.accessToken);
  const file = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/drive/files',
    headers,
    payload: { name: 'brief.pdf', sizeBytes: 1200, contentType: 'application/pdf' },
  });
  assert.equal(file.statusCode, 201, file.body);
  const listed = await ctx.app.inject({ method: 'GET', url: '/api/v1/drive/files', headers });
  assert.equal((listed.json() as { files: { name: string }[] }).files[0]?.name, 'brief.pdf');
  const huge = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/drive/files',
    headers,
    payload: { name: 'huge.bin', sizeBytes: 250 * 1024 * 1024 + 1 },
  });
  assert.equal((huge.json() as { code: string }).code, 'API-DRV-001');
  const share = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/drive/files/${(file.json() as { id: string }).id}/shares`,
    headers,
    payload: {},
  });
  assert.equal((share.json() as { code: string }).code, 'API-BILL-003');
  const task = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/tasks',
    headers,
    payload: { title: 'Call Priya', priority: 'high' },
  });
  assert.equal(task.statusCode, 201, task.body);
  const note = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/notes',
    headers,
    payload: { title: 'Cutover', body: 'MX first.' },
  });
  assert.equal(note.statusCode, 201, note.body);
  const event = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/calendar/events',
    headers,
    payload: {
      title: 'Review',
      date: '2026-12-01',
      start: '16:00',
      end: '16:30',
      calendar: 'work',
    },
  });
  assert.equal(event.statusCode, 201, event.body);
  const events = await ctx.app.inject({ method: 'GET', url: '/api/v1/calendar/events', headers });
  const eventBody = events.json() as { events: { title: string; calendar: string }[] };
  assert.equal(eventBody.events[0]?.title, 'Review');
  assert.equal(eventBody.events[0]?.calendar, 'work');
  const contacts = await ctx.app.inject({ method: 'GET', url: '/api/v1/contacts', headers });
  const people = (contacts.json() as { contacts: { book: string; name: string }[] }).contacts;
  assert.equal(
    people.some((person) => person.book === 'directory' && person.name === 'Ada Owner'),
    true,
  );
  const other = await signup(ctx.app);
  const hidden = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/drive/files',
    headers: bearer(other.accessToken),
  });
  assert.equal((hidden.json() as { files: unknown[] }).files.length, 0);
  await ctx.app.close();
});

test('starter gates meet, booking, share links, and AI', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  const headers = bearer(account.accessToken);
  const blocked = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/ai/write',
    headers,
    payload: { prompt: 'Write a short reply.' },
  });
  assert.equal((blocked.json() as { code: string }).code, 'API-BILL-003');
  await useTier(ctx, account, 'starter');
  const file = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/drive/files',
    headers,
    payload: { name: 'deck.pdf', sizeBytes: 400 },
  });
  const shared = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/drive/files/${(file.json() as { id: string }).id}/shares`,
    headers,
    payload: { viewOnly: true, password: 'link-secret' },
  });
  assert.equal(shared.statusCode, 201, shared.body);
  const token = (shared.json() as { token: string }).token;
  const locked = await ctx.app.inject({ method: 'GET', url: `/api/v1/public/drive/${token}` });
  assert.equal((locked.json() as { locked: boolean }).locked, true);
  const open = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/public/drive/${token}?password=link-secret`,
  });
  assert.equal((open.json() as { name: string }).name, 'deck.pdf');
  const room = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/meet/rooms',
    headers,
    payload: { title: 'Studio review' },
  });
  assert.equal(room.statusCode, 201, room.body);
  assert.equal((room.json() as { adapter: string }).adapter, 'livekit-stub');
  const page = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/booking/pages',
    headers,
    payload: { title: 'Intro call', slug: nid('intro') },
  });
  assert.equal(page.statusCode, 201, page.body);
  const slug = (page.json() as { slug: string }).slug;
  const second = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/booking/pages',
    headers,
    payload: { title: 'Another', slug: nid('intro') },
  });
  assert.equal((second.json() as { code: string }).code, 'API-QUOTA-003');
  const published = await ctx.app.inject({ method: 'GET', url: `/api/v1/public/booking/${slug}` });
  const slot = (published.json() as { slots: string[] }).slots[0];
  assert.ok(slot);
  const booked = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/public/booking/${slug}`,
    payload: { start: slot, name: 'Kavya', email: 'kavya@client.example' },
  });
  assert.equal(booked.statusCode, 201, booked.body);
  const clash = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/public/booking/${slug}`,
    payload: { start: slot, name: 'Rohan', email: 'rohan@client.example' },
  });
  assert.equal((clash.json() as { code: string }).code, 'API-CAL-001');
  const draft = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/ai/write',
    headers,
    payload: { prompt: 'Thanks for the review.' },
  });
  assert.equal(draft.statusCode, 200, draft.body);
  assert.match((draft.json() as { text: string }).text, /Thanks for the review/);
  const off = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/ai',
    headers,
    payload: { enabled: false },
  });
  assert.equal((off.json() as { enabled: boolean }).enabled, false);
  const denied = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/ai/summarize',
    headers,
    payload: { text: 'A long thread about DNS.' },
  });
  assert.equal((denied.json() as { code: string }).code, 'API-AUTH-003');
  await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/ai',
    headers,
    payload: { enabled: true },
  });
  for (let index = 0; index < 24; index += 1) {
    await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/ai/write',
      headers,
      payload: { prompt: `note ${index}` },
    });
  }
  const quota = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/ai/write',
    headers,
    payload: { prompt: 'one more' },
  });
  assert.equal((quota.json() as { code: string }).code, 'API-QUOTA-006');
  await ctx.app.close();
});

test('business docs and business plus compliance, SSO, and SCIM', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app, { trial: true, planTier: 'business' });
  const headers = bearer(account.accessToken);
  const doc = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/docs',
    headers,
    payload: { name: 'Invoice', kind: 'spreadsheet', template: 'gst-invoice' },
  });
  assert.equal(doc.statusCode, 201, doc.body);
  const id = (doc.json() as { id: string }).id;
  const check = await ctx.app.inject({ method: 'GET', url: `/api/v1/docs/${id}/wopi`, headers });
  assert.equal((check.json() as { adapter: string }).adapter, 'wopi-stub');
  assert.equal((check.json() as { BaseFileName: string }).BaseFileName, 'Invoice');
  const protocols = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/protocols?protocol=activesync',
    headers,
  });
  assert.equal(protocols.statusCode, 200, protocols.body);
  assert.equal((protocols.json() as { activesync: boolean }).activesync, true);
  const held = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/compliance/holds',
    headers,
    payload: { matter: 'Vendor dispute' },
  });
  assert.equal((held.json() as { code: string }).code, 'API-BILL-003');
  await useTier(ctx, account, 'business_plus');
  const hold = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/compliance/holds',
    headers,
    payload: { matter: 'Vendor dispute' },
  });
  assert.equal(hold.statusCode, 201, hold.body);
  const archive = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/compliance/archive',
    headers,
    payload: { enabled: true },
  });
  assert.equal((archive.json() as { enabled: boolean }).enabled, true);
  const sso = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/sso',
    headers,
    payload: {
      protocol: 'oidc',
      issuer: 'https://idp.example.com',
      metadata: 'client-secret-do-not-leak',
    },
  });
  assert.equal(sso.statusCode, 200, sso.body);
  assert.equal(JSON.stringify(sso.json()).includes('client-secret-do-not-leak'), false);
  assert.equal((await ctx.store.findOrg(account.orgId))?.ssoEnabled, true);
  const token = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/admin/scim/tokens',
    headers,
    payload: { label: 'Entra' },
  });
  assert.equal(token.statusCode, 201, token.body);
  const scim = (token.json() as { token: string }).token;
  const user = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/scim/v2/Users',
    headers: bearer(scim),
    payload: { userName: 'neel@example.com', name: { formatted: 'Neel Kapoor' } },
  });
  assert.equal(user.statusCode, 201, user.body);
  const list = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/scim/v2/Users',
    headers: bearer(scim),
  });
  assert.equal((list.json() as { totalResults: number }).totalResults, 1);
  await ctx.app.close();
});

test('web list shapes for users, domains, and plans', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  const headers = bearer(account.accessToken);
  const users = await ctx.app.inject({ method: 'GET', url: '/api/v1/users', headers });
  const owner = (users.json() as { name: string; status: string; fullName: string }[])[0];
  assert.equal(owner?.name, 'Ada Owner');
  assert.equal(owner?.status, 'active');
  assert.equal(owner?.fullName, 'Ada Owner');
  const invited = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers,
    payload: { name: 'Priya Shah', email: `${nid('priya')}@example.com`, role: 'User' },
  });
  assert.equal(invited.statusCode, 201, invited.body);
  assert.equal(
    typeof (invited.json() as { temporaryPassword?: string }).temporaryPassword,
    'string',
  );
  const domain = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers,
    payload: { name: `${nid('northwind')}.test` },
  });
  assert.equal(domain.statusCode, 201, domain.body);
  const created = domain.json() as {
    name: string;
    checks: { id: string; status: string }[];
    domain: { id: string };
  };
  assert.equal(
    created.checks.some((check) => check.id === 'ownership'),
    true,
  );
  const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/domains', headers });
  const rows = list.json() as { name: string; checks: unknown[] }[];
  assert.equal(rows[0]?.name, created.name);
  assert.ok(rows[0]?.checks.length);
  const plans = await ctx.app.inject({ method: 'GET', url: '/api/v1/plans' });
  const catalog = plans.json() as { plans: { id: string }[]; privacyAnnualInr: number };
  assert.equal(
    catalog.plans.some((plan) => plan.id === 'business_plus'),
    true,
  );
  assert.equal(catalog.privacyAnnualInr, 99);
  const freeExchange = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/protocols?protocol=ews',
    headers,
  });
  assert.equal((freeExchange.json() as { code: string }).code, 'API-BILL-003');
  await ctx.app.close();
});
