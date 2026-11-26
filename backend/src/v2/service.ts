import crypto from 'node:crypto';
import type { AppDeps } from '../app-deps';
import { newOpaqueToken } from '../crypto/password';
import { ApiError } from '../errors';
import {
  BILLING_ROLES,
  SECURITY_ROLES,
  assertRole,
  assertWritable,
  writeAudit,
  type TenantContext,
} from '../services/access';
import type { AuthMeta } from '../services/auth';
import { assertTier, maskedAliasCap } from '../v1/gates';
import type { ChatKind } from '../v1/workspace';

export const CHAT_ENGINE = 'mrrokesh-chat' as const;

const MASK_DOMAIN = 'mask.rokeshcloud.com';
const KEY_NOTE =
  'The server stores the client public key and the client-wrapped private key. It does not generate keys, unwrap the private key, or encrypt mail.';

function adapter(deps: AppDeps) {
  return deps.workspace.persistence;
}

function privacyIncluded(deps: AppDeps, tenant: TenantContext): boolean {
  if (tenant.plan.tier === 'enterprise') return true;
  return deps.workspace.privacyOf(tenant.org.id).addonEnabled;
}

function presentConversation(row: {
  id: string;
  kind: ChatKind;
  title: string;
  memberUserIds: string[];
  createdAt: string;
}) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    memberUserIds: row.memberUserIds,
    createdAt: row.createdAt,
  };
}

function assertMember(
  row: { memberUserIds: string[] } | null,
  userId: string,
): asserts row is { memberUserIds: string[] } {
  if (!row || !row.memberUserIds.includes(userId)) throw new ApiError('API-RES-404');
}

export function listConversations(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'business', 'chat');
  const conversations = deps.workspace
    .listConversations(tenant.org.id)
    .filter((row) => row.memberUserIds.includes(tenant.user.id))
    .map(presentConversation);
  return {
    engine: CHAT_ENGINE,
    adapter: adapter(deps),
    guests: 'not-available' as const,
    conversations,
  };
}

export async function createConversation(
  deps: AppDeps,
  tenant: TenantContext,
  input: { kind: ChatKind; title: string; memberUserIds?: string[] },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'business', 'chat');
  const users = await deps.store.listUsers(tenant.org.id);
  const known = new Set(
    users.filter((user) => user.isActive && !user.deletedAt).map((user) => user.id),
  );
  const memberUserIds = [...new Set([tenant.user.id, ...(input.memberUserIds ?? [])])];
  if (memberUserIds.some((id) => !known.has(id))) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'memberUserIds', message: 'Choose people from this workspace.' }],
    });
  }
  if (input.kind === 'direct' && memberUserIds.length !== 2) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'memberUserIds', message: 'A direct chat needs one other person.' }],
    });
  }
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    kind: input.kind,
    title: input.title,
    createdBy: tenant.user.id,
    memberUserIds,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addConversation(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'chat.conversation_created',
    targetType: 'chat_conversation',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { kind: row.kind },
  });
  return { ...presentConversation(row), engine: CHAT_ENGINE, adapter: adapter(deps) };
}

export function listChatMessages(deps: AppDeps, tenant: TenantContext, conversationId: string) {
  assertTier(tenant, 'business', 'chat');
  const conversation = deps.workspace.findConversation(tenant.org.id, conversationId);
  assertMember(conversation, tenant.user.id);
  return {
    engine: CHAT_ENGINE,
    adapter: adapter(deps),
    messages: deps.workspace.listMessages(tenant.org.id, conversationId).map((row) => ({
      id: row.id,
      threadRootId: row.threadRootId,
      authorUserId: row.authorUserId,
      body: row.body,
      driveFileId: row.driveFileId,
      createdAt: row.createdAt,
    })),
  };
}

