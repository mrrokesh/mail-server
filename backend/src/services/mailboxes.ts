import crypto from 'node:crypto';
import { quotaBytes, seatCap, withinCap } from '../billing/entitlements';
import { hashPassword, newOpaqueToken, passwordPolicyError } from '../crypto/password';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { MailboxRecord, OrgRole } from '../store/types';
import {
  PASSWORD_HELPERS,
  USER_MANAGERS,
  assertEntitled,
  assertRole,
  assertWritable,
  presentMailbox,
  presentUser,
  writeAudit,
  type TenantContext,
} from './access';
import type { AuthMeta } from './auth';

const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/;
const ASSIGNABLE_BY_ADMIN: OrgRole[] = ['member', 'helpdesk', 'read_only'];

export async function createUserAccount(
  deps: AppDeps,
  tenant: TenantContext,
  input: { email: string; fullName: string; password: string; role: OrgRole },
  meta: AuthMeta,
) {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  if (input.role === 'owner') throw new ApiError('API-AUTH-003');
  if (tenant.user.role === 'user_admin' && !ASSIGNABLE_BY_ADMIN.includes(input.role)) {
    throw new ApiError('API-AUTH-003');
  }
  const passwordMessage = passwordPolicyError(input.password);
  if (passwordMessage) {
    throw new ApiError('API-VAL-001', { fields: [{ path: 'password', message: passwordMessage }] });
  }
  const cap = seatCap(tenant.limits, tenant.subscription.seatLimit);
  const used = await deps.store.countActiveUsers(tenant.org.id);
  if (!withinCap(used, cap)) throw new ApiError('API-QUOTA-003', { resource: 'user' });
  const now = deps.now();
  const user = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    passwordHash: await hashPassword(
      input.password,
      deps.config.passwordPepper,
      deps.config.bcryptCost,
    ),
    pepperVersion: deps.config.pepperVersion,
    totpSecretEnc: null,
    totpSecretIv: null,
    mfaEnabled: false,
    isActive: true,
    deletedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const saved = await deps.store.insertUser(user);
  if (saved === 'duplicate_email') throw new ApiError('API-MAIL-003');
  await writeAudit(deps.store, {
    at: now,
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'user.created',
    targetType: 'user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: { role: input.role },
  });
  return presentUser(user);
}

export async function setUserActive(
  deps: AppDeps,
  tenant: TenantContext,
  userId: string,
  active: boolean,
): Promise<ReturnType<typeof presentUser>> {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  const user = await deps.store.findUser(tenant.org.id, userId);
  if (!user || user.deletedAt) throw new ApiError('API-RES-404');
  if (user.role === 'owner') throw new ApiError('API-AUTH-003');
  const updated = await deps.store.updateUser(tenant.org.id, userId, { isActive: active });
  if (!updated) throw new ApiError('API-RES-404');
  if (!active) await deps.store.revokeAllRefreshForUser(tenant.org.id, userId, deps.now());
  return presentUser(updated);
}

export async function deleteUserAccount(
  deps: AppDeps,
  tenant: TenantContext,
  userId: string,
): Promise<void> {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  const user = await deps.store.findUser(tenant.org.id, userId);
  if (!user || user.deletedAt) throw new ApiError('API-RES-404');
  if (user.role === 'owner' || user.id === tenant.user.id) throw new ApiError('API-AUTH-003');
  await deps.store.updateUser(tenant.org.id, userId, { isActive: false, deletedAt: deps.now() });
  await deps.store.revokeAllRefreshForUser(tenant.org.id, userId, deps.now());
}

export async function restoreUserAccount(
  deps: AppDeps,
  tenant: TenantContext,
  userId: string,
): Promise<ReturnType<typeof presentUser>> {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  const user = await deps.store.findUser(tenant.org.id, userId);
  if (!user?.deletedAt) throw new ApiError('API-RES-404');
  if (deps.now().getTime() - user.deletedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
    throw new ApiError('API-RES-404');
  }
  const cap = seatCap(tenant.limits, tenant.subscription.seatLimit);
  const used = await deps.store.countActiveUsers(tenant.org.id);
  if (!withinCap(used, cap)) throw new ApiError('API-QUOTA-003', { resource: 'user' });
  const updated = await deps.store.updateUser(tenant.org.id, userId, {
    isActive: true,
    deletedAt: null,
  });
  if (!updated) throw new ApiError('API-RES-404');
  return presentUser(updated);
}

