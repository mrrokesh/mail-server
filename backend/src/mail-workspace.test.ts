import assert from 'node:assert/strict';
import test from 'node:test';
import { testConfig } from './config';
import { MapDns } from './dns/lookup';
import { MockMailPlane } from './mail/mock-plane';
import { buildServer } from './server';
import { MemoryStore } from './store/memory';

test('mail workspace features: drafts, templates, rules, preferences, admin overview, and standards endpoints', async () => {
  const store = new MemoryStore();
  const dns = new MapDns();
  const app = buildServer({
    logger: false,
    config: testConfig(),
    store,
    mail: new MockMailPlane(),
    dns,
  });

  const signup = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: {
      organizationName: 'Northwind Studio',
      email: 'ada@northwind.example',
      password: 'correct-horse',
      fullName: 'Ada Iyer',
      planTier: 'business',
      trial: true,
    },
  });
  assert.equal(signup.statusCode, 201, signup.body);
  const token = (signup.json() as { accessToken: string }).accessToken;
  const headers = { authorization: `Bearer ${token}` };

  // Draft creation and listing in threads
  const draft = await app.inject({
    method: 'POST',
    url: '/api/v1/mail/drafts',
    headers,
    payload: {
      to: ['kavya@client.example'],
      subject: 'Q4 Design Review',
      bodyText: 'Drafting notes for the review.',
    },
  });
  assert.equal(draft.statusCode, 201, draft.body);
  const draftId = (draft.json() as { id: string }).id;

  const threads = await app.inject({
    method: 'GET',
    url: '/api/v1/mail/threads',
    headers,
  });
  assert.equal(threads.statusCode, 200);
  assert.equal(
    (threads.json() as { threads: { id: string; folder: string }[] }).threads.some(
      (t) => t.id === draftId && t.folder === 'drafts',
    ),
    true,
  );

  // Templates & Visual Sieve Rules
  const tpl = await app.inject({
    method: 'POST',
    url: '/api/v1/mail/templates',
    headers,
    payload: {
      name: 'Client Onboarding',
      category: 'Sales',
      subject: 'Welcome {{company}}',
      bodyText: 'Hi {{name}}, your domain is ready.',
    },
  });
  assert.equal(tpl.statusCode, 201, tpl.body);

  const rule = await app.inject({
    method: 'POST',
    url: '/api/v1/mail/rules',
    headers,
    payload: {
      name: 'Archive invoices',
      field: 'subject',
      operator: 'contains',
      value: 'GST Invoice',
      action: 'move_folder',
      actionTarget: 'Archive',
    },
  });
  assert.equal(rule.statusCode, 201, rule.body);
  assert.match((rule.json() as { compiledSieve: string }).compiledSieve, /fileinto "Archive"/);

  // Preferences
  const prefs = await app.inject({
    method: 'PUT',
    url: '/api/v1/mail/preferences',
    headers,
    payload: {
      undoSendSec: 15,
      shortcutPreset: 'outlook',
      vacationEnabled: true,
    },
  });
  assert.equal(prefs.statusCode, 200);
  assert.equal((prefs.json() as { undoSendSec: number }).undoSendSec, 15);

  // Admin Overview
  const overview = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/overview',
    headers,
  });
  assert.equal(overview.statusCode, 200, overview.body);
  assert.equal((overview.json() as { seats: { active: number } }).seats.active, 1);

  // Standards endpoints
  const mtaSts = await app.inject({ method: 'GET', url: '/.well-known/mta-sts.txt' });
  assert.equal(mtaSts.statusCode, 200);
  assert.match(mtaSts.body, /version: STSv1/);

  const autoconfig = await app.inject({
    method: 'GET',
    url: '/mail/config-v1.1.xml?emailaddress=ada@northwind.example',
  });
  assert.equal(autoconfig.statusCode, 200);
  assert.match(autoconfig.body, /<domain>northwind\.example<\/domain>/);

  // Primary mailbox auto-provisioned on signup and repaired on login
  const ownerMailboxes = await app.inject({
    method: 'GET',
    url: '/api/v1/mailboxes',
    headers,
  });
  assert.equal(ownerMailboxes.statusCode, 200);
  assert.ok(
    (ownerMailboxes.json() as { address: string }[]).some(
      (row) => row.address === 'ada@northwind.example',
    ),
  );

  const invited = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers,
    payload: {
      name: 'Dev User',
      email: 'dev@northwind.example',
      password: 'correct-horse-2',
      role: 'member',
    },
  });
  assert.equal(invited.statusCode, 201, invited.body);

  const memberLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/sign-in',
    payload: { email: 'dev@northwind.example', password: 'correct-horse-2' },
  });
  assert.equal(memberLogin.statusCode, 200, memberLogin.body);
  const memberToken = (memberLogin.json() as { accessToken: string }).accessToken;
  const memberBoxes = await app.inject({
    method: 'GET',
    url: '/api/v1/mailboxes',
    headers: { authorization: `Bearer ${memberToken}` },
  });
  assert.equal(memberBoxes.statusCode, 200);
  assert.ok(
    (memberBoxes.json() as { address: string }[]).some(
      (row) => row.address === 'dev@northwind.example',
    ),
  );

  await app.close();
});