export async function postChatMessage(
  deps: AppDeps,
  tenant: TenantContext,
  conversationId: string,
  input: { body: string; threadRootId?: string; driveFileId?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'business', 'chat');
  const conversation = deps.workspace.findConversation(tenant.org.id, conversationId);
  assertMember(conversation, tenant.user.id);
  if (input.threadRootId) {
    const root = deps.workspace.findMessage(tenant.org.id, input.threadRootId);
    if (!root || root.conversationId !== conversationId || root.threadRootId) {
      throw new ApiError('API-VAL-001', {
        fields: [{ path: 'threadRootId', message: 'Reply to a message in this conversation.' }],
      });
    }
  }
  if (input.driveFileId && !deps.workspace.findFile(tenant.org.id, input.driveFileId)) {
    throw new ApiError('API-RES-404');
  }
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    conversationId,
    threadRootId: input.threadRootId ?? null,
    authorUserId: tenant.user.id,
    body: input.body,
    driveFileId: input.driveFileId ?? null,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addMessage(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'chat.message_created',
    targetType: 'chat_message',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { threaded: row.threadRootId !== null },
  });
  return {
    id: row.id,
    threadRootId: row.threadRootId,
    authorUserId: row.authorUserId,
    body: row.body,
    driveFileId: row.driveFileId,
    createdAt: row.createdAt,
    engine: CHAT_ENGINE,
  };
}

export function searchChat(deps: AppDeps, tenant: TenantContext, query: string) {
  assertTier(tenant, 'business', 'chat');
  const needle = query.toLowerCase();
  const visible = new Set(
    deps.workspace
      .listConversations(tenant.org.id)
      .filter((row) => row.memberUserIds.includes(tenant.user.id))
      .map((row) => row.id),
  );
  const matches = deps.workspace
    .listConversations(tenant.org.id)
    .flatMap((row) => deps.workspace.listMessages(tenant.org.id, row.id))
    .filter((row) => visible.has(row.conversationId) && row.body.toLowerCase().includes(needle));
  return {
    engine: CHAT_ENGINE,
    adapter: adapter(deps),
    truncated: matches.length > 100,
    messages: matches.slice(0, 100).map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      threadRootId: row.threadRootId,
      body: row.body,
      createdAt: row.createdAt,
    })),
  };
}

export function chatPresence(tenant: TenantContext) {
  assertTier(tenant, 'business', 'chat');
  return {
    engine: CHAT_ENGINE,
    status: 'unknown' as const,
    calendarLinked: false,
    note: 'Presence is not linked to the calendar or out-of-office status.',
  };
}

function aliasLocal(label: string): string {
  const base =
    label
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 20) || 'mask';
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

export function listMaskedAliases(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'masked_alias');
  return {
    domain: MASK_DOMAIN,
    routed: false as const,
    cap: maskedAliasCap(tenant.plan.tier, privacyIncluded(deps, tenant)),
    aliases: deps.workspace.listAliases(tenant.org.id, tenant.user.id).map(presentAlias),
  };
}

function presentAlias(row: {
  id: string;
  label: string;
  address: string;
  enabled: boolean;
  messageCount: number;
  createdAt: string;
}) {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    enabled: row.enabled,
    messageCount: row.messageCount,
    createdAt: row.createdAt,
  };
}

export async function createMaskedAlias(
  deps: AppDeps,
  tenant: TenantContext,
  input: { label: string; localPart?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'masked_alias');
  const cap = maskedAliasCap(tenant.plan.tier, privacyIncluded(deps, tenant));
  const used = deps.workspace.listAliases(tenant.org.id, tenant.user.id).length;
  if (cap >= 0 && used >= cap) throw new ApiError('API-QUOTA-004', { resource: 'masked_alias' });
  const local = input.localPart ?? aliasLocal(input.label);
  const address = `${local}@${MASK_DOMAIN}`;
  await deps.workspace.prepareAliasAddress(address);
  if (deps.workspace.aliasTaken(address)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'localPart', message: 'That alias is already in use.' }],
    });
  }
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    label: input.label,
    address,
    enabled: true,
    messageCount: 0,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addAlias(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'privacy.alias_created',
    targetType: 'masked_alias',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return {
    ...presentAlias(row),
    note: `${MASK_DOMAIN} is not provisioned in Stalwart. Inbound mail is not delivered.`,
  };
}

export async function disableMaskedAlias(
  deps: AppDeps,
  tenant: TenantContext,
  id: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'masked_alias');
  const row = deps.workspace.findAlias(tenant.org.id, id);
  if (!row || row.ownerUserId !== tenant.user.id) throw new ApiError('API-RES-404');
  row.enabled = false;
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'privacy.alias_disabled',
    targetType: 'masked_alias',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return presentAlias(row);
}

