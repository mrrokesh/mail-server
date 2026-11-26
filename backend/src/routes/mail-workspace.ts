import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import {
  AUDIT_ROLES,
  USER_MANAGERS,
  assertRole,
  assertWritable,
  loadTenant,
  parseBody,
  presentUser,
  writeAudit,
} from '../services/access';
import { readClientMessage } from '../services/mail';
import { setUserActive } from '../services/mailboxes';
import type { ExtendedFolder } from '../v1/workspace';

const folderEnum = z.enum(['inbox', 'sent', 'drafts', 'archive', 'spam', 'trash', 'snoozed']);

function compileSieveRule(input: {
  name: string;
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'ends_with';
  value: string;
  action: 'move_folder' | 'add_label' | 'star' | 'mark_read';
  actionTarget: string;
}): string {
  const safeVal = input.value.replace(/"/g, '\\"');
  const safeTarget = input.actionTarget.replace(/"/g, '\\"');
  const match =
    input.operator === 'equals' ? ':is' : input.operator === 'ends_with' ? ':matches' : ':contains';
  const pattern = input.operator === 'ends_with' ? `*${safeVal}` : safeVal;
  const test =
    input.field === 'body'
      ? `body ${match} "${pattern}"`
      : `header ${match} "${input.field}" "${pattern}"`;
  let cmd = `addflag "\\\\Seen";`;
  if (input.action === 'move_folder') cmd = `fileinto "${safeTarget || 'Archive'}";`;
  if (input.action === 'add_label') cmd = `addflag "$label_${safeTarget || 'work'}";`;
  if (input.action === 'star') cmd = `addflag "\\\\Flagged";`;
  return `# Rule: ${input.name}\nrequire ["fileinto", "imap4flags", "body"];\nif ${test} {\n  ${cmd}\n}`;
}

export function registerMailWorkspace(app: FastifyInstance): void {
  // Update message flags/folder/labels/snooze/internalNote
  app.patch('/api/v1/mail/messages/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const body = parseBody(
      z.object({
        folder: folderEnum.optional(),
        unread: z.boolean().optional(),
        starred: z.boolean().optional(),
        pinned: z.boolean().optional(),
        muted: z.boolean().optional(),
        snoozeUntil: z.string().nullable().optional(),
        labels: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
        internalNote: z.string().max(2000).nullable().optional(),
      }),
      request.body,
    );
    const current = await readClientMessage(app.deps, tenant, params.id);
    const prev = app.deps.workspace.findMailState(tenant.org.id, params.id);
    const next = app.deps.workspace.upsertMailState({
      id: prev?.id ?? crypto.randomUUID(),
      organizationId: tenant.org.id,
      messageId: params.id,
      folder: (body.folder ?? prev?.folder ?? current.folder) as ExtendedFolder,
      unread: body.unread ?? prev?.unread ?? current.unread,
      starred: body.starred ?? prev?.starred ?? current.starred,
      pinned: body.pinned ?? prev?.pinned ?? current.pinned,
      muted: body.muted ?? prev?.muted ?? current.muted,
      snoozeUntil:
        body.snoozeUntil !== undefined
          ? body.snoozeUntil
          : (prev?.snoozeUntil ?? current.snoozeUntil),
      labels: body.labels ?? prev?.labels ?? current.labels,
      internalNote:
        body.internalNote !== undefined
          ? body.internalNote
          : (prev?.internalNote ?? current.internalNote),
      updatedAt: app.deps.now().toISOString(),
    });
    return { ...current, ...next };
  });

  // Bulk message actions
  app.post('/api/v1/mail/messages/bulk', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        ids: z.array(z.string().min(1)).min(1).max(200),
        folder: folderEnum.optional(),
        unread: z.boolean().optional(),
        starred: z.boolean().optional(),
      }),
      request.body,
    );
    let updated = 0;
    for (const id of body.ids) {
      try {
        const current = await readClientMessage(app.deps, tenant, id);
        const prev = app.deps.workspace.findMailState(tenant.org.id, id);
        app.deps.workspace.upsertMailState({
          id: prev?.id ?? crypto.randomUUID(),
          organizationId: tenant.org.id,
          messageId: id,
          folder: (body.folder ?? prev?.folder ?? current.folder) as ExtendedFolder,
          unread: body.unread ?? prev?.unread ?? current.unread,
          starred: body.starred ?? prev?.starred ?? current.starred,
          pinned: prev?.pinned ?? current.pinned,
          muted: prev?.muted ?? current.muted,
          snoozeUntil: prev?.snoozeUntil ?? current.snoozeUntil,
          labels: prev?.labels ?? current.labels,
          internalNote: prev?.internalNote ?? current.internalNote,
          updatedAt: app.deps.now().toISOString(),
        });
        updated += 1;
      } catch {
        // Skip IDs not owned by this tenant
      }
    }
    return { updated };
  });

  // Export message as RFC 5322 .eml
  app.get('/api/v1/mail/messages/:id/eml', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const msg = await readClientMessage(app.deps, tenant, params.id);
    const safeSub = msg.subject.replace(/[\r\n]+/g, ' ');
    const eml = [
      `From: ${msg.from}`,
      `To: ${msg.to.join(', ')}`,
      `Subject: ${safeSub}`,
      `Date: ${new Date(msg.at).toUTCString()}`,
      `Message-ID: <${msg.id}@mrrokesh.com>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      '',
      msg.text,
    ].join('\r\n');
    return reply
      .type('message/rfc822')
      .header('content-disposition', `attachment; filename="message-${msg.id}.eml"`)
      .send(eml);
  });

  // Drafts CRUD
  app.get('/api/v1/mail/drafts', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return { drafts: app.deps.workspace.listMailDrafts(tenant.org.id, tenant.user.id) };
  });

  app.post('/api/v1/mail/drafts', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        id: z.string().min(1).optional(),
        from: z.string().optional(),
        to: z.array(z.string()).default([]),
        cc: z.array(z.string()).default([]),
        bcc: z.array(z.string()).default([]),
        subject: z.string().max(998).default(''),
        bodyText: z.string().max(1_000_000).default(''),
        bodyHtml: z.string().max(1_000_000).default(''),
        inReplyTo: z.string().nullable().default(null),
      }),
      request.body,
    );
    const own = (await app.deps.store.listMailboxes(tenant.org.id)).find(
      (row) => row.userId === tenant.user.id && row.kind === 'user',
    );
    const draft = app.deps.workspace.upsertMailDraft({
      id: body.id ?? `drf_${crypto.randomUUID()}`,
      organizationId: tenant.org.id,
      userId: tenant.user.id,
      from: body.from ?? own?.address ?? tenant.user.email,
      to: body.to ?? [],
      cc: body.cc ?? [],
      bcc: body.bcc ?? [],
      subject: body.subject ?? '',
      bodyText: body.bodyText ?? '',
      bodyHtml: body.bodyHtml ?? '',
      inReplyTo: body.inReplyTo ?? null,
      updatedAt: app.deps.now().toISOString(),
    });
    return reply.code(201).send(draft);
  });

  app.delete('/api/v1/mail/drafts/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const removed = app.deps.workspace.deleteMailDraft(tenant.org.id, tenant.user.id, params.id);
    if (!removed) throw new ApiError('API-RES-404');
    return reply.code(204).send();
  });

  // Mail Preferences (signature, OOO, undo-send, shortcut preset, reading pane)
  app.get('/api/v1/mail/preferences', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return app.deps.workspace.mailPrefsOf(tenant.org.id, tenant.user.id);
  });

  app.put('/api/v1/mail/preferences', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const current = app.deps.workspace.mailPrefsOf(tenant.org.id, tenant.user.id);
    const body = parseBody(
      z.object({
        signatureHtml: z.string().max(10_000).optional(),
        vacationEnabled: z.boolean().optional(),
        vacationSubject: z.string().max(200).optional(),
        vacationInternal: z.string().max(5_000).optional(),
        vacationExternal: z.string().max(5_000).optional(),
        undoSendSec: z.number().int().min(5).max(30).optional(),
        shortcutPreset: z.enum(['gmail', 'outlook']).optional(),
        readingPane: z.enum(['right', 'bottom', 'off']).optional(),
        focusedInbox: z.boolean().optional(),
      }),
      request.body,
    );
    return app.deps.workspace.saveMailPrefs({
      ...current,
      ...body,
    });
  });

  // Email Templates
  app.get('/api/v1/mail/templates', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return { templates: app.deps.workspace.listMailTemplates(tenant.org.id, tenant.user.id) };
  });

  app.post('/api/v1/mail/templates', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(80),
        category: z.string().trim().min(1).max(40).default('General'),
        subject: z.string().trim().min(1).max(200),
        bodyText: z.string().trim().min(1).max(20_000),
      }),
      request.body,
    );
    const tpl = {
      id: `tpl_${crypto.randomUUID()}`,
      organizationId: tenant.org.id,
      userId: tenant.user.id,
      name: body.name,
      category: body.category ?? 'General',
      subject: body.subject,
      bodyText: body.bodyText,
      createdAt: app.deps.now().toISOString(),
    };
    app.deps.workspace.addMailTemplate(tpl);
    return reply.code(201).send(tpl);
  });

  app.delete('/api/v1/mail/templates/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    if (!app.deps.workspace.deleteMailTemplate(tenant.org.id, tenant.user.id, params.id)) {
      throw new ApiError('API-RES-404');
    }
    return reply.code(204).send();
  });

  // Visual Sieve Rules
  app.get('/api/v1/mail/rules', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return { rules: app.deps.workspace.listMailRules(tenant.org.id, tenant.user.id) };
  });

  app.post('/api/v1/mail/rules', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(80),
        field: z.enum(['from', 'to', 'subject', 'body']),
        operator: z.enum(['contains', 'equals', 'ends_with']),
        value: z.string().trim().min(1).max(200),
        action: z.enum(['move_folder', 'add_label', 'star', 'mark_read']),
        actionTarget: z.string().trim().max(80).default('archive'),
      }),
      request.body,
    );
    const actionTarget = body.actionTarget ?? 'archive';
    const rule = {
      id: `rul_${crypto.randomUUID()}`,
      organizationId: tenant.org.id,
      userId: tenant.user.id,
      name: body.name,
      enabled: true,
      field: body.field,
      operator: body.operator,
      value: body.value,
      action: body.action,
      actionTarget,
      compiledSieve: compileSieveRule({ ...body, actionTarget }),
      createdAt: app.deps.now().toISOString(),
    };
    app.deps.workspace.addMailRule(rule);
    return reply.code(201).send(rule);
  });

  app.patch('/api/v1/mail/rules/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    const body = parseBody(z.object({ enabled: z.boolean() }), request.body);
    const rule = app.deps.workspace.findMailRule(tenant.org.id, tenant.user.id, params.id);
    if (!rule) throw new ApiError('API-RES-404');
    rule.enabled = body.enabled;
    return rule;
  });

  app.delete('/api/v1/mail/rules/:id', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().min(1) }), request.params);
    if (!app.deps.workspace.deleteMailRule(tenant.org.id, tenant.user.id, params.id)) {
      throw new ApiError('API-RES-404');
    }
    return reply.code(204).send();
  });

  // Activate suspended user (complement to /suspend and /restore)
  app.post('/api/v1/users/:id/activate', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, USER_MANAGERS);
    assertWritable(tenant.subscription, app.deps.now());
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const updated = await setUserActive(app.deps, tenant, params.id, true);
    await writeAudit(app.deps.store, {
      at: app.deps.now(),
      organizationId: tenant.org.id,
      actorUserId: tenant.user.id,
      requestId: crypto.randomUUID(),
      action: 'user.activated',
      targetType: 'user',
      targetId: params.id,
      ipAddress: request.ip ?? null,
      metadata: {},
    });
    return updated;
  });

  // Admin Overview Telemetry
  app.get('/api/v1/admin/overview', async (request) => {
    const tenant = await loadTenant(request, 'session');
    assertRole(tenant.user.role, AUDIT_ROLES);
    const [users, domains, mailboxes] = await Promise.all([
      app.deps.store.listUsers(tenant.org.id),
      app.deps.store.listDomains(tenant.org.id),
      app.deps.store.listMailboxes(tenant.org.id),
    ]);
    const since = new Date(app.deps.now().getTime() - 30 * 24 * 60 * 60 * 1000);
    const audit =
      tenant.limits.auditRetentionDays > 0
        ? (await app.deps.store.listAudit(tenant.org.id, since)).slice(0, 12)
        : [];
    const usedBytes = mailboxes.reduce((sum, m) => sum + m.usedBytes, 0);
    const quotaBytes = mailboxes.reduce((sum, m) => sum + m.quotaBytes, 0);
    return {
      organization: tenant.org.name,
      plan: {
        tier: tenant.plan.tier,
        displayName: tenant.plan.displayName,
        status: tenant.subscription.status,
      },
      seats: {
        active: users.filter((u) => u.isActive && !u.deletedAt).length,
        total: users.filter((u) => !u.deletedAt).length,
        limit: tenant.limits.maxUsers,
      },
      domains: {
        total: domains.length,
        verified: domains.filter(
          (d) => d.isVerified && d.mxVerified && d.spfVerified && d.dkimVerified,
        ).length,
        limit: tenant.limits.maxDomains,
      },
      mailboxes: {
        total: mailboxes.length,
        usedBytes,
        quotaBytes,
      },
      security: {
        mfaEnforced: tenant.org.enforceMfa,
        mfaEnabledCount: users.filter((u) => u.mfaEnabled && !u.deletedAt).length,
        ssoEnabled: tenant.org.ssoEnabled,
      },
      recentAudit: audit.map((a) => ({
        id: a.id,
        action: a.action,
        targetType: a.targetType,
        createdAt: a.createdAt.toISOString(),
      })),
      usersPreview: users.slice(0, 5).map(presentUser),
    };
  });

  // Standards-compliant MTA-STS Policy & Thunderbird Autoconfig XML
  app.get('/.well-known/mta-sts.txt', async (_request, reply) => {
    const policy = [
      'version: STSv1',
      'mode: enforce',
      `mx: ${app.deps.config.mxHost}`,
      'max_age: 604800',
    ].join('\n');
    return reply.type('text/plain; charset=utf-8').send(policy);
  });

  app.get('/mail/config-v1.1.xml', async (request, reply) => {
    const query = parseBody(z.object({ emailaddress: z.string().optional() }), request.query);
    const domain = query.emailaddress?.split('@')[1] || 'mrrokesh.com';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="${domain}">
    <domain>${domain}</domain>
    <displayName>MR Rokesh Mail (${domain})</displayName>
    <displayShortName>MR Rokesh</displayShortName>
    <incomingServer type="imap">
      <hostname>${app.deps.config.mxHost}</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>${app.deps.config.mxHost}</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </outgoingServer>
  </emailProvider>
</clientConfig>`;
    return reply.type('application/xml; charset=utf-8').send(xml);
  });
}