export async function resetUserPassword(
  deps: AppDeps,
  tenant: TenantContext,
  userId: string,
  password: string,
): Promise<void> {
  assertRole(tenant.user.role, PASSWORD_HELPERS);
  const user = await deps.store.findUser(tenant.org.id, userId);
  if (!user || user.deletedAt) throw new ApiError('API-RES-404');
  if (user.role === 'owner' && tenant.user.role !== 'owner') throw new ApiError('API-AUTH-003');
  const message = passwordPolicyError(password);
  if (message) throw new ApiError('API-VAL-001', { fields: [{ path: 'password', message }] });
  await deps.store.updateUser(tenant.org.id, userId, {
    passwordHash: await hashPassword(password, deps.config.passwordPepper, deps.config.bcryptCost),
    pepperVersion: deps.config.pepperVersion,
  });
  await deps.store.revokeAllRefreshForUser(tenant.org.id, userId, deps.now());
}

async function visibleMailbox(deps: AppDeps, tenant: TenantContext, mailbox: MailboxRecord) {
  if (
    tenant.user.role === 'owner' ||
    tenant.user.role === 'user_admin' ||
    tenant.user.role === 'helpdesk'
  ) {
    return true;
  }
  if (mailbox.userId === tenant.user.id) return true;
  const delegations = await deps.store.listDelegationsForUser(tenant.org.id, tenant.user.id);
  return delegations.some((row) => row.mailboxId === mailbox.id && row.canRead);
}

export async function listVisibleMailboxes(deps: AppDeps, tenant: TenantContext) {
  const rows = await deps.store.listMailboxes(tenant.org.id);
  const visible = [];
  for (const row of rows) {
    if (await visibleMailbox(deps, tenant, row)) visible.push(presentMailbox(row));
  }
  return visible;
}

export async function createMailbox(
  deps: AppDeps,
  tenant: TenantContext,
  input: { domainId: string; localPart: string; kind: MailboxRecord['kind']; userId?: string },
  meta: AuthMeta,
) {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  if (!LOCAL_RE.test(input.localPart)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'localPart', message: 'Use letters, numbers, dots, or plus tags.' }],
    });
  }
  const domain = await deps.store.findDomain(tenant.org.id, input.domainId);
  if (!domain) throw new ApiError('API-RES-404');
  if (input.kind !== 'user') {
    assertEntitled(tenant.limits, 'sharedMailbox');
    const shared = await deps.store.countMailboxesByKind(tenant.org.id, input.kind);
    if (!withinCap(shared, tenant.limits.maxSharedMailboxes)) {
      throw new ApiError('API-QUOTA-003', { resource: 'shared_mailbox' });
    }
  }
  let userId: string | null = null;
  if (input.kind === 'user') {
    userId = input.userId ?? tenant.user.id;
    const owner = await deps.store.findUser(tenant.org.id, userId);
    if (!owner || owner.deletedAt) throw new ApiError('API-RES-404');
    const existing = (await deps.store.listMailboxes(tenant.org.id)).filter(
      (row) => row.userId === userId && row.kind === 'user',
    );
    if (existing.length > 0) {
      throw new ApiError('API-VAL-001', {
        fields: [{ path: 'userId', message: 'This person already has a mailbox.' }],
      });
    }
  }
  const address = `${input.localPart}@${domain.domainName}`;
  const now = deps.now();
  const mailbox: MailboxRecord = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    domainId: domain.id,
    userId,
    kind: input.kind,
    address,
    stalwartPrincipalId: `pr_${crypto.randomUUID()}`,
    quotaBytes: quotaBytes(tenant.limits.storageGbPerSeat),
    usedBytes: 0,
    archiveAutoExpand: tenant.limits.archiveAutoExpand,
    createdAt: now,
  };
  const saved = await deps.store.insertMailbox(mailbox);
  if (saved === 'duplicate') throw new ApiError('API-MAIL-003');
  const sync = await deps.mail.ensurePrincipal({
    organizationId: tenant.org.id,
    stalwartTenantId: tenant.org.stalwartTenantId,
    principalId: mailbox.stalwartPrincipalId,
    address,
    kind: mailbox.kind,
  });
  await writeAudit(deps.store, {
    at: now,
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'mailbox.created',
    targetType: 'mailbox',
    targetId: mailbox.id,
    ipAddress: meta.ip,
    metadata: { address, syncStatus: sync.syncStatus },
  });
  return { mailbox: presentMailbox(mailbox), syncStatus: sync.syncStatus };
}

