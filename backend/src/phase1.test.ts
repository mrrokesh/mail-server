import assert from 'node:assert/strict';
import test from 'node:test';
import { utcDay } from './billing/entitlements';
import { razorpaySignature } from './billing/razorpay';
import { testConfig, type AppConfig } from './config';
import { totpCode } from './crypto/totp';
import { MapDns } from './dns/lookup';
import { HttpStalwartPlane } from './mail/http-stalwart';
import { MockMailPlane } from './mail/mock-plane';
import { buildServer, type BuildOptions } from './server';
import { MemoryStore } from './store/memory';

let serial = 0;
function nid(prefix: string): string {
  serial += 1;
  return `${prefix}-${serial}`;
}

function makeApp(options?: { config?: AppConfig; now?: () => Date }) {
  const dns = new MapDns();
  const store = new MemoryStore();
  const mail = new MockMailPlane();
  const build: BuildOptions = {
    logger: false,
    config: options?.config ?? testConfig(),
    store,
    mail,
    dns,
  };
  if (options?.now) build.now = options.now;
  return { app: buildServer(build), dns, store, mail };
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

interface Account {
  accessToken: string;
  refreshToken: string;
  userId: string;
  orgId: string;
  email: string;
}

async function signup(
  app: ReturnType<typeof makeApp>['app'],
  extra?: { trial?: boolean; planTier?: string; password?: string },
): Promise<{ status: number; body: string; account?: Account }> {
  const email = `${nid('owner')}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: {
      organizationName: 'Acme',
      slug: nid('acme'),
      email,
      password: extra?.password ?? 'correct-horse',
      fullName: 'Ada Owner',
      planTier: extra?.planTier ?? 'free',
      trial: extra?.trial ?? false,
    },
  });
  if (response.statusCode !== 201) return { status: response.statusCode, body: response.body };
  const json = response.json() as {
    session: {
      accessToken: string;
      refreshToken: string;
      user: { id: string };
      organization: { id: string };
    };
  };
  return {
    status: 201,
    body: response.body,
    account: {
      accessToken: json.session.accessToken,
      refreshToken: json.session.refreshToken,
      userId: json.session.user.id,
      orgId: json.session.organization.id,
      email,
    },
  };
}

function plant(
  dns: MapDns,
  records: Array<{ type: string; host: string; value: string; purpose: string }>,
) {
  for (const record of records) {
    if (record.purpose === 'mx') {
      dns.setMx(record.host, [{ exchange: 'mx1.rokeshcloud.com', priority: 10 }]);
      continue;
    }
    if (record.type === 'CNAME') dns.setCname(record.host, [record.value]);
    if (record.type === 'TXT') dns.setTxt(record.host, [record.value]);
  }
}

async function readyMailbox(ctx: ReturnType<typeof makeApp>, account: Account, localPart = 'ada') {
  const domainName = `${nid('d')}.test`;
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(account.accessToken),
    payload: { domainName },
  });
  assert.equal(created.statusCode, 201, created.body);
  const createdBody = created.json() as {
    domain: { id: string };
    records: Array<{ type: string; host: string; value: string; purpose: string }>;
  };
  assert.equal(JSON.stringify(createdBody).includes('PRIVATE'), false);
  plant(ctx.dns, createdBody.records);
  const verified = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/domains/${createdBody.domain.id}/verify`,
    headers: bearer(account.accessToken),
  });
  assert.equal(verified.statusCode, 200, verified.body);
  const mailbox = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mailboxes',
    headers: bearer(account.accessToken),
    payload: { domainId: createdBody.domain.id, localPart, kind: 'user' },
  });
  assert.equal(mailbox.statusCode, 201, mailbox.body);
  const mailboxBody = mailbox.json() as {
    mailbox: { id: string; address: string };
    syncStatus: string;
  };
  assert.equal(mailboxBody.syncStatus, 'synced');
  assert.equal(
    ctx.mail.principals.has(mailboxBody.mailbox.id) || ctx.mail.principals.size > 0,
    true,
  );
  return {
    domainId: createdBody.domain.id,
    domainName,
    address: mailboxBody.mailbox.address,
    mailboxId: mailboxBody.mailbox.id,
  };
}

