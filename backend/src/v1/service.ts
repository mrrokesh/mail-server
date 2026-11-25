import crypto from 'node:crypto';
import { utcDay } from '../billing/entitlements';
import { encryptString } from '../crypto/aes';
import { hashOpaqueToken, newOpaqueToken } from '../crypto/password';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import {
  COMPLIANCE_ROLES,
  SECURITY_ROLES,
  assertRole,
  assertWritable,
  writeAudit,
  type TenantContext,
} from '../services/access';
import type { AuthMeta } from '../services/auth';
import {
  aiDailyCap,
  assertTier,
  bookingPageCap,
  driveStorageLimit,
  driveUploadLimit,
  meetLimits,
  tierAtLeast,
  webPlanCatalog,
} from './gates';
import type { DocKind } from './workspace';

const DOC_TEMPLATES = [
  { id: 'gst-invoice', name: 'GST tax invoice', kind: 'spreadsheet' as const },
  { id: 'quotation', name: 'Quotation', kind: 'document' as const },
  { id: 'letterhead', name: 'Letterhead', kind: 'document' as const },
  { id: 'offer-letter', name: 'Offer letter', kind: 'document' as const },
];

function presentFile(file: {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}) {
  return { ...file, upload: 'stub' as const };
}

export function listDriveFiles(deps: AppDeps, tenant: TenantContext) {
  return {
    files: deps.workspace.listFiles(tenant.org.id).map(presentFile),
    storageBytes: driveStorageLimit(tenant.plan.tier),
    uploadBytes: driveUploadLimit(tenant.plan.tier),
  };
}

export async function createDriveFile(
  deps: AppDeps,
  tenant: TenantContext,
  input: { name: string; sizeBytes: number; contentType?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  if (input.sizeBytes > driveUploadLimit(tenant.plan.tier)) {
    throw new ApiError('API-DRV-001', { limitBytes: driveUploadLimit(tenant.plan.tier) });
  }
  const used = deps.workspace
    .listFiles(tenant.org.id)
    .reduce((sum, file) => sum + file.sizeBytes, 0);
  if (used + input.sizeBytes > driveStorageLimit(tenant.plan.tier)) {
    throw new ApiError('API-QUOTA-001', { resource: 'drive' });
  }
  const file = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    name: input.name,
    contentType: input.contentType ?? 'application/octet-stream',
    sizeBytes: input.sizeBytes,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addFile(file);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'drive.file_created',
    targetType: 'drive_file',
    targetId: file.id,
    ipAddress: meta.ip,
    metadata: { sizeBytes: file.sizeBytes },
  });
  return presentFile(file);
}

export async function createDriveShare(
  deps: AppDeps,
  tenant: TenantContext,
  fileId: string,
  input: {
    password?: string;
    expiresAt?: string;
    maxDownloads?: number;
    viewOnly?: boolean;
  },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'drive_share');
  const file = deps.workspace.findFile(tenant.org.id, fileId);
  if (!file) throw new ApiError('API-RES-404');
  const share = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    fileId: file.id,
    token: newOpaqueToken(),
    passwordHash: input.password ? hashOpaqueToken(input.password) : null,
    expiresAt: input.expiresAt ?? null,
    maxDownloads: input.maxDownloads ?? null,
    downloads: 0,
    viewOnly: input.viewOnly ?? false,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addShare(share);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'drive.share_created',
    targetType: 'drive_share',
    targetId: share.id,
    ipAddress: meta.ip,
    metadata: { viewOnly: share.viewOnly },
  });
  return {
    id: share.id,
    token: share.token,
    path: `/api/v1/public/drive/${share.token}`,
    expiresAt: share.expiresAt,
    maxDownloads: share.maxDownloads,
    viewOnly: share.viewOnly,
    hasPassword: share.passwordHash !== null,
  };
}

