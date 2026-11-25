import crypto from 'node:crypto';
import { ipPool, utcDay, utcMinute } from '../billing/entitlements';
import { tierAtLeast } from '../v1/gates';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { StoredMessage } from '../mail/plane';
import type { MailboxRecord } from '../store/types';
import { assertWritable, presentMailbox, writeAudit, type TenantContext } from './access';
import type { AuthMeta } from './auth';

const ADDRESS_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OutboundMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  sizeBytes?: number;
}

async function mailboxForFrom(
  deps: AppDeps,
  tenant: TenantContext,
  from: string,
): Promise<MailboxRecord> {
  const address = from.toLowerCase();
  const mailboxes = await deps.store.listMailboxes(tenant.org.id);
  const direct = mailboxes.find((row) => row.address === address);
  const aliases = await deps.store.listAliasesForOrg(tenant.org.id);
  const alias = aliases.find((row) => row.aliasAddress === address && row.isActive);
  const mailbox = direct ?? mailboxes.find((row) => row.id === alias?.mailboxId);
  if (!mailbox) throw new ApiError('API-MAIL-005', { address: from });
  const owns = mailbox.userId === tenant.user.id;
  const admin = tenant.user.role === 'owner' || tenant.user.role === 'user_admin';
  const delegations = await deps.store.listDelegationsForUser(tenant.org.id, tenant.user.id);
  const delegated = delegations.some((row) => row.mailboxId === mailbox.id && row.canSendAs);
  if (!owns && !delegated && !(admin && mailbox.kind === 'shared')) {
    throw new ApiError('API-AUTH-003');
  }
  return mailbox;
}

export async function submitMessage(
  deps: AppDeps,
  tenant: TenantContext,
  input: OutboundMessage,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  if (tenant.org.sendingPaused) throw new ApiError('API-MAIL-003');
  const from = input.from.toLowerCase();
  const mailbox = await mailboxForFrom(deps, tenant, from);
  const domainName = from.split('@')[1] ?? '';
  const domain = (await deps.store.listDomains(tenant.org.id)).find(
    (row) => row.domainName === domainName,
  );
  if (!domain?.isVerified || !domain.spfVerified || !domain.dkimVerified) {
    throw new ApiError('API-MAIL-004');
  }
  if (input.to.length === 0) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'to', message: 'Add at least one recipient.' }],
    });
  }
  for (const recipient of input.to) {
    if (!ADDRESS_RE.test(recipient)) throw new ApiError('API-MAIL-005', { address: recipient });
  }
  if (input.to.length > tenant.limits.recipientsPerMessage) {
    throw new ApiError('API-MAIL-002', { limit: tenant.limits.recipientsPerMessage });
  }
  const sizeBytes = input.sizeBytes ?? Buffer.byteLength(input.text);
  if (sizeBytes > tenant.limits.attachmentBytes) {
    throw new ApiError('API-MAIL-001', { limitBytes: tenant.limits.attachmentBytes });
  }
  const verified = new Set(
    (await deps.store.listDomains(tenant.org.id))
      .filter((row) => row.isVerified)
      .map((row) => row.domainName),
  );
  const external = input.to.filter((recipient) => {
    const host = recipient.split('@')[1]?.toLowerCase() ?? '';
    return !verified.has(host);
  }).length;
  const now = deps.now();
  const reserved = await deps.store.reserveSend({
    organizationId: tenant.org.id,
    userId: tenant.user.id,
    day: utcDay(now),
    minute: utcMinute(now),
    addMessages: 1,
    addRecipients: input.to.length,
    addExternal: external,
    maxMessagesPerDay: tenant.limits.messagesPerDay,
    maxRecipientsPerDay: tenant.limits.recipientsPerDay,
    maxExternalPerDay: tenant.limits.externalRecipientsPerDay,
    maxPerMinute: tenant.limits.messagesPerMinute,
  });
  if (!reserved.ok) {
    throw new ApiError('API-QUOTA-002', {
      reason: reserved.reason,
      resetsAt: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      ).toISOString(),
    });
  }
  const submitted = await deps.mail.submitMessage({
    organizationId: tenant.org.id,
    principalId: mailbox.stalwartPrincipalId,
    from,
    to: input.to.map((recipient) => recipient.toLowerCase()),
    subject: input.subject,
    text: input.text,
    sizeBytes,
  });
  await writeAudit(deps.store, {
    at: now,
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'mail.submitted',
    targetType: 'message',
    targetId: null,
    ipAddress: meta.ip,
    metadata: { recipients: input.to.length, external },
  });
  return {
    id: submitted.id,
    from,
    to: input.to,
    subject: input.subject,
    sizeBytes,
    ipPool: ipPool(tenant.plan.tier, tenant.subscription.paidAt),
  };
}