test('signup, refresh rotation, and reuse detection', async () => {
  const { app } = makeApp();
  const created = await signup(app);
  assert.equal(created.status, 201, created.body);
  const account = created.account as Account;
  const refreshed = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    payload: { refreshToken: account.refreshToken },
  });
  assert.equal(refreshed.statusCode, 200, refreshed.body);
  const next = refreshed.json() as { refreshToken: string };
  assert.notEqual(next.refreshToken, account.refreshToken);
  const reused = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    payload: { refreshToken: account.refreshToken },
  });
  assert.equal(reused.statusCode, 401);
  assert.equal((reused.json() as { details: { reason: string } }).details.reason, 'refresh_reused');
  const family = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    payload: { refreshToken: next.refreshToken },
  });
  assert.equal(family.statusCode, 401);
  await app.close();
});

test('unknown email and wrong password share API-AUTH-001', async () => {
  const { app } = makeApp();
  const created = await signup(app);
  const account = created.account as Account;
  const unknown = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: `${nid('missing')}@example.com`, password: 'correct-horse' },
  });
  const known = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: account.email, password: 'not-the-password' },
  });
  assert.equal(unknown.statusCode, 401);
  assert.equal(known.statusCode, 401);
  assert.equal((unknown.json() as { code: string }).code, 'API-AUTH-001');
  assert.equal(
    (unknown.json() as { message: string }).message,
    (known.json() as { message: string }).message,
  );
  await app.close();
});

test('short passwords and expired access tokens are rejected', async () => {
  let now = new Date('2026-01-01T00:00:00Z');
  const { app } = makeApp({ config: testConfig({ accessTtlSec: 60 }), now: () => now });
  const tooShort = await signup(app, { password: 'short' });
  assert.equal(tooShort.status, 422);
  assert.equal((JSON.parse(tooShort.body) as { code: string }).code, 'API-VAL-001');
  const created = await signup(app);
  assert.equal(created.status, 201, created.body);
  now = new Date('2026-01-01T00:02:00Z');
  const me = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: bearer((created.account as Account).accessToken),
  });
  assert.equal(me.statusCode, 401);
  assert.equal((me.json() as { code: string }).code, 'API-AUTH-002');
  await app.close();
});

test('login is rate limited', async () => {
  const { app } = makeApp({
    config: testConfig({
      rateLimits: {
        login: { limit: 2, windowMs: 60_000 },
        signup: { limit: 20, windowMs: 60_000 },
        passwordReset: { limit: 5, windowMs: 60_000 },
        dns: { limit: 30, windowMs: 60_000 },
      },
    }),
  });
  const email = `${nid('rate')}@example.com`;
  const attempt = () =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'correct-horse' },
    });
  assert.equal((await attempt()).statusCode, 401);
  assert.equal((await attempt()).statusCode, 401);
  const blocked = await attempt();
  assert.equal(blocked.statusCode, 429);
  assert.equal((blocked.json() as { code: string }).code, 'API-RATE-429');
  await app.close();
});

test('totp is required after confirmation', async () => {
  const { app } = makeApp();
  const created = await signup(app);
  const account = created.account as Account;
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa/totp/setup',
    headers: bearer(account.accessToken),
  });
  assert.equal(setup.statusCode, 200, setup.body);
  const secret = (setup.json() as { secret: string }).secret;
  const confirm = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa/totp/confirm',
    headers: bearer(account.accessToken),
    payload: { code: totpCode(secret, new Date()) },
  });
  assert.equal(confirm.statusCode, 200, confirm.body);
  const missing = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: account.email, password: 'correct-horse' },
  });
  assert.equal(missing.statusCode, 200, missing.body);
  const challenge = missing.json() as {
    mfaRequired?: boolean;
    challengeToken?: string;
    accessToken?: string;
  };
  assert.equal(challenge.mfaRequired, true);
  assert.equal(typeof challenge.challengeToken, 'string');
  assert.equal(challenge.accessToken, undefined);
  const rejected = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa/verify',
    payload: { challengeToken: challenge.challengeToken, code: '000000' },
  });
  assert.equal((rejected.json() as { code: string }).code, 'API-SEC-002');
  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa/verify',
    payload: { challengeToken: challenge.challengeToken, totpCode: totpCode(secret, new Date()) },
  });
  assert.equal(verified.statusCode, 200, verified.body);
  assert.equal(typeof (verified.json() as { accessToken?: string }).accessToken, 'string');
  const signedIn = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: account.email,
      password: 'correct-horse',
      totpCode: totpCode(secret, new Date()),
    },
  });
  assert.equal(signedIn.statusCode, 200, signedIn.body);
  await app.close();
});