export function privacyDashboard(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'privacy_dashboard');
  const included = privacyIncluded(deps, tenant);
  const aliases = deps.workspace.listAliases(tenant.org.id, tenant.user.id).map(presentAlias);
  return {
    scope: included ? ('full' as const) : ('basic' as const),
    addon: included,
    sessions: {
      trackedHere: false,
      note: 'Live sessions are on GET /api/v1/auth/sessions.',
    },
    trackers: {
      status: 'not-counted' as const,
      blocked: null,
      note: 'Tracker blocking is not measured.',
    },
    aliases,
    zeroAccess: {
      status: 'hook' as const,
      inboundEncryption: false,
      note: KEY_NOTE,
    },
  };
}

export async function setPrivacyAddon(
  deps: AppDeps,
  tenant: TenantContext,
  enabled: boolean,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertRole(tenant.user.role, BILLING_ROLES);
  assertTier(tenant, 'starter', 'privacy_addon');
  const state = deps.workspace.privacyOf(tenant.org.id);
  state.addonEnabled = enabled || tenant.plan.tier === 'enterprise';
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'privacy.addon_set',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { enabled: state.addonEnabled },
  });
  return { addon: privacyIncluded(deps, tenant), billed: false as const };
}

export function listPrivacyKeys(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'privacy_keys');
  if (!privacyIncluded(deps, tenant)) {
    throw new ApiError('API-BILL-003', { feature: 'privacy_keys', requiredTier: 'enterprise' });
  }
  return {
    serverDecrypts: false as const,
    generatesKeys: false as const,
    zeroAccess: 'hook' as const,
    note: KEY_NOTE,
    keys: deps.workspace.listKeys(tenant.org.id, tenant.user.id).map((row) => ({
      address: row.address,
      fingerprint: row.fingerprint,
      recoveryRegistered: row.recoveryRegistered,
      createdAt: row.createdAt,
    })),
  };
}

export async function savePrivacyKey(
  deps: AppDeps,
  tenant: TenantContext,
  input: {
    address: string;
    publicKeyArmored: string;
    wrappedPrivateKey: string;
    fingerprint: string;
  },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'privacy_keys');
  if (!privacyIncluded(deps, tenant)) {
    throw new ApiError('API-BILL-003', { feature: 'privacy_keys', requiredTier: 'enterprise' });
  }
  if (input.publicKeyArmored.includes('PRIVATE KEY')) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'publicKeyArmored', message: 'Send a public key, not a private key.' }],
    });
  }
  if (!input.publicKeyArmored.includes('BEGIN PGP PUBLIC KEY')) {
    throw new ApiError('API-VAL-001', {
      fields: [
        {
          path: 'publicKeyArmored',
          message: 'Send an OpenPGP public key block. This server does not generate keys.',
        },
      ],
    });
  }
  if (input.wrappedPrivateKey.includes('PRIVATE KEY BLOCK')) {
    throw new ApiError('API-VAL-001', {
      fields: [
        {
          path: 'wrappedPrivateKey',
          message: 'Send the client-wrapped private key, not an unprotected private key.',
        },
      ],
    });
  }
  const existing = deps.workspace.findKey(tenant.org.id, tenant.user.id, input.address);
  const row = {
    organizationId: tenant.org.id,
    userId: tenant.user.id,
    address: input.address,
    publicKeyArmored: input.publicKeyArmored,
    wrappedPrivateKey: input.wrappedPrivateKey,
    fingerprint: input.fingerprint.toLowerCase(),
    recoveryRegistered: existing?.recoveryRegistered ?? false,
    createdAt: existing?.createdAt ?? deps.now().toISOString(),
  };
  deps.workspace.upsertKey(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'privacy.key_registered',
    targetType: 'privacy_key',
    targetId: tenant.user.id,
    ipAddress: meta.ip,
    metadata: { fingerprint: row.fingerprint },
  });
  return {
    address: row.address,
    fingerprint: row.fingerprint,
    serverDecrypts: false as const,
    generatesKeys: false as const,
    zeroAccess: 'hook' as const,
    note: KEY_NOTE,
  };
}

