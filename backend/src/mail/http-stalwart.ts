import type { MailboxKind } from '../store/types';
import type { MailArchive } from './postgres-archive';
import { MockMailPlane } from './mock-plane';
import type { MailPlane, StoredMessage } from './plane';

/**
 * Talks to an unmodified Stalwart Community server over JMAP.
 * When JMAP list/send works, that store is authoritative. The local archive
 * backs up every successful submit and fills the UI if JMAP is unreachable.
 */
export class HttpStalwartPlane implements MailPlane {
  private readonly mirror = new MockMailPlane();
  private accountId: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly archive?: MailArchive,
  ) {}

  async ensureTenant(input: {
    organizationId: string;
    stalwartTenantId: string;
    name: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.ensureTenant(input);
    const synced = await this.jmapOk([
      ['x:Domain/set', { create: { d1: { name: domainFrom(input.name) } } }, 'c0'],
    ]);
    return { syncStatus: synced ? 'synced' : 'pending' };
  }

  async ensurePrincipal(input: {
    organizationId: string;
    stalwartTenantId: string;
    principalId: string;
    address: string;
    kind: MailboxKind;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.ensurePrincipal(input);
    const local = input.address.split('@')[0] ?? input.address;
    const domain = input.address.split('@')[1] ?? 'localhost';
    const synced = await this.jmapOk([
      [
        'x:Account/set',
        {
          create: {
            a1: {
              '@type': 'User',
              name: local,
              description: input.address,
              emails: { [input.address]: {} },
              domainName: domain,
            },
          },
        },
        'c1',
      ],
    ]);
    return { syncStatus: synced ? 'synced' : 'pending' };
  }

  async upsertAlias(input: {
    organizationId: string;
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.upsertAlias(input);
    const synced = await this.jmapOk([
      [
        'x:Account/set',
        {
          update: {
            [input.principalId]: { emails: { [input.alias]: { alias: true } } },
          },
        },
        'c2',
      ],
    ]);
    return { syncStatus: synced ? 'synced' : 'pending' };
  }

  async removeAlias(input: {
    organizationId: string;
    principalId: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.removeAlias(input);
    const synced = await this.jmapOk([
      ['x:Account/set', { update: { [input.principalId]: {} } }, 'c3'],
    ]);
    return { syncStatus: synced ? 'synced' : 'pending' };
  }

  async submitMessage(input: {
    organizationId: string;
    principalId: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    sizeBytes: number;
  }): Promise<{ id: string }> {
    const stored = await this.mirror.submitMessage(input);
    if (this.archive) {
      const row = (await this.mirror.listMessages(input.organizationId, input.principalId)).find(
        (message) => message.id === stored.id,
      );
      if (row) await this.archive.save(row);
    }

    const accountId = await this.resolveAccountId();
    const mailboxes = accountId ? await this.mailboxIds(accountId) : null;
    const sentId = mailboxes?.sent ?? mailboxes?.inbox;
    const create: Record<string, unknown> = {
      from: [{ email: input.from }],
      to: input.to.map((email) => ({ email })),
      subject: input.subject,
      textBody: [{ partId: 'p1', type: 'text/plain' }],
      bodyValues: { p1: { value: input.text } },
    };
    if (sentId) create.mailboxIds = { [sentId]: true };

    const calls: unknown[] = [
      [
        'Email/set',
        {
          accountId: accountId ?? undefined,
          create: { m1: create },
        },
        'c4',
      ],
    ];
    if (accountId) {
      calls.push([
        'EmailSubmission/set',
        {
          accountId,
          create: {
            s1: {
              emailId: '#m1',
              envelope: {
                mailFrom: { email: input.from },
                rcptTo: input.to.map((email) => ({ email })),
              },
            },
          },
        },
        'c5',
      ]);
    }
    await this.jmapOk(calls);
    return stored;
  }

  async listMessages(organizationId: string, principalId: string): Promise<StoredMessage[]> {
    const remote = await this.listFromJmap(organizationId, principalId);
    if (remote.length > 0) {
      if (this.archive) {
        for (const row of remote) await this.archive.save(row);
      }
      return remote;
    }
    if (this.archive) return this.archive.list(organizationId, principalId);
    return this.mirror.listMessages(organizationId, principalId);
  }

  private async listFromJmap(
    organizationId: string,
    principalId: string,
  ): Promise<StoredMessage[]> {
    const accountId = await this.resolveAccountId();
    if (!accountId) return [];
    const query = await this.jmapResult([
      [
        'Email/query',
        {
          accountId,
          sort: [{ property: 'receivedAt', isAscending: false }],
          limit: 100,
        },
        'q0',
      ],
    ]);
    const ids = emailIdsFromQuery(query);
    if (ids.length === 0) return [];
    const got = await this.jmapResult([
      [
        'Email/get',
        {
          accountId,
          ids,
          properties: [
            'id',
            'from',
            'to',
            'subject',
            'preview',
            'receivedAt',
            'size',
            'bodyValues',
            'textBody',
          ],
          fetchTextBodyValues: true,
        },
        'g0',
      ],
    ]);
    return emailsFromGet(got, organizationId, principalId);
  }

  private async resolveAccountId(): Promise<string | null> {
    if (this.accountId) return this.accountId;
    try {
      const response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, '')}/.well-known/jmap`, {
        headers: {
          authorization: basicAuth(process.env.STALWART_ADMIN_USER ?? 'admin', this.token),
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as {
        primaryAccounts?: Record<string, string>;
        accounts?: Record<string, unknown>;
      };
      const primary =
        body.primaryAccounts?.['urn:ietf:params:jmap:mail'] ??
        Object.keys(body.accounts ?? {})[0] ??
        null;
      this.accountId = primary;
      return primary;
    } catch {
      return null;
    }
  }

  private async mailboxIds(
    accountId: string,
  ): Promise<{ inbox: string | null; sent: string | null }> {
    const result = await this.jmapResult([
      ['Mailbox/query', { accountId, filter: { role: 'inbox' } }, 'mi'],
      ['Mailbox/query', { accountId, filter: { role: 'sent' } }, 'ms'],
    ]);
    return {
      inbox: firstId(result, 'mi'),
      sent: firstId(result, 'ms'),
    };
  }

  private async jmapOk(methodCalls: unknown[]): Promise<boolean> {
    const result = await this.jmapResult(methodCalls);
    return result != null;
  }

  private async jmapResult(methodCalls: unknown[]): Promise<unknown[] | null> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, '')}/jmap/`, {
        method: 'POST',
        headers: {
          authorization: basicAuth(process.env.STALWART_ADMIN_USER ?? 'admin', this.token),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          using: [
            'urn:ietf:params:jmap:core',
            'urn:ietf:params:jmap:mail',
            'urn:ietf:params:jmap:submission',
            'urn:stalwart:jmap',
          ],
          methodCalls,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { methodResponses?: unknown[] };
      return body.methodResponses ?? null;
    } catch {
      return null;
    }
  }
}

function basicAuth(user: string, secret: string): string {
  return `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;
}

function domainFrom(name: string): string {
  const trimmed = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '');
  if (trimmed.includes('.')) return trimmed;
  return 'rokeshcloud.com';
}

function emailIdsFromQuery(responses: unknown[] | null): string[] {
  if (!responses) return [];
  for (const entry of responses) {
    if (!Array.isArray(entry) || entry[0] !== 'Email/query') continue;
    const payload = entry[1] as { ids?: unknown };
    if (!Array.isArray(payload.ids)) continue;
    return payload.ids.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

function firstId(responses: unknown[] | null, tag: string): string | null {
  if (!responses) return null;
  for (const entry of responses) {
    if (!Array.isArray(entry) || entry[2] !== tag) continue;
    const payload = entry[1] as { ids?: unknown };
    if (!Array.isArray(payload.ids) || typeof payload.ids[0] !== 'string') return null;
    return payload.ids[0];
  }
  return null;
}

function emailsFromGet(
  responses: unknown[] | null,
  organizationId: string,
  principalId: string,
): StoredMessage[] {
  if (!responses) return [];
  for (const entry of responses) {
    if (!Array.isArray(entry) || entry[0] !== 'Email/get') continue;
    const payload = entry[1] as { list?: unknown[] };
    if (!Array.isArray(payload.list)) return [];
    return payload.list
      .map((raw) => {
        const row = raw as {
          id?: string;
          from?: { email?: string }[];
          to?: { email?: string }[];
          subject?: string;
          preview?: string;
          receivedAt?: string;
          size?: number;
          bodyValues?: Record<string, { value?: string }>;
          textBody?: { partId?: string }[];
        };
        if (typeof row.id !== 'string') return null;
        const partId = row.textBody?.[0]?.partId;
        const text = (partId && row.bodyValues?.[partId]?.value) || row.preview || '';
        return {
          id: row.id,
          organizationId,
          principalId,
          from: row.from?.[0]?.email ?? '',
          to: (row.to ?? [])
            .map((item) => item.email)
            .filter((email): email is string => Boolean(email)),
          subject: row.subject ?? '(no subject)',
          text,
          sizeBytes: typeof row.size === 'number' ? row.size : text.length,
          at: row.receivedAt ?? new Date().toISOString(),
        } satisfies StoredMessage;
      })
      .filter((row): row is StoredMessage => row != null);
  }
  return [];
}