test('passkey hook rejects a replayed counter', async () => {
  const { app } = makeApp();
  const created = await signup(app);
  const account = created.account as Account;
  const options = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys/options',
    headers: bearer(account.accessToken),
  });
  const credentialId = `cred-${nid('key')}`;
  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys',
    headers: bearer(account.accessToken),
    payload: {
      challenge: (options.json() as { challenge: string }).challenge,
      credentialId,
      publicKey: Buffer.alloc(32, 9).toString('base64url'),
      label: 'Laptop',
    },
  });
  assert.equal(registered.statusCode, 201, registered.body);
  const start = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys/authenticate/options',
    payload: { email: account.email },
  });
  const ok = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys/authenticate',
    payload: {
      challenge: (start.json() as { challenge: string }).challenge,
      credentialId,
      signCount: 1,
    },
  });
  assert.equal(ok.statusCode, 200, ok.body);
  const again = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys/authenticate/options',
    payload: { email: account.email },
  });
  const replay = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/passkeys/authenticate',
    payload: {
      challenge: (again.json() as { challenge: string }).challenge,
      credentialId,
      signCount: 1,
    },
  });
  assert.equal(replay.statusCode, 401);
  assert.equal((replay.json() as { code: string }).code, 'API-SEC-002');
  await app.close();
});

test('tenants cannot read each other and org patch cannot set abuse flags', async () => {
  const ctx = makeApp();
  const first = await signup(ctx.app);
  const second = await signup(ctx.app);
  const a = first.account as Account;
  const b = second.account as Account;
  const domain = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(a.accessToken),
    payload: { domainName: `${nid('iso')}.test` },
  });
  assert.equal(domain.statusCode, 201, domain.body);
  const domainId = (domain.json() as { domain: { id: string } }).domain.id;
  const mailbox = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mailboxes',
    headers: bearer(a.accessToken),
    payload: { domainId, localPart: 'ada', kind: 'user' },
  });
  assert.equal(mailbox.statusCode, 201, mailbox.body);
  const address = (mailbox.json() as { mailbox: { address: string } }).mailbox.address;
  const hidden = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/domains/${domainId}`,
    headers: bearer(b.accessToken),
  });
  assert.equal(hidden.statusCode, 404);
  assert.equal((hidden.json() as { code: string }).code, 'API-RES-404');
  const list = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mailboxes',
    headers: bearer(b.accessToken),
  });
  assert.equal(JSON.stringify(list.json()).includes(address), false);
  const renamed = await ctx.app.inject({
    method: 'PATCH',
    url: '/api/v1/org',
    headers: bearer(a.accessToken),
    payload: { name: 'Renamed', sendingPaused: true, organizationId: b.orgId },
  });
  assert.equal(renamed.statusCode, 200, renamed.body);
  assert.equal((await ctx.store.findOrg(a.orgId))?.sendingPaused, false);
  assert.equal((await ctx.store.findOrg(b.orgId))?.name, 'Acme');
  const taken = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(b.accessToken),
    payload: {
      domainName: (domain.json() as { domain: { domainName: string } }).domain.domainName,
    },
  });
  assert.equal(taken.statusCode, 409);
  assert.equal((taken.json() as { code: string }).code, 'API-DNS-007');
  await ctx.app.close();
});

test('free plan enforces domain, alias, shared mailbox, and audit limits', async () => {
  const ctx = makeApp();
  const created = await signup(ctx.app);
  const account = created.account as Account;
  const first = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(account.accessToken),
    payload: { domainName: `${nid('free')}.test` },
  });
  assert.equal(first.statusCode, 201, first.body);
  const domainId = (first.json() as { domain: { id: string } }).domain.id;
  const second = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(account.accessToken),
    payload: { domainName: `${nid('free')}.test` },
  });
  assert.equal((second.json() as { code: string }).code, 'API-QUOTA-005');
  const unverified = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/domains/${domainId}/verify`,
    headers: bearer(account.accessToken),
  });
  assert.equal((unverified.json() as { code: string }).code, 'API-DNS-001');
  const mailbox = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mailboxes',
    headers: bearer(account.accessToken),
    payload: { domainId, localPart: 'ada', kind: 'user' },
  });
  const mailboxId = (mailbox.json() as { mailbox: { id: string } }).mailbox.id;
  for (let index = 0; index < 5; index += 1) {
    const alias = await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/mailboxes/${mailboxId}/aliases`,
      headers: bearer(account.accessToken),
      payload: { localPart: `alias${index}`, domainId },
    });
    assert.equal(alias.statusCode, 201, alias.body);
  }
  const extra = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/mailboxes/${mailboxId}/aliases`,
    headers: bearer(account.accessToken),
    payload: { localPart: 'alias-extra', domainId },
  });
  assert.equal((extra.json() as { code: string }).code, 'API-QUOTA-004');
  const shared = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mailboxes',
    headers: bearer(account.accessToken),
    payload: { domainId, localPart: 'team', kind: 'shared' },
  });
  assert.equal((shared.json() as { code: string }).code, 'API-BILL-003');
  const audit = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/audit',
    headers: bearer(account.accessToken),
  });
  assert.equal((audit.json() as { code: string }).code, 'API-BILL-003');
  const protocols = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/protocols?protocol=imap',
    headers: bearer(account.accessToken),
  });
  assert.equal((protocols.json() as { code: string }).code, 'API-BILL-003');
  await ctx.app.close();
});

