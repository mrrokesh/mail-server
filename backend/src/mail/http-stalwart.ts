import { ApiError } from '../errors';
import type { MailboxKind } from '../store/types';
import type { MailArchive } from './postgres-archive';
import { MockMailPlane } from './mock-plane';
import type { MailPlane, StoredFolder, StoredMessage } from './plane';

/**
 * Talks to an unmodified Stalwart Community server (v1) over JMAP.
 *
 * Management (domains, accounts, aliases) uses the admin login and the
 * `urn:stalwart:jmap` capability (`x:Domain/*`, `x:Account/*`).
 * Mail (read, send) runs as the mailbox owner through Stalwart's master-user
 * login `<address>%<admin>` with the admin password, so every request only
 * ever sees that one person's account. This needs the admin account to hold
 * the `impersonate` permission, and STALWART_ADMIN_TOKEN must be the admin
 * password (API keys cannot impersonate).
 *
 * Multi-tenancy is not needed from Stalwart: our control plane keeps each
 * organization apart and only asks for mailboxes the caller may see.
 */

const MAIL_CAPS = [
  'urn:ietf:params:jmap:core',
  'urn:ietf:params:jmap:mail',
  'urn:ietf:params:jmap:submission',
];
const ADMIN_CAPS = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'];
const PAGE_SIZE = 100;
const MAX_MESSAGES = 1000;
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const ROLE_TO_FOLDER: Record<string, StoredFolder> = {
  inbox: 'inbox',
  sent: 'sent',
  drafts: 'drafts',
  archive: 'archive',
  junk: 'spam',
  trash: 'trash',
};

type JmapArgs = Record<string, unknown>;
type JmapCall = [string, JmapArgs, string];

/** A Stalwart call that answered but did not do what we asked. */
export class StalwartError extends Error {}

interface AccountRow {
  id: string;
  aliases: unknown[];
}