export function readPublicShare(deps: AppDeps, token: string, password?: string) {
  const share = deps.workspace.findShareByToken(token);
  if (!share) throw new ApiError('API-RES-404');
  if (share.expiresAt && Date.parse(share.expiresAt) <= deps.now().getTime()) {
    throw new ApiError('API-RES-404');
  }
  const file = deps.workspace.findFile(share.organizationId, share.fileId);
  if (!file) throw new ApiError('API-RES-404');
  if (share.passwordHash) {
    if (!password) return { locked: true as const, name: file.name };
    const given = Buffer.from(hashOpaqueToken(password));
    const expected = Buffer.from(share.passwordHash);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      throw new ApiError('API-SEC-002');
    }
  }
  if (share.maxDownloads !== null && share.downloads >= share.maxDownloads) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'token', message: 'This link has reached its download limit.' }],
    });
  }
  share.downloads += 1;
  return {
    locked: false as const,
    name: file.name,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    viewOnly: share.viewOnly,
    download: 'stub' as const,
  };
}

export function listDocs(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'business', 'docs');
  return {
    docs: deps.workspace.listDocs(tenant.org.id),
    collabora: {
      adapter: 'wopi-stub' as const,
      discoveryUrl: null,
      note: 'Collabora Online is not installed. WOPI check and save are local stubs.',
    },
    templates: DOC_TEMPLATES,
  };
}

export async function createDoc(
  deps: AppDeps,
  tenant: TenantContext,
  input: { name: string; kind: DocKind; template?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'business', 'docs');
  if (input.template && !DOC_TEMPLATES.some((item) => item.id === input.template)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'template', message: 'Choose a template from the list.' }],
    });
  }
  const doc = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    name: input.name,
    kind: input.kind,
    template: input.template ?? null,
    version: 1,
    sizeBytes: 0,
    updatedAt: deps.now().toISOString(),
  };
  deps.workspace.addDoc(doc);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'docs.created',
    targetType: 'doc',
    targetId: doc.id,
    ipAddress: meta.ip,
    metadata: { kind: doc.kind },
  });
  return doc;
}

export function wopiCheck(deps: AppDeps, tenant: TenantContext, id: string) {
  assertTier(tenant, 'business', 'docs');
  const doc = deps.workspace.findDoc(tenant.org.id, id);
  if (!doc) throw new ApiError('API-RES-404');
  return {
    BaseFileName: doc.name,
    Size: doc.sizeBytes,
    UserId: tenant.user.id,
    UserFriendlyName: tenant.user.fullName,
    OwnerId: doc.ownerUserId,
    Version: String(doc.version),
    SupportsUpdate: true,
    UserCanWrite: true,
    adapter: 'wopi-stub' as const,
  };
}

export async function wopiSave(
  deps: AppDeps,
  tenant: TenantContext,
  id: string,
  sizeBytes: number,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'business', 'docs');
  const doc = deps.workspace.findDoc(tenant.org.id, id);
  if (!doc) throw new ApiError('API-RES-404');
  doc.version += 1;
  doc.sizeBytes = sizeBytes;
  doc.updatedAt = deps.now().toISOString();
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'docs.wopi_save',
    targetType: 'doc',
    targetId: doc.id,
    ipAddress: meta.ip,
    metadata: { version: doc.version },
  });
  return { id: doc.id, version: doc.version, sizeBytes: doc.sizeBytes };
}

function presentMeeting(
  tenant: TenantContext,
  room: { id: string; title: string; passcode: string | null; createdAt: string },
) {
  const limits = meetLimits(tenant.plan.tier);
  return {
    ...room,
    participantCap: limits.participants,
    maxMinutes: limits.minutes,
    recording: limits.recording,
    livekitUrl: 'wss://meet.mrrokesh.mail',
    token: `stub.${room.id}`,
    adapter: 'livekit-stub' as const,
    features: {
      screenShare: true,
      chat: true,
      reactions: true,
      raiseHand: true,
      lobby: true,
      passcode: room.passcode !== null,
    },
  };
}

export function listMeetings(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'meet');
  return {
    rooms: deps.workspace.listMeetings(tenant.org.id).map((room) => presentMeeting(tenant, room)),
  };
}

export async function createMeeting(
  deps: AppDeps,
  tenant: TenantContext,
  input: { title: string; passcode?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'meet');
  const room = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    hostUserId: tenant.user.id,
    title: input.title,
    passcode: input.passcode ?? null,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addMeeting(room);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'meet.room_created',
    targetType: 'meeting',
    targetId: room.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return presentMeeting(tenant, room);
}