test('sending limits and dns verification gate outbound mail', async () => {
  const ctx = makeApp();
  const created = await signup(ctx.app);
  const account = created.account as Account;
  const domain = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/domains',
    headers: bearer(account.accessToken),
    payload: { domainName: `${nid('send')}.test` },
  });
  const domainBody = domain.json() as { domain: { id: string; domainName: string } };
  const mailbox = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mailboxes',
    headers: bearer(account.accessToken),
    payload: { domainId: domainBody.domain.id, localPart: 'ada', kind: 'user' },
  });
  const address = (mailbox.json() as { mailbox: { address: string; id: string } }).mailbox.address;
  const blocked = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: { from: address, to: ['bob@outside.test'], subject: 'Hi', text: 'Hello' },
  });
  assert.equal((blocked.json() as { code: string }).code, 'API-MAIL-004');
  const records = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/domains/${domainBody.domain.id}/dns`,
    headers: bearer(account.accessToken),
  });
  plant(
    ctx.dns,
    (
      records.json() as {
        records: Array<{ type: string; host: string; value: string; purpose: string }>;
      }
    ).records,
  );
  const verified = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/domains/${domainBody.domain.id}/verify`,
    headers: bearer(account.accessToken),
  });
  assert.equal(verified.statusCode, 200, verified.body);
  const tooMany = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: {
      from: address,
      to: Array.from({ length: 51 }, (_, index) => `r${index}@outside.test`),
      subject: 'Hi',
      text: 'Hello',
    },
  });
  assert.equal((tooMany.json() as { code: string }).code, 'API-MAIL-002');
  const huge = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: {
      from: address,
      to: ['bob@outside.test'],
      subject: 'Hi',
      text: 'Hello',
      sizeBytes: 26 * 1024 * 1024,
    },
  });
  assert.equal((huge.json() as { code: string }).code, 'API-MAIL-001');
  await ctx.store.reserveSend({
    organizationId: account.orgId,
    userId: account.userId,
    day: utcDay(new Date()),
    minute: '1999-01-01T00:00',
    addMessages: 100,
    addRecipients: 100,
    addExternal: 0,
    maxMessagesPerDay: 10_000,
    maxRecipientsPerDay: 10_000,
    maxExternalPerDay: 10_000,
    maxPerMinute: 10_000,
  });
  const capped = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: { from: address, to: [address], subject: 'Hi', text: 'Hello' },
  });
  assert.equal((capped.json() as { code: string }).code, 'API-QUOTA-002');
  const session = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/session',
    headers: bearer(account.accessToken),
  });
  assert.equal(session.statusCode, 200, session.body);
  assert.equal((session.json() as { ipPool: string }).ipPool, 'free');
  await ctx.app.close();
});