export class HttpStalwartPlane implements MailPlane {
  readonly deliversMail = true;
  private readonly mirror = new MockMailPlane();
  private readonly domainIds = new Map<string, string>();
  private readonly mailAccounts = new Map<string, string>();

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly archive?: MailArchive,
    private readonly adminUser: string = process.env.STALWART_ADMIN_USER ?? 'admin',
  ) {}

  /** Stalwart Community has no tenants; only a real domain name is created. */
  async ensureTenant(input: {
    organizationId: string;
    stalwartTenantId: string;
    name: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.ensureTenant(input);
    const name = input.name.trim().toLowerCase();
    if (!DOMAIN_RE.test(name)) return { syncStatus: 'synced' };
    return this.attempt(async () => {
      await this.ensureDomain(name);
    });
  }

  async ensurePrincipal(input: {
    organizationId: string;
    stalwartTenantId: string;
    principalId: string;
    address: string;
    kind: MailboxKind;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.ensurePrincipal(input);
    const address = input.address.toLowerCase();
    const [local, domainName] = splitAddress(address);
    return this.attempt(async () => {
      const domainId = await this.ensureDomain(domainName);
      if (await this.findAccount(address)) return;
      const responses = await this.adminCall([
        [
          'x:Account/set',
          {
            create: {
              a1: {
                '@type': input.kind === 'user' || input.kind === 'shared' ? 'User' : 'Resource',
                name: local,
                domainId,
                description: address,
              },
            },
          },
          'a',
        ],
      ]);
      createdId(responses, 'a', 'a1');
    });
  }

  async upsertAlias(input: {
    organizationId: string;
    principalId: string;
    address: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.upsertAlias(input);
    const alias = input.alias.toLowerCase();
    const [local, domainName] = splitAddress(alias);
    return this.attempt(async () => {
      const account = await this.findAccount(input.address.toLowerCase());
      if (!account) throw new StalwartError('Mailbox account is missing on the engine.');
      const domainId = await this.ensureDomain(domainName);
      if (account.aliases.some((entry) => aliasMatches(entry, alias, local, domainId))) return;
      const responses = await this.adminCall([
        [
          'x:Account/set',
          {
            update: {
              [account.id]: { [`aliases/${account.aliases.length}`]: { name: local, domainId } },
            },
          },
          'u',
        ],
      ]);
      assertUpdated(responses, 'u', account.id);
    });
  }

  async removeAlias(input: {
    organizationId: string;
    principalId: string;
    address: string;
    alias: string;
  }): Promise<{ syncStatus: 'synced' | 'pending' }> {
    await this.mirror.removeAlias(input);
    const alias = input.alias.toLowerCase();
    const [local, domainName] = splitAddress(alias);
    return this.attempt(async () => {
      const account = await this.findAccount(input.address.toLowerCase());
      if (!account) return;
      const domainId = await this.ensureDomain(domainName);
      const index = account.aliases.findIndex((entry) =>
        aliasMatches(entry, alias, local, domainId),
      );
      if (index < 0) return;
      const responses = await this.adminCall([
        ['x:Account/set', { update: { [account.id]: { [`aliases/${index}`]: null } } }, 'r'],
      ]);
      assertUpdated(responses, 'r', account.id);
    });
  }

  /** Sends as the mailbox owner. Throws API-SRV-503 when the engine does not accept it. */
  async submitMessage(input: {
    organizationId: string;
    principalId: string;
    mailboxAddress: string;
    from: string;
    to: string[];
    subject: string;
    text: string;
    sizeBytes: number;
  }): Promise<{ id: string }> {
    const owner = input.mailboxAddress.toLowerCase();
    const from = input.from.toLowerCase();
    let emailId: string;
    try {
      const accountId = await this.mailAccountId(owner);
      const lookup = await this.userCall(owner, [
        ['Identity/get', { accountId }, 'i'],
        ['Mailbox/query', { accountId, filter: { role: 'sent' } }, 'm'],
      ]);
      const identities = listOf(responseArgs(lookup, 'i'));
      const identity =
        identities.find((row) => lower(row.email) === from) ??
        identities.find((row) => lower(row.email) === owner) ??
        identities[0];
      if (!identity || typeof identity.id !== 'string') {
        throw new StalwartError('No sending identity on this account.');
      }
      const sentId = idsOf(responseArgs(lookup, 'm'))[0];
      if (!sentId) throw new StalwartError('No Sent folder on this account.');
      const sent = await this.userCall(owner, [
        [
          'Email/set',
          {
            accountId,
            create: {
              m1: {
                mailboxIds: { [sentId]: true },
                keywords: { $seen: true },
                from: [{ email: from }],
                to: input.to.map((email) => ({ email })),
                subject: input.subject,
                textBody: [{ partId: 'p1', type: 'text/plain' }],
                bodyValues: { p1: { value: input.text } },
              },
            },
          },
          'e',
        ],
        [
          'EmailSubmission/set',
          {
            accountId,
            create: {
              s1: {
                identityId: identity.id,
                emailId: '#m1',
                envelope: {
                  mailFrom: { email: from },
                  rcptTo: input.to.map((email) => ({ email })),
                },
              },
            },
          },
          's',
        ],
      ]);
      emailId = createdId(sent, 'e', 'm1');
      createdId(sent, 's', 's1');
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('API-SRV-503', { engine: 'stalwart' });
    }
    const row: StoredMessage = {
      id: emailId,
      organizationId: input.organizationId,
      principalId: input.principalId,
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      sizeBytes: input.sizeBytes,
      at: new Date().toISOString(),
      folder: 'sent',
    };
    this.mirror.messages.push(row);
    if (this.archive) await this.archive.save(row);
    return { id: emailId };
  }

  /**
   * Reads the owner's own mailbox. If the engine cannot be reached, the local
   * archive (copies of earlier reads and sends) fills the screen instead.
   */
  async listMessages(
    organizationId: string,
    principalId: string,
    address: string,
  ): Promise<StoredMessage[]> {
    try {
      const remote = await this.listFromJmap(organizationId, principalId, address.toLowerCase());
      if (this.archive) {
        for (const row of remote) await this.archive.save(row);
      }
      return remote;
    } catch {
      if (this.archive) return this.archive.list(organizationId, principalId);
      return this.mirror.listMessages(organizationId, principalId);
    }
  }

  private async listFromJmap(
    organizationId: string,
    principalId: string,
    address: string,
  ): Promise<StoredMessage[]> {
    const accountId = await this.mailAccountId(address);
    const boxes = await this.userCall(address, [
      ['Mailbox/get', { accountId, properties: ['id', 'role'] }, 'b'],
    ]);
    const folders = new Map<string, StoredFolder>();
    for (const box of listOf(responseArgs(boxes, 'b'))) {
      const folder = typeof box.role === 'string' ? ROLE_TO_FOLDER[box.role] : undefined;
      if (typeof box.id === 'string' && folder) folders.set(box.id, folder);
    }
    const out: StoredMessage[] = [];
    for (let position = 0; position < MAX_MESSAGES; position += PAGE_SIZE) {
      const page = await this.userCall(address, [
        [
          'Email/query',
          {
            accountId,
            sort: [{ property: 'receivedAt', isAscending: false }],
            position,
            limit: PAGE_SIZE,
          },
          'q',
        ],
        [
          'Email/get',
          {
            accountId,
            '#ids': { resultOf: 'q', name: 'Email/query', path: '/ids' },
            properties: [
              'id',
              'mailboxIds',
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
          'g',
        ],
      ]);
      const ids = idsOf(responseArgs(page, 'q'));
      for (const raw of listOf(responseArgs(page, 'g'))) {
        const row = toStoredMessage(raw, organizationId, principalId, folders);
        if (row) out.push(row);
      }
      if (ids.length < PAGE_SIZE) break;
    }
    return out;
  }

  /** Runs a management step; any failure leaves the item pending for a later retry. */
  private async attempt(step: () => Promise<void>): Promise<{ syncStatus: 'synced' | 'pending' }> {
    try {
      await step();
      return { syncStatus: 'synced' };
    } catch {
      return { syncStatus: 'pending' };
    }
  }

  private async ensureDomain(name: string): Promise<string> {
    const cached = this.domainIds.get(name);
    if (cached) return cached;
    const found = await this.findDomain(name);
    if (found) return found;
    const responses = await this.adminCall([['x:Domain/set', { create: { d1: { name } } }, 'd']]);
    try {
      const id = createdId(responses, 'd', 'd1');
      this.domainIds.set(name, id);
      return id;
    } catch (error) {
      // Another request may have created it a moment ago.
      const again = await this.findDomain(name);
      if (again) return again;
      throw error;
    }
  }

  private async findDomain(name: string): Promise<string | null> {
    const responses = await this.adminCall([
      ['x:Domain/query', { filter: { name } }, 'q'],
      [
        'x:Domain/get',
        {
          '#ids': { resultOf: 'q', name: 'x:Domain/query', path: '/ids' },
          properties: ['id', 'name'],
        },
        'g',
      ],
    ]);
    const match = listOf(responseArgs(responses, 'g')).find((row) => lower(row.name) === name);
    if (!match || typeof match.id !== 'string') return null;
    this.domainIds.set(name, match.id);
    return match.id;
  }

  private async findAccount(address: string): Promise<AccountRow | null> {
    const responses = await this.adminCall([
      ['x:Account/query', { filter: { text: address } }, 'q'],
      [
        'x:Account/get',
        {
          '#ids': { resultOf: 'q', name: 'x:Account/query', path: '/ids' },
          properties: ['id', 'name', 'emailAddress', 'aliases'],
        },
        'g',
      ],
    ]);
    const match = listOf(responseArgs(responses, 'g')).find(
      (row) => lower(row.emailAddress) === address,
    );
    if (!match || typeof match.id !== 'string') return null;
    return { id: match.id, aliases: Array.isArray(match.aliases) ? match.aliases : [] };
  }

  /** The owner's JMAP mail account id, from a session opened as that owner. */
  private async mailAccountId(address: string): Promise<string> {
    const cached = this.mailAccounts.get(address);
    if (cached) return cached;
    const response = await this.fetchImpl(`${this.root()}/jmap/session`, {
      headers: { authorization: this.ownerAuth(address), accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new StalwartError(`Session refused (${response.status}).`);
    const body = (await response.json()) as { primaryAccounts?: Record<string, string> };
    const accountId = body.primaryAccounts?.['urn:ietf:params:jmap:mail'];
    if (!accountId) throw new StalwartError('Session has no mail account.');
    this.mailAccounts.set(address, accountId);
    return accountId;
  }

  private adminCall(calls: JmapCall[]): Promise<unknown[]> {
    return this.post(basicAuth(this.adminUser, this.token), ADMIN_CAPS, calls);
  }

  private userCall(address: string, calls: JmapCall[]): Promise<unknown[]> {
    return this.post(this.ownerAuth(address), MAIL_CAPS, calls);
  }

  private ownerAuth(address: string): string {
    return basicAuth(`${address}%${this.adminUser}`, this.token);
  }

  private async post(authorization: string, using: string[], calls: JmapCall[]) {
    const response = await this.fetchImpl(`${this.root()}/jmap/`, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ using, methodCalls: calls }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new StalwartError(`JMAP request failed (${response.status}).`);
    const body = (await response.json()) as { methodResponses?: unknown[] };
    if (!Array.isArray(body.methodResponses)) throw new StalwartError('No JMAP responses.');
    return body.methodResponses;
  }

  private root(): string {
    return this.baseUrl.replace(/\/$/, '');
  }
}

function basicAuth(user: string, secret: string): string {
  return `Basic ${Buffer.from(`${user}:${secret}`).toString('base64')}`;
}

function splitAddress(address: string): [string, string] {
  const at = address.lastIndexOf('@');
  if (at <= 0 || at === address.length - 1) throw new StalwartError(`Bad address: ${address}`);
  return [address.slice(0, at), address.slice(at + 1)];
}

function lower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

/** Arguments of the response with this tag. JMAP reports failures as an "error" response. */
function responseArgs(responses: unknown[], tag: string): JmapArgs {
  for (const entry of responses) {
    if (!Array.isArray(entry) || entry[2] !== tag) continue;
    const args = (entry[1] ?? {}) as JmapArgs;
    if (entry[0] === 'error') {
      throw new StalwartError(`JMAP error ${String(args.type ?? 'unknown')}`);
    }
    return args;
  }
  throw new StalwartError(`No JMAP response for ${tag}.`);
}

function createdId(responses: unknown[], tag: string, key: string): string {
  const args = responseArgs(responses, tag);
  const created = (args.created ?? {}) as Record<string, { id?: unknown } | null>;
  const id = created[key]?.id;
  if (typeof id === 'string') return id;
  const failed = ((args.notCreated ?? {}) as Record<string, { type?: unknown }>)[key];
  throw new StalwartError(`Not created: ${String(failed?.type ?? 'unknown')}`);
}

function assertUpdated(responses: unknown[], tag: string, id: string): void {
  const args = responseArgs(responses, tag);
  const updated = (args.updated ?? {}) as Record<string, unknown>;
  if (id in updated) return;
  const failed = ((args.notUpdated ?? {}) as Record<string, { type?: unknown }>)[id];
  throw new StalwartError(`Not updated: ${String(failed?.type ?? 'unknown')}`);
}

function listOf(args: JmapArgs): JmapArgs[] {
  return Array.isArray(args.list) ? (args.list as JmapArgs[]) : [];
}

function idsOf(args: JmapArgs): string[] {
  return Array.isArray(args.ids)
    ? args.ids.filter((id): id is string => typeof id === 'string')
    : [];
}

/** Alias entries may carry a full address, or a local part plus domain id. */
function aliasMatches(entry: unknown, alias: string, local: string, domainId: string): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const row = entry as JmapArgs;
  if (lower(row.emailAddress) === alias || lower(row.address) === alias) return true;
  return lower(row.name) === local && row.domainId === domainId;
}

function toStoredMessage(
  raw: JmapArgs,
  organizationId: string,
  principalId: string,
  folders: Map<string, StoredFolder>,
): StoredMessage | null {
  if (typeof raw.id !== 'string') return null;
  const textBody = raw.textBody as { partId?: string }[] | undefined;
  const bodyValues = raw.bodyValues as Record<string, { value?: string }> | undefined;
  const partId = textBody?.[0]?.partId;
  const preview = typeof raw.preview === 'string' ? raw.preview : '';
  const text = (partId && bodyValues?.[partId]?.value) || preview;
  const from = raw.from as { email?: string }[] | undefined;
  const to = raw.to as { email?: string }[] | undefined;
  const mailboxIds = Object.keys((raw.mailboxIds ?? {}) as Record<string, unknown>);
  const folder = mailboxIds.map((id) => folders.get(id)).find(Boolean);
  return {
    id: raw.id,
    organizationId,
    principalId,
    from: from?.[0]?.email ?? '',
    to: (to ?? []).map((item) => item.email).filter((email): email is string => Boolean(email)),
    subject: typeof raw.subject === 'string' ? raw.subject : '(no subject)',
    text,
    sizeBytes: typeof raw.size === 'number' ? raw.size : text.length,
    at: typeof raw.receivedAt === 'string' ? raw.receivedAt : new Date().toISOString(),
    ...(folder ? { folder } : {}),
  };
}
