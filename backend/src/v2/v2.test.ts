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

async function signup(app: ReturnType<typeof makeApp>['app']): Promise<Account> {
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
      planTier: 'free',
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
  tier: 'starter' | 'business' | 'business_plus' | 'enterprise',
) {
  await ctx.store.seedPlans();
  const plan = await ctx.store.findPlanByTier(tier);
  assert.ok(plan);
  await ctx.store.updateSubscription(account.orgId, {
    planId: plan.id,
    status: 'active',
    paidAt: new Date(),
  });
}

const PUBLIC_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----
mQGNBGtest
-----END PGP PUBLIC KEY BLOCK-----`;
const WRAPPED_KEY = `wrapped.${'k'.repeat(48)}`;

test('chat supports direct, channel, thread, and search on Business', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  const headers = bearer(account.accessToken);
  const denied = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/chat/conversations',
    headers,
  });
  assert.equal((denied.json() as { code: string }).code, 'API-BILL-003');
  await useTier(ctx, account, 'business');
  const member = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers,
    payload: {
      email: `${nid('member')}@example.com`,
      fullName: 'Member',
      password: 'correct-horse',
    },
  });
  assert.equal(member.statusCode, 201, member.body);
  const memberId = (member.json() as { id: string }).id;
  const direct = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/chat/conversations',
    headers,
    payload: { kind: 'direct', title: 'Ada and Member', memberUserIds: [memberId] },
  });
  assert.equal(direct.statusCode, 201, direct.body);
  const directBody = direct.json() as { id: string; engine: string; adapter: string };
  assert.equal(directBody.engine, 'mrrokesh-chat');
  assert.equal(directBody.adapter, 'memory');
  const posted = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/chat/conversations/${directBody.id}/messages`,
    headers,
    payload: { body: 'Ship the DNS wizard' },
  });
  assert.equal(posted.statusCode, 201, posted.body);
  const rootId = (posted.json() as { id: string }).id;
  const reply = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/chat/conversations/${directBody.id}/messages`,
    headers,
    payload: { body: 'I will take MX', threadRootId: rootId },
  });
  assert.equal(reply.statusCode, 201, reply.body);
  const found = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/chat/search?q=wizard',
    headers,
  });
  assert.equal((found.json() as { messages: { body: string }[] }).messages.length, 1);
  const channel = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/chat/conversations',
    headers,
    payload: { kind: 'channel', title: 'General' },
  });
  assert.equal(channel.statusCode, 201, channel.body);
  const presence = await ctx.app.inject({ method: 'GET', url: '/api/v1/chat/presence', headers });
  assert.equal((presence.json() as { calendarLinked: boolean }).calendarLinked, false);
  await ctx.app.close();
});

test('masked aliases cap on Starter and key hooks do not claim encryption', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  await useTier(ctx, account, 'starter');
  const headers = bearer(account.accessToken);
  for (let index = 0; index < 10; index += 1) {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/privacy/aliases',
      headers,
      payload: { label: `Shop ${index}` },
    });
    assert.equal(created.statusCode, 201, created.body);
  }
  const capped = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/privacy/aliases',
    headers,
    payload: { label: 'One more' },
  });
  assert.equal((capped.json() as { code: string }).code, 'API-QUOTA-004');
  const dashboard = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/privacy/dashboard',
    headers,
  });
  assert.equal(
    (dashboard.json() as { trackers: { blocked: null; status: string } }).trackers.blocked,
    null,
  );
  const locked = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/privacy/keys',
    headers,
    payload: {
      address: account.email,
      publicKeyArmored: PUBLIC_KEY,
      wrappedPrivateKey: WRAPPED_KEY,
      fingerprint: 'ab'.repeat(16),
    },
  });
  assert.equal((locked.json() as { code: string }).code, 'API-BILL-003');
  const addon = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/privacy/addon',
    headers,
    payload: { enabled: true },
  });
  assert.equal(addon.statusCode, 200, addon.body);
  const saved = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/privacy/keys',
    headers,
    payload: {
      address: account.email,
      publicKeyArmored: PUBLIC_KEY,
      wrappedPrivateKey: WRAPPED_KEY,
      fingerprint: 'ab'.repeat(16),
    },
  });
  assert.equal(saved.statusCode, 200, saved.body);
  const key = saved.json() as { serverDecrypts: boolean; generatesKeys: boolean };
  assert.equal(key.serverDecrypts, false);
  assert.equal(key.generatesKeys, false);
  const bare = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/privacy/keys',
    headers,
    payload: {
      address: account.email,
      publicKeyArmored: '-----BEGIN PGP PRIVATE KEY BLOCK-----',
      wrappedPrivateKey: WRAPPED_KEY,
      fingerprint: 'cd'.repeat(16),
    },
  });
  assert.equal((bare.json() as { code: string }).code, 'API-VAL-001');
  const phrase = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/privacy/recovery',
    headers,
    payload: { registered: true, phrase: 'abandon abandon abandon' },
  });
  assert.equal((phrase.json() as { code: string }).code, 'API-VAL-001');
  const recovery = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/privacy/recovery',
    headers,
    payload: { registered: true },
  });
  assert.equal((recovery.json() as { phraseStored: boolean }).phraseStored, false);
  await ctx.app.close();
});

test('enterprise hooks do not deliver SIEM events or send simulations', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  await useTier(ctx, account, 'enterprise');
  const headers = bearer(account.accessToken);
  const material = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/enterprise/byok',
    headers,
    payload: { version: 2, kmsKeyRef: '-----BEGIN PRIVATE KEY-----' },
  });
  assert.equal((material.json() as { code: string }).code, 'API-VAL-001');
  const byok = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/enterprise/byok',
    headers,
    payload: { version: 2, kmsKeyRef: 'projects/acme/keys/mail/2' },
  });
  assert.equal(byok.statusCode, 201, byok.body);
  assert.equal((byok.json() as { appliedToMail: boolean }).appliedToMail, false);
  const siem = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/enterprise/siem',
    headers,
    payload: { kind: 'webhook', target: 'https://siem.example.com/hooks/mail' },
  });
  assert.equal(siem.statusCode, 201, siem.body);
  const sample = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/enterprise/siem/${(siem.json() as { id: string }).id}/sample`,
    headers,
  });
  assert.equal((sample.json() as { delivered: boolean }).delivered, false);
  const sim = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/enterprise/attack-simulations',
    headers,
    payload: { title: 'Invoice lure' },
  });
  assert.equal((sim.json() as { emailsSent: number; sendsMail: boolean }).emailsSent, 0);
  assert.equal((sim.json() as { sendsMail: boolean }).sendsMail, false);
  const ip = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/enterprise/dedicated-ip',
    headers,
    payload: { enabled: true },
  });
  assert.equal((ip.json() as { routed: boolean }).routed, false);
  await ctx.app.close();
});