function slotsFor(page: { durationMinutes: number }, taken: Set<string>, now: Date): string[] {
  const slots: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (slots.length < 6 && slots.length < 40) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      for (const hour of [10, 11, 14, 15]) {
        const start = `${cursor.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:00:00`;
        if (!taken.has(start)) slots.push(start);
        if (slots.length >= 6) break;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getTime() - now.getTime() > 21 * 24 * 60 * 60 * 1000) break;
  }
  void page.durationMinutes;
  return slots;
}

export function listBookingPages(deps: AppDeps, tenant: TenantContext) {
  assertTier(tenant, 'starter', 'booking');
  return { pages: deps.workspace.listPages(tenant.org.id) };
}

export async function createBookingPage(
  deps: AppDeps,
  tenant: TenantContext,
  input: { title: string; slug: string; durationMinutes: number; timezone: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertTier(tenant, 'starter', 'booking');
  const cap = bookingPageCap(tenant.plan.tier);
  const used = deps.workspace.listPages(tenant.org.id).length;
  if (cap >= 0 && used >= cap) throw new ApiError('API-QUOTA-003', { resource: 'booking_page' });
  if (deps.workspace.findPageBySlug(input.slug)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'slug', message: 'That booking link is already in use.' }],
    });
  }
  const page = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    title: input.title,
    slug: input.slug,
    durationMinutes: input.durationMinutes,
    timezone: input.timezone,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addPage(page);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'booking.page_created',
    targetType: 'booking_page',
    targetId: page.id,
    ipAddress: meta.ip,
    metadata: { slug: page.slug },
  });
  return page;
}

export function publicBooking(deps: AppDeps, slug: string) {
  const page = deps.workspace.findPageBySlug(slug);
  if (!page) throw new ApiError('API-RES-404');
  const taken = new Set(deps.workspace.listAppointments(page.id).map((row) => row.start));
  return {
    title: page.title,
    slug: page.slug,
    durationMinutes: page.durationMinutes,
    timezone: page.timezone,
    slots: slotsFor(page, taken, deps.now()),
    meet: 'stub' as const,
    whatsapp: null,
  };
}

export async function bookSlot(
  deps: AppDeps,
  slug: string,
  input: { start: string; name: string; email: string },
  meta: AuthMeta,
) {
  const page = deps.workspace.findPageBySlug(slug);
  if (!page) throw new ApiError('API-RES-404');
  const subscription = await deps.store.findSubscription(page.organizationId);
  if (!subscription) throw new ApiError('API-RES-404');
  assertWritable(subscription, deps.now());
  const taken = deps.workspace.listAppointments(page.id).some((row) => row.start === input.start);
  if (taken) throw new ApiError('API-CAL-001');
  const row = {
    id: crypto.randomUUID(),
    pageId: page.id,
    organizationId: page.organizationId,
    start: input.start,
    name: input.name,
    email: input.email,
  };
  deps.workspace.addAppointment(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: page.organizationId,
    actorUserId: null,
    requestId: meta.requestId,
    action: 'booking.reserved',
    targetType: 'booking_page',
    targetId: page.id,
    ipAddress: meta.ip,
    metadata: { start: input.start },
  });
  return {
    id: row.id,
    start: row.start,
    title: page.title,
    meetLink: `https://meet.mrrokesh.mail/j/${page.slug}`,
    meet: 'stub' as const,
  };
}

export function listTasks(deps: AppDeps, tenant: TenantContext) {
  return { tasks: deps.workspace.listTasks(tenant.org.id) };
}

export async function createTask(
  deps: AppDeps,
  tenant: TenantContext,
  input: { title: string; dueDate?: string; priority?: 'low' | 'normal' | 'high' },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const task = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    title: input.title,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? 'normal',
    done: false,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addTask(task);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'task.created',
    targetType: 'task',
    targetId: task.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return task;
}

export async function patchTask(
  deps: AppDeps,
  tenant: TenantContext,
  id: string,
  patch: {
    title?: string;
    done?: boolean;
    dueDate?: string | null;
    priority?: 'low' | 'normal' | 'high';
  },
) {
  assertWritable(tenant.subscription, deps.now());
  const task = deps.workspace.findTask(tenant.org.id, id);
  if (!task) throw new ApiError('API-RES-404');
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.done !== undefined) task.done = patch.done;
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
  if (patch.priority !== undefined) task.priority = patch.priority;
  return task;
}