export async function registerRecovery(deps: AppDeps, tenant: TenantContext, meta: AuthMeta) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'privacy_keys');
  if (!privacyIncluded(deps, tenant)) {
    throw new ApiError('API-BILL-003', { feature: 'privacy_keys', requiredTier: 'enterprise' });
  }
  const keys = deps.workspace.listKeys(tenant.org.id, tenant.user.id);
  const key = keys[0];
  if (!key) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'registered', message: 'Register a public key first.' }],
    });
  }
  key.recoveryRegistered = true;
  deps.workspace.upsertKey(key);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'privacy.recovery_recorded',
    targetType: 'privacy_key',
    targetId: tenant.user.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return {
    recoveryRegistered: true as const,
    phraseStored: false as const,
    note: 'The recovery phrase stays on the client. A reset without it cannot open older ciphertext, and this server does not hold ciphertext yet.',
  };
}

function assertEnterprise(tenant: TenantContext, feature: string) {
  assertRole(tenant.user.role, SECURITY_ROLES);
  assertTier(tenant, 'enterprise', feature);
}

export function enterpriseHome(deps: AppDeps, tenant: TenantContext) {
  assertEnterprise(tenant, 'enterprise');
  const flags = deps.workspace.enterpriseOf(tenant.org.id);
  return {
    byok: deps.workspace.listByok(tenant.org.id).map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      createdAt: row.createdAt,
      appliedToMail: false as const,
    })),
    siem: deps.workspace.listSiem(tenant.org.id).map((row) => ({
      id: row.id,
      kind: row.kind,
      enabled: row.enabled,
      createdAt: row.createdAt,
    })),
    simulations: deps.workspace.listSimulations(tenant.org.id),
    dedicatedIp: {
      enabled: flags.dedicatedIp,
      routed: false as const,
      note: 'This flag does not move mail. org_subscriptions.dedicated_ip_addon is not updated.',
    },
  };
}

export async function registerByok(
  deps: AppDeps,
  tenant: TenantContext,
  input: { version: number; kmsKeyRef: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertEnterprise(tenant, 'byok');
  if (deps.workspace.listByok(tenant.org.id).some((row) => row.version === input.version)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'version', message: 'That key version is already registered.' }],
    });
  }
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    version: input.version,
    kmsKeyRef: input.kmsKeyRef,
    status: 'registered' as const,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addByok(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'enterprise.byok_registered',
    targetType: 'byok_key',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { version: row.version },
  });
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    appliedToMail: false as const,
    note: 'The key reference is stored. Key material is not accepted, and mail is not re-encrypted.',
  };
}

export async function saveSiem(
  deps: AppDeps,
  tenant: TenantContext,
  input: { kind: 'webhook' | 'syslog'; target: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertEnterprise(tenant, 'siem');
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    kind: input.kind,
    target: input.target,
    enabled: true,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addSiem(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'enterprise.siem_saved',
    targetType: 'siem_destination',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { kind: row.kind },
  });
  return {
    id: row.id,
    kind: row.kind,
    enabled: true,
    delivered: false as const,
    note: 'The destination is stored. This API does not call the webhook or open a syslog socket.',
  };
}

export function sampleSiem(deps: AppDeps, tenant: TenantContext, id: string) {
  assertEnterprise(tenant, 'siem');
  const row = deps.workspace.findSiem(tenant.org.id, id);
  if (!row) throw new ApiError('API-RES-404');
  return {
    delivered: false as const,
    transport: 'stub' as const,
    destinationId: row.id,
    kind: row.kind,
    event: {
      action: 'siem.sample',
      organizationId: tenant.org.id,
      at: deps.now().toISOString(),
    },
  };
}

export async function createSimulation(
  deps: AppDeps,
  tenant: TenantContext,
  title: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertEnterprise(tenant, 'attack_simulation');
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    title,
    status: 'placeholder' as const,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addSimulation(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'enterprise.simulation_created',
    targetType: 'attack_simulation',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return {
    ...row,
    emailsSent: 0,
    sendsMail: false as const,
    note: 'No phishing messages are sent.',
  };
}

export async function setDedicatedIp(
  deps: AppDeps,
  tenant: TenantContext,
  enabled: boolean,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertEnterprise(tenant, 'dedicated_ip');
  const flags = deps.workspace.enterpriseOf(tenant.org.id);
  flags.dedicatedIp = enabled;
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'enterprise.dedicated_ip_set',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { enabled },
  });
  return {
    enabled,
    routed: false as const,
    note: 'Outbound mail stays on the plan IP pool.',
  };
}

const DEFAULT_BRAND = {
  productName: 'MR Rokesh',
  logoUrl: null as string | null,
  accentToken: 'brand' as const,
  custom: false as const,
};