test('business trial caps external recipients at 200', async () => {
  const ctx = makeApp();
  const created = await signup(ctx.app, { trial: true, planTier: 'business' });
  assert.equal(created.status, 201, created.body);
  const ready = await readyMailbox(ctx, created.account as Account);
  const sent = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer((created.account as Account).accessToken),
    payload: {
      from: ready.address,
      to: Array.from({ length: 201 }, (_, index) => `p${index}@outside.test`),
      subject: 'Hi',
      text: 'Hello',
    },
  });
  assert.equal(sent.statusCode, 429, sent.body);
  assert.equal((sent.json() as { details: { reason: string } }).details.reason, 'external');
  await ctx.app.close();
});

test('razorpay stub, gst split, and paid entitlements', async () => {
  const ctx = makeApp();
  const created = await signup(ctx.app);
  const account = created.account as Account;
  const badGst = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/checkout',
    headers: bearer(account.accessToken),
    payload: {
      tier: 'starter',
      cycle: 'monthly',
      seats: 2,
      placeOfSupply: '29',
      gstin: 'not-a-gstin',
    },
  });
  assert.equal((badGst.json() as { code: string }).code, 'API-BILL-004');
  const intra = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/checkout',
    headers: bearer(account.accessToken),
    payload: {
      tier: 'starter',
      cycle: 'monthly',
      seats: 2,
      placeOfSupply: '29',
      gstin: '29ABCDE1234F1Z5',
    },
  });
  assert.equal(intra.statusCode, 201, intra.body);
  const intraBody = intra.json() as {
    checkoutId: string;
    gst: { cgstPaise: number; igstPaise: number };
  };
  assert.ok(intraBody.gst.cgstPaise > 0);
  assert.equal(intraBody.gst.igstPaise, 0);
  const inter = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/checkout',
    headers: bearer(account.accessToken),
    payload: {
      tier: 'starter',
      cycle: 'annual',
      seats: 1,
      placeOfSupply: '27',
      gstin: '27ABCDE1234F1Z5',
    },
  });
  assert.ok((inter.json() as { gst: { igstPaise: number } }).gst.igstPaise > 0);
  const raw = JSON.stringify({
    event: 'payment.captured',
    checkoutId: intraBody.checkoutId,
    paymentId: 'pay_test',
  });
  const unsigned = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhooks/razorpay',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'deadbeef' },
    payload: raw,
  });
  assert.equal((unsigned.json() as { code: string }).code, 'API-BILL-001');
  const paid = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhooks/razorpay',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': razorpaySignature('whsec_test_local', raw),
    },
    payload: raw,
  });
  assert.equal(paid.statusCode, 200, paid.body);
  const audit = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/audit',
    headers: bearer(account.accessToken),
  });
  assert.equal(audit.statusCode, 200, audit.body);
  const ready = await readyMailbox(ctx, account);
  const catchAll = await ctx.app.inject({
    method: 'PATCH',
    url: `/api/v1/domains/${ready.domainId}`,
    headers: bearer(account.accessToken),
    payload: { catchAllMailboxId: ready.mailboxId },
  });
  assert.equal(catchAll.statusCode, 200, catchAll.body);
  const appPassword = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/mailboxes/${ready.mailboxId}/app-passwords`,
    headers: bearer(account.accessToken),
    payload: { label: 'Phone' },
  });
  assert.equal(appPassword.statusCode, 201, appPassword.body);
  const secret = (appPassword.json() as { password: string }).password;
  assert.ok(secret.startsWith('mrm_'));
  const listed = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/mailboxes/${ready.mailboxId}/app-passwords`,
    headers: bearer(account.accessToken),
  });
  assert.equal(JSON.stringify(listed.json()).includes(secret), false);
  const haltRaw = JSON.stringify({
    event: 'subscription.halted',
    checkoutId: intraBody.checkoutId,
  });
  await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhooks/razorpay',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': razorpaySignature('whsec_test_local', haltRaw),
    },
    payload: haltRaw,
  });
  const paused = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: { from: ready.address, to: [ready.address], subject: 'Hi', text: 'Hello' },
  });
  assert.equal((paused.json() as { code: string }).code, 'API-BILL-005');
  await ctx.store.updateOrg(account.orgId, { status: 'suspended' });
  const suspended = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: bearer(account.accessToken),
  });
  assert.equal((suspended.json() as { code: string }).code, 'API-TEN-001');
  await ctx.app.close();
});

