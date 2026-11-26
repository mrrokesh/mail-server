import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../errors';
import { HttpStalwartPlane } from './http-stalwart';

type Call = [string, Record<string, unknown>, string];
interface Seen {
  url: string;
  user: string;
  calls: Call[];
}

/**
 * A tiny fake Stalwart. `handle` answers each JMAP method call; the fake
 * records which login made every request so tests can check who acted.
 */
function fakeStalwart(
  handle: (call: Call, user: string) => [string, Record<string, unknown>],
  sessions: Record<string, string> = {},
) {
  const seen: Seen[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const header = new Headers(init?.headers).get('authorization') ?? '';
    const user = Buffer.from(header.replace(/^Basic /, ''), 'base64')
      .toString()
      .split(':')[0]!;
    if (url.endsWith('/jmap/session')) {
      seen.push({ url, user, calls: [] });
      const accountId = sessions[user];
      if (!accountId) return new Response('no', { status: 401 });
      return Response.json({ primaryAccounts: { 'urn:ietf:params:jmap:mail': accountId } });
    }
    const body = JSON.parse(String(init?.body)) as { methodCalls: Call[] };
    seen.push({ url, user, calls: body.methodCalls });
    return Response.json({
      methodResponses: body.methodCalls.map((call) => {
        const [name, args] = handle(call, user);
        return [name, args, call[2]];
      }),
    });
  }) as typeof fetch;
  return { seen, fetchImpl };
}

const principal = {
  organizationId: 'org_a',
  stalwartTenantId: 'st_org_a',
  principalId: 'pr_alice',
  address: 'alice@acme.in',
  kind: 'user' as const,
};

test('creates the domain and then the account, and reports synced', async () => {
  const { seen, fetchImpl } = fakeStalwart(([name, args]) => {
    if (name.endsWith('/query')) return [name, { ids: [] }];
    if (name.endsWith('/get')) return [name, { list: [] }];
    if (name === 'x:Domain/set') return [name, { created: { d1: { id: 'dom1' } } }];
    if (name === 'x:Account/set') {
      const create = (args.create as Record<string, Record<string, unknown>>).a1!;
      assert.equal(create.name, 'alice');
      assert.equal(create.domainId, 'dom1');
      return [name, { created: { a1: { id: 'acc1' } } }];
    }
    return ['error', { type: 'unknownMethod' }];
  });
  const plane = new HttpStalwartPlane('http://stalwart', 'pw', fetchImpl, undefined, 'admin');
  const result = await plane.ensurePrincipal(principal);
  assert.equal(result.syncStatus, 'synced');
  assert.ok(seen.every((row) => row.user === 'admin'));
});

test('stays pending when Stalwart answers with a JMAP error or refuses the create', async () => {
  const errors = fakeStalwart(() => ['error', { type: 'forbidden' }]);
  const one = new HttpStalwartPlane('http://stalwart', 'pw', errors.fetchImpl);
  assert.equal((await one.ensurePrincipal(principal)).syncStatus, 'pending');

  const refused = fakeStalwart(([name]) => {
    if (name.endsWith('/query')) return [name, { ids: [] }];
    if (name.endsWith('/get')) return [name, { list: [] }];
    if (name === 'x:Domain/set') return [name, { created: { d1: { id: 'dom1' } } }];
    return [name, { notCreated: { a1: { type: 'invalidProperties' } } }];
  });
  const two = new HttpStalwartPlane('http://stalwart', 'pw', refused.fetchImpl);
  assert.equal((await two.ensurePrincipal(principal)).syncStatus, 'pending');
});