export async function listMailboxMessages(
  deps: AppDeps,
  tenant: TenantContext,
  principalId: string,
) {
  const mailbox = (await deps.store.listMailboxes(tenant.org.id)).find(
    (row) => row.stalwartPrincipalId === principalId || row.id === principalId,
  );
  if (!mailbox) throw new ApiError('API-RES-404');
  if (
    mailbox.userId !== tenant.user.id &&
    tenant.user.role !== 'owner' &&
    tenant.user.role !== 'user_admin'
  ) {
    throw new ApiError('API-AUTH-003');
  }
  const rows = await deps.mail.listMessages(tenant.org.id, mailbox.stalwartPrincipalId);
  return rows.map((row) => ({
    id: row.id,
    from: row.from,
    to: row.to,
    subject: row.subject,
    text: row.text,
    sizeBytes: row.sizeBytes,
    at: row.at,
  }));
}

export type ClientFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function presentClientMessage(row: StoredMessage, folder: ClientFolder, fromName: string) {
  const mailbox = folder === 'spam' ? 'inbox' : folder;
  return {
    id: row.id,
    from: row.from,
    to: row.to,
    subject: row.subject,
    text: row.text,
    sizeBytes: row.sizeBytes,
    at: row.at,
    folder,
    mailbox,
    fromName,
    fromAddress: row.from,
    fromEmail: row.from,
    toEmail: row.to[0] ?? '',
    preview: row.text.slice(0, 120),
    bodyText: row.text,
    bodyHtml: `<p>${escapeHtml(row.text)}</p>`,
    receivedAt: row.at,
    unread: folder === 'inbox',
    hasRemoteImages: false,
  };
}

function visibleMailboxes(mailboxes: MailboxRecord[], tenant: TenantContext): MailboxRecord[] {
  const admin = tenant.user.role === 'owner' || tenant.user.role === 'user_admin';
  return mailboxes.filter((row) => row.userId === tenant.user.id || admin);
}

function folderOf(message: StoredMessage, ownAddresses: Set<string>): ClientFolder {
  return ownAddresses.has(message.from.toLowerCase()) ? 'sent' : 'inbox';
}

export async function listClientMessages(
  deps: AppDeps,
  tenant: TenantContext,
  filter: { mailboxId?: string; mailbox?: ClientFolder },
) {
  const mailboxes = await deps.store.listMailboxes(tenant.org.id);
  const visible = visibleMailboxes(mailboxes, tenant);
  const visibleIds = new Set(visible.map((row) => row.id));
  const ownAddresses = new Set(visible.map((row) => row.address.toLowerCase()));
  const names = new Map<string, string>();
  for (const mailbox of visible) {
    if (mailbox.userId === tenant.user.id)
      names.set(mailbox.address.toLowerCase(), tenant.user.fullName);
  }
  const aliases = await deps.store.listAliasesForOrg(tenant.org.id);
  for (const alias of aliases) {
    if (!alias.isActive || !visibleIds.has(alias.mailboxId)) continue;
    ownAddresses.add(alias.aliasAddress.toLowerCase());
    const named = names.get(
      visible.find((row) => row.id === alias.mailboxId)?.address.toLowerCase() ?? '',
    );
    if (named) names.set(alias.aliasAddress.toLowerCase(), named);
  }
  let targets = visible;
  if (filter.mailboxId) {
    const one = visible.find(
      (row) => row.id === filter.mailboxId || row.stalwartPrincipalId === filter.mailboxId,
    );
    if (!one) throw new ApiError('API-RES-404');
    targets = [one];
  }
  const messages = [];
  for (const mailbox of targets) {
    const rows = await deps.mail.listMessages(tenant.org.id, mailbox.stalwartPrincipalId);
    for (const row of rows) {
      const folder = folderOf(row, ownAddresses);
      if (filter.mailbox && folder !== filter.mailbox) continue;
      const fromName =
        names.get(row.from.toLowerCase()) ??
        (row.from.toLowerCase() === tenant.user.email.toLowerCase()
          ? tenant.user.fullName
          : (row.from.split('@')[0] ?? row.from));
      messages.push(presentClientMessage(row, folder, fromName));
    }
  }
  messages.sort((left, right) => (left.receivedAt < right.receivedAt ? 1 : -1));
  return { messages };
}

export async function readClientMessage(deps: AppDeps, tenant: TenantContext, id: string) {
  const listed = await listClientMessages(deps, tenant, {});
  const found = listed.messages.find((message) => message.id === id);
  if (!found) throw new ApiError('API-RES-404');
  return found;
}