test('helpdesk cannot delete a user and seats stop at the free cap', async () => {
  const ctx = makeApp();
  const created = await signup(ctx.app);
  const account = created.account as Account;
  const helpdeskEmail = `${nid('help')}@example.com`;
  const helpdesk = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: bearer(account.accessToken),
    payload: {
      email: helpdeskEmail,
      fullName: 'Help Desk',
      password: 'correct-horse',
      role: 'helpdesk',
    },
  });
  assert.equal(helpdesk.statusCode, 201, helpdesk.body);
  const member = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: bearer(account.accessToken),
    payload: {
      email: `${nid('member')}@example.com`,
      fullName: 'Member',
      password: 'correct-horse',
      role: 'member',
    },
  });
  const memberId = (member.json() as { id: string }).id;
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: helpdeskEmail, password: 'correct-horse' },
  });
  const helpToken = (login.json() as { accessToken: string }).accessToken;
  const removed = await ctx.app.inject({
    method: 'DELETE',
    url: `/api/v1/users/${memberId}`,
    headers: bearer(helpToken),
  });
  assert.equal((removed.json() as { code: string }).code, 'API-AUTH-003');
  for (let index = 0; index < 2; index += 1) {
    const extra = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: bearer(account.accessToken),
      payload: {
        email: `${nid('seat')}@example.com`,
        fullName: 'Seat',
        password: 'correct-horse',
        role: 'member',
      },
    });
    assert.equal(extra.statusCode, 201, extra.body);
  }
  const overflow = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: bearer(account.accessToken),
    payload: {
      email: `${nid('seat')}@example.com`,
      fullName: 'Seat',
      password: 'correct-horse',
      role: 'member',
    },
  });
  assert.equal((overflow.json() as { code: string }).code, 'API-QUOTA-003');
  await ctx.app.close();
});

test('password reset token works only in the test environment response', async () => {
  const { app } = makeApp();
  const created = await signup(app);
  const account = created.account as Account;
  const forgot = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/password/forgot',
    payload: { email: account.email },
  });
  const resetToken = (forgot.json() as { resetToken: string }).resetToken;
  const reset = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/password/reset',
    payload: { token: resetToken, password: 'new-password' },
  });
  assert.equal(reset.statusCode, 204, reset.body);
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: account.email, password: 'new-password' },
  });
  assert.equal(login.statusCode, 200, login.body);
  await app.close();
});