test('white-label login host and campaigns stay off the mailbox', async () => {
  const ctx = makeApp();
  const account = await signup(ctx.app);
  await useTier(ctx, account, 'business_plus');
  const headers = bearer(account.accessToken);
  const colour = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/brand',
    headers,
    payload: {
      loginHost: 'mail.partner.example',
      productName: 'Partner Mail',
      color: '#ff00aa',
    },
  });
  assert.equal((colour.json() as { code: string }).code, 'API-VAL-001');
  const brand = await ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/admin/brand',
    headers,
    payload: {
      loginHost: 'mail.partner.example',
      productName: 'Partner Mail',
      logoUrl: 'https://cdn.example.com/logo.png',
    },
  });
  assert.equal(brand.statusCode, 200, brand.body);
  assert.equal((brand.json() as { accentToken: string }).accentToken, 'brand');
  const pub = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/public/brand?host=mail.partner.example',
  });
  assert.equal(
    (pub.json() as { productName: string; custom: boolean }).productName,
    'Partner Mail',
  );
  const before = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/messages?mailbox=sent',
    headers,
  });
  const sentBefore = (before.json() as { messages: unknown[] }).messages.length;
  const campaign = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/campaigns',
    headers,
    payload: { name: 'April note', subject: 'A note from Partner Mail' },
  });
  assert.equal(campaign.statusCode, 201, campaign.body);
  const view = campaign.json() as {
    sendsFromMailbox: boolean;
    headers: { 'List-Unsubscribe': string; 'List-Unsubscribe-Post': string };
    unsubscribeUrl: string;
  };
  assert.equal(view.sendsFromMailbox, false);
  assert.match(view.headers['List-Unsubscribe'], /^<https?:\/\/.+>$/);
  assert.equal(view.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  const after = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/messages?mailbox=sent',
    headers,
  });
  assert.equal((after.json() as { messages: unknown[] }).messages.length, sentBefore);
  const token = view.unsubscribeUrl.split('/').pop() ?? '';
  const form = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/public/campaigns/unsubscribe/${token}`,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: 'List-Unsubscribe=One-Click&email=reader%40example.com',
  });
  assert.equal(form.statusCode, 200, form.body);
  assert.equal((form.json() as { suppressed: boolean; already: boolean }).already, false);
  const again = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/public/campaigns/unsubscribe/${token}`,
    payload: { email: 'reader@example.com', 'List-Unsubscribe': 'One-Click' },
  });
  assert.equal((again.json() as { already: boolean }).already, true);
  await ctx.app.close();
});