export async function createAlias(
  deps: AppDeps,
  tenant: TenantContext,
  mailboxId: string,
  input: { localPart: string; domainId: string; label?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
  if (!mailbox) throw new ApiError('API-RES-404');
  const canManage =
    tenant.user.role === 'owner' ||
    tenant.user.role === 'user_admin' ||
    mailbox.userId === tenant.user.id;
  if (!canManage) throw new ApiError('API-AUTH-003');
  if (!LOCAL_RE.test(input.localPart)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'localPart', message: 'Use letters, numbers, dots, or plus tags.' }],
    });
  }
  const domain = await deps.store.findDomain(tenant.org.id, input.domainId);
  if (!domain) throw new ApiError('API-RES-404');
  const count = await deps.store.countAliases(tenant.org.id, mailbox.id);
  if (!withinCap(count, tenant.limits.maxAliasesPerBox)) throw new ApiError('API-QUOTA-004');
  const aliasAddress = `${input.localPart}@${domain.domainName}`;
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    mailboxId: mailbox.id,
    domainId: domain.id,
    aliasAddress,
    isDisposableMasked: false,
    label: input.label ?? null,
    isActive: true,
    createdAt: deps.now(),
  };
  const saved = await deps.store.insertAlias(row);
  if (saved === 'duplicate') throw new ApiError('API-MAIL-003');
  const sync = await deps.mail.upsertAlias({
    organizationId: tenant.org.id,
    principalId: mailbox.stalwartPrincipalId,
    alias: aliasAddress,
  });
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'alias.created',
    targetType: 'alias',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: { aliasAddress, syncStatus: sync.syncStatus },
  });
  return {
    id: row.id,
    aliasAddress,
    label: row.label,
    syncStatus: sync.syncStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function removeAlias(
  deps: AppDeps,
  tenant: TenantContext,
  mailboxId: string,
  aliasId: string,
): Promise<void> {
  const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
  if (!mailbox) throw new ApiError('API-RES-404');
  const aliases = await deps.store.listAliases(tenant.org.id, mailboxId);
  const alias = aliases.find((row) => row.id === aliasId);
  if (!alias) throw new ApiError('API-RES-404');
  const removed = await deps.store.deleteAlias(tenant.org.id, mailboxId, aliasId);
  if (!removed) throw new ApiError('API-RES-404');
  await deps.mail.removeAlias({
    organizationId: tenant.org.id,
    principalId: mailbox.stalwartPrincipalId,
    alias: alias.aliasAddress,
  });
}

export async function createDelegation(
  deps: AppDeps,
  tenant: TenantContext,
  mailboxId: string,
  input: { delegateUserId: string; canRead: boolean; canSendAs: boolean; canSendOnBehalf: boolean },
) {
  assertRole(tenant.user.role, USER_MANAGERS);
  assertWritable(tenant.subscription, deps.now());
  assertEntitled(tenant.limits, 'sendAs');
  const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
  if (!mailbox) throw new ApiError('API-RES-404');
  const delegate = await deps.store.findUser(tenant.org.id, input.delegateUserId);
  if (!delegate || delegate.deletedAt) throw new ApiError('API-RES-404');
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    mailboxId,
    delegateUserId: input.delegateUserId,
    canRead: input.canRead,
    canSendAs: input.canSendAs,
    canSendOnBehalf: input.canSendOnBehalf,
    createdAt: deps.now(),
  };
  const saved = await deps.store.insertDelegation(row);
  if (saved === 'duplicate') throw new ApiError('API-MAIL-003');
  return { id: row.id, ...input };
}

export async function createAppPassword(
  deps: AppDeps,
  tenant: TenantContext,
  mailboxId: string,
  label: string,
) {
  assertEntitled(tenant.limits, 'imap');
  assertWritable(tenant.subscription, deps.now());
  const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
  if (!mailbox) throw new ApiError('API-RES-404');
  if (!(await visibleMailbox(deps, tenant, mailbox)) && tenant.user.role !== 'security_admin') {
    throw new ApiError('API-AUTH-003');
  }
  const password = `mrm_${newOpaqueToken()}`;
  const now = deps.now();
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    mailboxId,
    userId: tenant.user.id,
    label,
    passwordHash: await hashPassword(password, deps.config.passwordPepper, deps.config.bcryptCost),
    pepperVersion: deps.config.pepperVersion,
    revokedAt: null,
    createdAt: now,
  };
  await deps.store.insertAppPassword(row);
  return { id: row.id, label, password, createdAt: now.toISOString() };
}

export async function listAppPasswords(deps: AppDeps, tenant: TenantContext, mailboxId: string) {
  assertEntitled(tenant.limits, 'imap');
  const mailbox = await deps.store.findMailbox(tenant.org.id, mailboxId);
  if (!mailbox) throw new ApiError('API-RES-404');
  const rows = await deps.store.listAppPasswords(tenant.org.id, mailboxId);
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}