export function presentSentMessage(
  sent: {
    id: string;
    from: string;
    to: string[];
    subject: string;
    sizeBytes: number;
    ipPool: string;
  },
  text: string,
  fromName: string,
  at: string,
) {
  return {
    ...sent,
    ...presentClientMessage(
      {
        id: sent.id,
        organizationId: '',
        principalId: '',
        from: sent.from,
        to: sent.to,
        subject: sent.subject,
        text,
        sizeBytes: sent.sizeBytes,
        at,
      },
      'sent',
      fromName,
    ),
  };
}

export async function openSession(deps: AppDeps, tenant: TenantContext) {
  const mailboxes = await deps.store.listMailboxes(tenant.org.id);
  const own = mailboxes.filter(
    (row) =>
      row.userId === tenant.user.id ||
      tenant.user.role === 'owner' ||
      tenant.user.role === 'user_admin',
  );
  const primary = own[0];
  return {
    capabilities: {
      'urn:ietf:params:jmap:core': { maxSizeUpload: tenant.limits.attachmentBytes },
      'urn:ietf:params:jmap:mail': {},
    },
    accounts: Object.fromEntries(
      own.map((row) => [row.id, { name: row.address, isPersonal: row.kind === 'user' }]),
    ),
    primaryAccounts: primary ? { 'urn:ietf:params:jmap:mail': primary.id } : {},
    apiUrl: '/api/v1/mail/jmap',
    username: primary?.address ?? tenant.user.email,
    stalwartTenantId: tenant.org.stalwartTenantId,
    ipPool: ipPool(tenant.plan.tier, tenant.subscription.paidAt),
    mailboxes: own.map(presentMailbox),
  };
}

export function protocolAccess(tenant: TenantContext) {
  const exchange = tierAtLeast(tenant.plan.tier, 'business');
  return {
    jmap: true,
    imap: tenant.limits.imap,
    smtp: tenant.limits.imap,
    pop3: tenant.limits.imap,
    activesync: exchange,
    ews: exchange,
    activesyncNote:
      'ActiveSync and EWS are served by unmodified Stalwart. This API only records whether the plan includes them.',
    ipPool: ipPool(tenant.plan.tier, tenant.subscription.paidAt),
  };
}

export function assertProtocol(tenant: TenantContext, protocol?: string): void {
  if (!protocol) return;
  if (protocol === 'activesync' || protocol === 'ews') {
    if (!tierAtLeast(tenant.plan.tier, 'business')) {
      throw new ApiError('API-BILL-003', { feature: protocol, requiredTier: 'business' });
    }
    return;
  }
  if (!tenant.limits.imap) {
    throw new ApiError('API-BILL-003', { feature: protocol, requiredTier: 'starter' });
  }
}

interface JmapCall {
  0: string;
  1: {
    create?: Record<
      string,
      {
        from?: { email?: string }[];
        to?: { email?: string }[];
        subject?: string;
        textBody?: string;
        size?: number;
      }
    >;
  };
  2: string;
}

export async function handleJmap(
  deps: AppDeps,
  tenant: TenantContext,
  body: { methodCalls?: JmapCall[] },
  meta: AuthMeta,
) {
  if (!Array.isArray(body.methodCalls)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'methodCalls', message: 'JMAP methodCalls is required.' }],
    });
  }
  const methodResponses = [];
  for (const call of body.methodCalls) {
    const name = call[0];
    const args = call[1] ?? {};
    const id = call[2] ?? crypto.randomUUID();
    if (name === 'Email/set' && args.create) {
      const created: Record<string, { id: string }> = {};
      for (const [key, value] of Object.entries(args.create)) {
        const from = value.from?.[0]?.email;
        const to = (value.to ?? [])
          .map((item) => item.email)
          .filter((item): item is string => Boolean(item));
        if (!from) throw new ApiError('API-MAIL-005');
        const sent = await submitMessage(
          deps,
          tenant,
          {
            from,
            to,
            subject: value.subject ?? '',
            text: value.textBody ?? '',
            ...(value.size !== undefined ? { sizeBytes: value.size } : {}),
          },
          meta,
        );
        created[key] = { id: sent.id };
      }
      methodResponses.push(['Email/set', { created }, id]);
      continue;
    }
    if (name === 'Mailbox/get') {
      const session = await openSession(deps, tenant);
      methodResponses.push([
        'Mailbox/get',
        { list: session.mailboxes.map((row) => ({ id: row.id, name: row.address })) },
        id,
      ]);
      continue;
    }
    methodResponses.push(['error', { type: 'unknownMethod' }, id]);
  }
  return { sessionState: '1', methodResponses };
}