export function listNotes(deps: AppDeps, tenant: TenantContext) {
  return { notes: deps.workspace.listNotes(tenant.org.id) };
}

export async function createNote(
  deps: AppDeps,
  tenant: TenantContext,
  input: { title: string; body?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const note = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    ownerUserId: tenant.user.id,
    title: input.title,
    body: input.body ?? '',
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addNote(note);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'note.created',
    targetType: 'note',
    targetId: note.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return note;
}

export function patchNote(
  deps: AppDeps,
  tenant: TenantContext,
  id: string,
  patch: { title?: string; body?: string },
) {
  assertWritable(tenant.subscription, deps.now());
  const note = deps.workspace.findNote(tenant.org.id, id);
  if (!note) throw new ApiError('API-RES-404');
  if (patch.title !== undefined) note.title = patch.title;
  if (patch.body !== undefined) note.body = patch.body;
  return note;
}

function requireAi(tenant: TenantContext, deps: AppDeps) {
  assertTier(tenant, 'starter', 'ai');
  const state = deps.workspace.aiState(tenant.org.id, utcDay(deps.now()));
  if (!state.enabled) throw new ApiError('API-AUTH-003', { reason: 'ai_disabled' });
  const cap = aiDailyCap(tenant.plan.tier);
  if (state.used >= cap) throw new ApiError('API-QUOTA-006', { limit: cap });
  return state;
}

export function aiStatus(deps: AppDeps, tenant: TenantContext) {
  const entitled = tierAtLeast(tenant.plan.tier, 'starter');
  const state = deps.workspace.aiState(tenant.org.id, utcDay(deps.now()));
  const limit = aiDailyCap(tenant.plan.tier);
  return {
    entitled,
    enabled: state.enabled,
    used: state.used,
    limit,
    adapter: 'stub' as const,
  };
}

export async function setAiEnabled(
  deps: AppDeps,
  tenant: TenantContext,
  enabled: boolean,
  meta: AuthMeta,
) {
  assertRole(tenant.user.role, SECURITY_ROLES);
  const state = deps.workspace.aiState(tenant.org.id, utcDay(deps.now()));
  state.enabled = enabled;
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'ai.enabled_set',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { enabled },
  });
  return aiStatus(deps, tenant);
}

export async function aiWrite(
  deps: AppDeps,
  tenant: TenantContext,
  prompt: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const state = requireAi(tenant, deps);
  state.used += 1;
  const clip = prompt.trim().slice(0, 180);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'ai.write',
    targetType: 'user',
    targetId: tenant.user.id,
    ipAddress: meta.ip,
    metadata: { used: state.used },
  });
  return {
    text: `Draft: ${clip}`,
    remaining: Math.max(0, aiDailyCap(tenant.plan.tier) - state.used),
    adapter: 'stub' as const,
  };
}

export async function aiSummarize(
  deps: AppDeps,
  tenant: TenantContext,
  text: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const state = requireAi(tenant, deps);
  state.used += 1;
  const clip = text.trim().replace(/\s+/g, ' ').slice(0, 180);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'ai.summarize',
    targetType: 'user',
    targetId: tenant.user.id,
    ipAddress: meta.ip,
    metadata: { used: state.used },
  });
  return {
    summary: `Summary: ${clip}`,
    remaining: Math.max(0, aiDailyCap(tenant.plan.tier) - state.used),
    adapter: 'stub' as const,
  };
}

function assertCompliance(tenant: TenantContext) {
  assertRole(tenant.user.role, COMPLIANCE_ROLES);
  assertTier(tenant, 'business_plus', 'compliance');
}

export function complianceView(deps: AppDeps, tenant: TenantContext) {
  assertCompliance(tenant);
  const state = deps.workspace.complianceOf(tenant.org.id);
  return {
    archive: {
      enabled: state.archiveEnabled,
      note: 'Online archive is a hook. Messages are not copied until the archive worker ships.',
    },
    retention: { days: state.retentionDays, appliesTo: 'mail' as const },
    ediscovery: state.cases,
    holds: state.holds,
    journaling: state.journals,
  };
}