export function publicBrand(deps: AppDeps, host: string) {
  const brand = deps.workspace.findBrandByHost(host);
  if (!brand) return DEFAULT_BRAND;
  return {
    productName: brand.productName,
    logoUrl: brand.logoUrl,
    accentToken: 'brand' as const,
    custom: true as const,
  };
}

export function brandAdmin(deps: AppDeps, tenant: TenantContext) {
  assertRole(tenant.user.role, ['owner']);
  assertTier(tenant, 'business_plus', 'white_label');
  const brand = deps.workspace.brandOf(tenant.org.id);
  return {
    accentToken: 'brand' as const,
    note: 'Colour stays on the brand token. A login host is a label until DNS and TLS are attached.',
    brand: brand
      ? {
          loginHost: brand.loginHost,
          productName: brand.productName,
          logoUrl: brand.logoUrl,
        }
      : null,
  };
}

export async function saveBrand(
  deps: AppDeps,
  tenant: TenantContext,
  input: { loginHost: string; productName: string; logoUrl?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertRole(tenant.user.role, ['owner']);
  assertTier(tenant, 'business_plus', 'white_label');
  await deps.workspace.prepareBrandHost(input.loginHost);
  const taken = deps.workspace.findBrandByHost(input.loginHost);
  if (taken && taken.organizationId !== tenant.org.id) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'loginHost', message: 'That login host is already in use.' }],
    });
  }
  const row = {
    organizationId: tenant.org.id,
    loginHost: input.loginHost,
    productName: input.productName,
    logoUrl: input.logoUrl ?? null,
    updatedAt: deps.now().toISOString(),
  };
  deps.workspace.saveBrand(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'brand.saved',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { loginHost: row.loginHost },
  });
  return {
    loginHost: row.loginHost,
    productName: row.productName,
    logoUrl: row.logoUrl,
    accentToken: 'brand' as const,
  };
}

function campaignView(
  deps: AppDeps,
  row: {
    id: string;
    name: string;
    subject: string;
    status: 'draft';
    unsubscribeToken: string;
    createdAt: string;
  },
) {
  const unsubscribeUrl = `${deps.config.webOrigin}/api/v1/public/campaigns/unsubscribe/${row.unsubscribeToken}`;
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    status: row.status,
    sendsFromMailbox: false as const,
    pool: 'campaign-addon-unwired' as const,
    createdAt: row.createdAt,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    unsubscribeUrl,
  };
}

export function listCampaigns(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'campaigns');
  return {
    product: 'campaigns-addon' as const,
    sendsFromMailbox: false as const,
    campaigns: deps.workspace.listCampaigns(tenant.org.id).map((row) => campaignView(deps, row)),
  };
}

export async function createCampaign(
  deps: AppDeps,
  tenant: TenantContext,
  input: { name: string; subject: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'campaigns');
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    name: input.name,
    subject: input.subject,
    status: 'draft' as const,
    unsubscribeToken: newOpaqueToken(),
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addCampaign(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'campaign.created',
    targetType: 'campaign',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return campaignView(deps, row);
}

export async function unsubscribeInfo(deps: AppDeps, token: string) {
  await deps.workspace.prepareUnsubscribeToken(token);
  const campaign = deps.workspace.findCampaignByToken(token);
  if (!campaign) throw new ApiError('API-RES-404');
  return {
    campaign: campaign.name,
    oneClick: 'POST' as const,
    note: 'POST List-Unsubscribe=One-Click with an email address. Nothing is mailed.',
  };
}

export async function unsubscribe(deps: AppDeps, token: string, email: string, meta: AuthMeta) {
  await deps.workspace.prepareUnsubscribeToken(token);
  const campaign = deps.workspace.findCampaignByToken(token);
  if (!campaign) throw new ApiError('API-RES-404');
  const existing = deps.workspace.findSuppression(campaign.organizationId, email);
  if (existing) return { suppressed: true as const, already: true as const };
  const row = {
    id: crypto.randomUUID(),
    organizationId: campaign.organizationId,
    campaignId: campaign.id,
    email: email.toLowerCase(),
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addSuppression(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: campaign.organizationId,
    actorUserId: null,
    requestId: meta.requestId,
    action: 'campaign.unsubscribed',
    targetType: 'campaign',
    targetId: campaign.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return { suppressed: true as const, already: false as const };
}