test('sign-in and sign-up aliases accept the web and mobile bodies', async () => {
  const ctx = makeApp();
  const email = `${nid('alias')}@example.com`;
  const signedUp = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-up',
    payload: {
      name: 'Ada Owner',
      organization: 'Acme Mail',
      email,
      password: 'correct-horse',
      plan: 'free',
    },
  });
  assert.equal(signedUp.statusCode, 201, signedUp.body);
  const created = signedUp.json() as {
    accessToken: string;
    refreshToken: string;
    syncStatus: string;
    session: { accessToken: string };
    user: { name: string; organization: string; plan: string; email: string };
  };
  assert.equal(created.user.name, 'Ada Owner');
  assert.equal(created.user.organization, 'Acme Mail');
  assert.equal(created.user.plan, 'free');
  assert.equal(created.user.email, email);
  assert.equal(created.accessToken, created.session.accessToken);
  assert.ok(created.refreshToken.length > 20);

  const signedIn = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-in',
    payload: { email, password: 'correct-horse' },
  });
  assert.equal(signedIn.statusCode, 200, signedIn.body);
  const session = signedIn.json() as {
    accessToken: string;
    refreshToken: string;
    user: { name: string; plan: string };
  };
  assert.ok(session.accessToken.length > 20);
  assert.ok(session.refreshToken.length > 20);
  assert.equal(session.user.name, 'Ada Owner');
  assert.equal(session.user.plan, 'free');

  const mobile = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-up',
    payload: {
      name: 'Bea Mobile',
      email: `${nid('mobile')}@example.com`,
      password: 'correct-horse',
    },
  });
  assert.equal(mobile.statusCode, 201, mobile.body);
  assert.equal((mobile.json() as { user: { plan: string } }).user.plan, 'free');

  const account = {
    accessToken: created.accessToken,
    refreshToken: created.refreshToken,
    userId: '',
    orgId: '',
    email,
  };
  const ready = await readyMailbox(ctx, account);
  const sent = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/mail/messages',
    headers: bearer(account.accessToken),
    payload: { to: 'bob@outside.test', subject: 'Hi', text: 'Hello there' },
  });
  assert.equal(sent.statusCode, 201, sent.body);
  const sentBody = sent.json() as {
    id: string;
    folder: string;
    fromEmail: string;
    fromName: string;
  };
  assert.equal(sentBody.folder, 'sent');
  assert.equal(sentBody.fromEmail, ready.address);
  assert.equal(sentBody.fromName, 'Ada Owner');

  const list = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/messages?mailbox=sent',
    headers: bearer(account.accessToken),
  });
  assert.equal(list.statusCode, 200, list.body);
  const messages = (
    list.json() as { messages: Array<{ id: string; fromAddress: string; preview: string }> }
  ).messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.id, sentBody.id);
  assert.equal(messages[0]?.fromAddress, ready.address);
  assert.equal(messages[0]?.preview, 'Hello there');

  const one = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/mail/messages/${sentBody.id}`,
    headers: bearer(account.accessToken),
  });
  assert.equal(one.statusCode, 200, one.body);
  assert.equal((one.json() as { subject: string }).subject, 'Hi');

  const threads = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/mail/threads',
    headers: bearer(account.accessToken),
  });
  assert.equal(
    (threads.json() as { threads: Array<{ id: string; folder: string }> }).threads[0]?.folder,
    'sent',
  );

  const byId = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/mail/messages?mailboxId=${ready.mailboxId}`,
    headers: bearer(account.accessToken),
  });
  assert.equal((byId.json() as { messages: unknown[] }).messages.length, 1);

  const signedOut = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-out',
    headers: bearer(account.accessToken),
    payload: { refreshToken: created.refreshToken },
  });
  assert.equal(signedOut.statusCode, 204, signedOut.body);
  await ctx.app.close();
});

test('stalwart http adapter stays pending when the engine is down', async () => {
  const plane = new HttpStalwartPlane('http://127.0.0.1:9', 'token', async () => {
    throw new Error('down');
  });
  const result = await plane.ensureTenant({
    organizationId: 'org',
    stalwartTenantId: 'st_org',
    name: 'acme.in',
  });
  assert.equal(result.syncStatus, 'pending');
});

test('reserveSend enforces the counters it is given', async () => {
  const store = new MemoryStore();
  const base = {
    organizationId: 'org',
    userId: 'user',
    day: '2026-11-26',
    minute: '2026-11-26T00:00',
    addMessages: 1,
    addRecipients: 1,
    addExternal: 0,
    maxMessagesPerDay: 1,
    maxRecipientsPerDay: 10,
    maxExternalPerDay: 10,
    maxPerMinute: 10,
  };
  assert.equal((await store.reserveSend(base)).ok, true);
  const second = await store.reserveSend({ ...base, minute: '2026-11-26T00:01' });
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, 'messages');
});