export async function setArchive(
  deps: AppDeps,
  tenant: TenantContext,
  enabled: boolean,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertCompliance(tenant);
  const state = deps.workspace.complianceOf(tenant.org.id);
  state.archiveEnabled = enabled;
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'compliance.archive_set',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { enabled },
  });
  return complianceView(deps, tenant).archive;
}

export async function setRetention(
  deps: AppDeps,
  tenant: TenantContext,
  days: number,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertCompliance(tenant);
  const state = deps.workspace.complianceOf(tenant.org.id);
  state.retentionDays = days;
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'compliance.retention_set',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { days },
  });
  return complianceView(deps, tenant).retention;
}

export async function addDiscoveryCase(
  deps: AppDeps,
  tenant: TenantContext,
  query: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertCompliance(tenant);
  const item = {
    id: crypto.randomUUID(),
    query,
    status: 'stub' as const,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.complianceOf(tenant.org.id).cases.push(item);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'compliance.ediscovery_created',
    targetType: 'ediscovery',
    targetId: item.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return item;
}

export async function addLegalHold(
  deps: AppDeps,
  tenant: TenantContext,
  matter: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertCompliance(tenant);
  const item = { id: crypto.randomUUID(), matter, createdAt: deps.now().toISOString() };
  deps.workspace.complianceOf(tenant.org.id).holds.push(item);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'compliance.hold_created',
    targetType: 'legal_hold',
    targetId: item.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return item;
}

export async function addJournal(
  deps: AppDeps,
  tenant: TenantContext,
  destination: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertCompliance(tenant);
  const rules = deps.workspace.complianceOf(tenant.org.id).journals;
  if (rules.length >= 300) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'destination', message: 'Journaling is capped at 300 rules.' }],
    });
  }
  const item = {
    id: crypto.randomUUID(),
    destination,
    enabled: true,
    createdAt: deps.now().toISOString(),
  };
  rules.push(item);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'compliance.journal_created',
    targetType: 'journal',
    targetId: item.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return item;
}

export function ssoView(deps: AppDeps, tenant: TenantContext) {
  assertRole(tenant.user.role, SECURITY_ROLES);
  assertTier(tenant, 'business_plus', 'sso');
  const state = deps.workspace.ssoOf(tenant.org.id);
  if (!state) return { configured: false as const, protocol: null, issuer: null };
  return {
    configured: true as const,
    protocol: state.protocol,
    issuer: state.issuer,
    metadata: null,
  };
}

export async function saveSso(
  deps: AppDeps,
  tenant: TenantContext,
  input: { protocol: 'saml' | 'oidc'; issuer: string; metadata: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertRole(tenant.user.role, SECURITY_ROLES);
  assertTier(tenant, 'business_plus', 'sso');
  const encrypted = encryptString(deps.config.dataEncryptionKey, input.metadata);
  deps.workspace.saveSso(tenant.org.id, {
    protocol: input.protocol,
    issuer: input.issuer,
    metadataEnc: encrypted.ciphertext.toString('base64'),
    metadataIv: encrypted.iv.toString('base64'),
  });
  await deps.store.updateOrg(tenant.org.id, { ssoEnabled: true });
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'sso.configured',
    targetType: 'organization',
    targetId: tenant.org.id,
    ipAddress: meta.ip,
    metadata: { protocol: input.protocol },
  });
  return ssoView(deps, tenant);
}

export async function createScimToken(
  deps: AppDeps,
  tenant: TenantContext,
  label: string,
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  assertRole(tenant.user.role, SECURITY_ROLES);
  assertTier(tenant, 'business_plus', 'scim');
  const token = newOpaqueToken();
  const row = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    tokenHash: hashOpaqueToken(token),
    label,
    createdAt: deps.now().toISOString(),
  };
  deps.workspace.addScimToken(row);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'scim.token_created',
    targetType: 'scim_token',
    targetId: row.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return { id: row.id, label: row.label, token, createdAt: row.createdAt };
}