test('reads each mailbox as its own owner, never the admin mailbox', async () => {
  const { seen, fetchImpl } = fakeStalwart(
    ([name, args], user) => {
      if (name === 'Mailbox/get') {
        return [
          name,
          {
            list: [
              { id: 'mbIn', role: 'inbox' },
              { id: 'mbSent', role: 'sent' },
              { id: 'mbJunk', role: 'junk' },
            ],
          },
        ];
      }
      if (name === 'Email/query') return [name, { ids: ['e1', 'e2'] }];
      if (name === 'Email/get') {
        assert.equal(args.accountId, user.startsWith('alice') ? 'A1' : 'B1');
        return [
          name,
          {
            list: [
              {
                id: `${user}-1`,
                mailboxIds: { mbIn: true },
                subject: 'Hi',
                from: [{ email: 'x@y.in' }],
              },
              { id: `${user}-2`, mailboxIds: { mbJunk: true }, subject: 'Spam' },
            ],
          },
        ];
      }
      return ['error', { type: 'unknownMethod' }];
    },
    { 'alice@acme.in%admin': 'A1', 'bob@beta.in%admin': 'B1' },
  );
  const plane = new HttpStalwartPlane('http://stalwart', 'pw', fetchImpl, undefined, 'admin');
  const alice = await plane.listMessages('org_a', 'pr_alice', 'alice@acme.in');
  const bob = await plane.listMessages('org_b', 'pr_bob', 'bob@beta.in');
  assert.deepEqual(
    alice.map((row) => [row.id, row.folder]),
    [
      ['alice@acme.in%admin-1', 'inbox'],
      ['alice@acme.in%admin-2', 'spam'],
    ],
  );
  assert.ok(bob.every((row) => row.organizationId === 'org_b' && row.id.startsWith('bob@')));
  assert.ok(seen.every((row) => row.user !== 'admin'));
});

test('sends with the owner identity and fails loudly when Stalwart refuses', async () => {
  let accept = true;
  const { seen, fetchImpl } = fakeStalwart(
    ([name, args]) => {
      if (name === 'Identity/get') {
        return [
          name,
          {
            list: [
              { id: 'idMain', email: 'alice@acme.in' },
              { id: 'idSales', email: 'sales@acme.in' },
            ],
          },
        ];
      }
      if (name === 'Mailbox/query') return [name, { ids: ['mbSent'] }];
      if (name === 'Email/set') {
        return accept
          ? [name, { created: { m1: { id: 'mail1' } } }]
          : [name, { notCreated: { m1: { type: 'overQuota' } } }];
      }
      if (name === 'EmailSubmission/set') {
        const create = (args.create as Record<string, Record<string, unknown>>).s1!;
        assert.equal(create.identityId, 'idSales');
        return [name, { created: { s1: { id: 'sub1' } } }];
      }
      return ['error', { type: 'unknownMethod' }];
    },
    { 'alice@acme.in%admin': 'A1' },
  );
  const plane = new HttpStalwartPlane('http://stalwart', 'pw', fetchImpl, undefined, 'admin');
  const message = {
    organizationId: 'org_a',
    principalId: 'pr_alice',
    mailboxAddress: 'alice@acme.in',
    from: 'sales@acme.in',
    to: ['buyer@example.com'],
    subject: 'Quote',
    text: 'Hello',
    sizeBytes: 5,
  };
  assert.deepEqual(await plane.submitMessage(message), { id: 'mail1' });
  assert.ok(
    seen.filter((row) => row.calls.length > 0).every((row) => row.user === 'alice@acme.in%admin'),
  );

  accept = false;
  await assert.rejects(plane.submitMessage(message), (error: unknown) => {
    return error instanceof ApiError && error.code === 'API-SRV-503';
  });
});

test('removes an alias by its position in the account alias list', async () => {
  const updates: unknown[] = [];
  const { fetchImpl } = fakeStalwart(([name, args]) => {
    if (name === 'x:Domain/query') return [name, { ids: ['dom1'] }];
    if (name === 'x:Domain/get') return [name, { list: [{ id: 'dom1', name: 'acme.in' }] }];
    if (name === 'x:Account/query') return [name, { ids: ['acc1'] }];
    if (name === 'x:Account/get') {
      return [
        name,
        {
          list: [
            {
              id: 'acc1',
              emailAddress: 'alice@acme.in',
              aliases: [
                { name: 'hello', domainId: 'dom1' },
                { name: 'sales', domainId: 'dom1' },
              ],
            },
          ],
        },
      ];
    }
    if (name === 'x:Account/set') {
      updates.push(args.update);
      return [name, { updated: { acc1: null } }];
    }
    return ['error', { type: 'unknownMethod' }];
  });
  const plane = new HttpStalwartPlane('http://stalwart', 'pw', fetchImpl);
  const result = await plane.removeAlias({
    organizationId: 'org_a',
    principalId: 'pr_alice',
    address: 'alice@acme.in',
    alias: 'sales@acme.in',
  });
  assert.equal(result.syncStatus, 'synced');
  assert.deepEqual(updates, [{ acc1: { 'aliases/1': null } }]);
});