export function listScimTokens(deps: AppDeps, tenant: TenantContext) {
  assertRole(tenant.user.role, SECURITY_ROLES);
  assertTier(tenant, 'business_plus', 'scim');
  return deps.workspace.listScimTokens(tenant.org.id).map((token) => ({
    id: token.id,
    label: token.label,
    createdAt: token.createdAt,
  }));
}

async function requireScim(deps: AppDeps, bearer: string) {
  const row = deps.workspace.findScimToken(hashOpaqueToken(bearer));
  if (!row) throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  const org = await deps.store.findOrg(row.organizationId);
  const subscription = await deps.store.findSubscription(row.organizationId);
  const plan = subscription ? await deps.store.findPlanById(subscription.planId) : null;
  if (!org || !subscription || !plan) throw new ApiError('API-AUTH-002', { reason: 'invalid' });
  if (!tierAtLeast(plan.tier, 'business_plus')) {
    throw new ApiError('API-BILL-003', { feature: 'scim', requiredTier: 'business_plus' });
  }
  return row.organizationId;
}

export function scimProviderConfig() {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: false },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: false, maxResults: 0 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      { type: 'oauthbearertoken', name: 'Bearer', description: 'SCIM token from the admin API' },
    ],
    note: 'Skeleton. Users created here are not mailboxes yet.',
  };
}

export async function scimListUsers(deps: AppDeps, bearer: string) {
  const organizationId = await requireScim(deps, bearer);
  const Resources = deps.workspace.listScimUsers(organizationId).map((user) => ({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    userName: user.userName,
    name: { formatted: user.displayName },
    active: user.active,
  }));
  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: Resources.length,
    Resources,
  };
}

export async function scimCreateUser(
  deps: AppDeps,
  bearer: string,
  input: { userName: string; displayName: string },
  meta: AuthMeta,
) {
  const organizationId = await requireScim(deps, bearer);
  const user = {
    id: crypto.randomUUID(),
    organizationId,
    userName: input.userName,
    displayName: input.displayName,
    active: true,
  };
  deps.workspace.addScimUser(user);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId,
    actorUserId: null,
    requestId: meta.requestId,
    action: 'scim.user_created',
    targetType: 'scim_user',
    targetId: user.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    userName: user.userName,
    name: { formatted: user.displayName },
    active: true,
  };
}

export function listEvents(deps: AppDeps, tenant: TenantContext) {
  return { events: deps.workspace.listEvents(tenant.org.id) };
}

export async function createEvent(
  deps: AppDeps,
  tenant: TenantContext,
  input: {
    title: string;
    date: string;
    start?: string | null;
    end?: string | null;
    calendar?: 'personal' | 'work' | 'holidays';
    location?: string;
  },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const event = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    calendar: input.calendar ?? 'personal',
    title: input.title,
    date: input.date,
    start: input.start ?? null,
    end: input.end ?? null,
    location: input.location ?? '',
  };
  deps.workspace.addEvent(event);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'calendar.event_created',
    targetType: 'event',
    targetId: event.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return event;
}

export async function listContacts(deps: AppDeps, tenant: TenantContext) {
  const users = await deps.store.listUsers(tenant.org.id);
  const directory = users
    .filter((user) => user.isActive && !user.deletedAt)
    .map((user) => ({
      id: user.id,
      book: 'directory' as const,
      name: user.fullName,
      email: user.email,
      phone: '',
      role: user.role,
      notes: '',
    }));
  const personal = deps.workspace.listContacts(tenant.org.id);
  return { contacts: [...directory, ...personal] };
}

export async function createContact(
  deps: AppDeps,
  tenant: TenantContext,
  input: { name: string; email: string; phone?: string; role?: string; notes?: string },
  meta: AuthMeta,
) {
  assertWritable(tenant.subscription, deps.now());
  const contact = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    book: 'personal' as const,
    name: input.name,
    email: input.email,
    phone: input.phone ?? '',
    role: input.role ?? '',
    notes: input.notes ?? '',
  };
  deps.workspace.addContact(contact);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'contact.created',
    targetType: 'contact',
    targetId: contact.id,
    ipAddress: meta.ip,
    metadata: {},
  });
  return contact;
}

export function plansForWeb() {
  return webPlanCatalog();
}
