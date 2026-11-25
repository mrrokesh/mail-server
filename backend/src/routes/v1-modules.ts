import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { asUuid, loadTenant, parseBody } from '../services/access';
import type { AuthMeta } from '../services/auth';
import {
  addDiscoveryCase,
  addJournal,
  addLegalHold,
  aiStatus,
  aiSummarize,
  aiWrite,
  bookSlot,
  complianceView,
  createBookingPage,
  createContact,
  createDoc,
  createDriveFile,
  createDriveShare,
  createEvent,
  createMeeting,
  createNote,
  createScimToken,
  createTask,
  listBookingPages,
  listContacts,
  listDocs,
  listDriveFiles,
  listEvents,
  listMeetings,
  listNotes,
  listScimTokens,
  listTasks,
  patchNote,
  patchTask,
  plansForWeb,
  publicBooking,
  readPublicShare,
  saveSso,
  scimCreateUser,
  scimListUsers,
  scimProviderConfig,
  setAiEnabled,
  setArchive,
  setRetention,
  ssoView,
  wopiCheck,
  wopiSave,
} from '../v1/service';

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .transform((value) => value.normalize('NFKC').toLowerCase())
  .refine(
    (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    'Use lowercase letters, numbers, and hyphens.',
  );

function meta(request: FastifyRequest): AuthMeta {
  return {
    requestId: asUuid(request.id),
    ip: request.ip && request.ip.length > 0 ? request.ip : null,
  };
}

function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

export function registerV1(app: FastifyInstance): void {
  app.get('/api/v1/plans', async () => plansForWeb());

  app.get('/api/v1/drive/files', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listDriveFiles(app.deps, tenant);
  });

  app.post('/api/v1/drive/files', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(180),
        sizeBytes: z.number().int().positive(),
        contentType: z.string().trim().max(120).optional(),
      }),
      request.body,
    );
    const created = await createDriveFile(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/drive/files/:id/shares', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        password: z.string().min(4).max(80).optional(),
        expiresAt: z.string().datetime().optional(),
        maxDownloads: z.number().int().positive().max(10000).optional(),
        viewOnly: z.boolean().optional(),
      }),
      request.body,
    );
    const created = await createDriveShare(app.deps, tenant, params.id, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/public/drive/:token', async (request) => {
    const params = parseBody(z.object({ token: z.string().min(20) }), request.params);
    const query = parseBody(z.object({ password: z.string().optional() }), request.query);
    await app.deps.workspace.prepareShareToken(params.token);
    return readPublicShare(app.deps, params.token, query.password);
  });

  app.get('/api/v1/docs', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listDocs(app.deps, tenant);
  });

  app.post('/api/v1/docs', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(180),
        kind: z.enum(['document', 'spreadsheet', 'presentation']),
        template: z.string().trim().max(40).optional(),
      }),
      request.body,
    );
    const created = await createDoc(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/docs/:id/wopi', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return wopiCheck(app.deps, tenant, params.id);
  });

  app.post('/api/v1/docs/:id/wopi', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(z.object({ sizeBytes: z.number().int().nonnegative() }), request.body);
    return wopiSave(app.deps, tenant, params.id, body.sizeBytes, meta(request));
  });

  app.get('/api/v1/meet/rooms', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listMeetings(app.deps, tenant);
  });

  app.post('/api/v1/meet/rooms', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(120),
        passcode: z
          .string()
          .regex(/^\d{4,10}$/)
          .optional(),
      }),
      request.body,
    );
    const created = await createMeeting(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/booking/pages', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listBookingPages(app.deps, tenant);
  });

  app.post('/api/v1/booking/pages', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(120),
        slug: slugSchema,
        durationMinutes: z.number().int().min(15).max(240).default(30),
        timezone: z.string().trim().min(1).max(64).default('Asia/Kolkata'),
      }),
      request.body,
    );
    const created = await createBookingPage(
      app.deps,
      tenant,
      {
        ...body,
        durationMinutes: body.durationMinutes ?? 30,
        timezone: body.timezone ?? 'Asia/Kolkata',
      },
      meta(request),
    );
    return reply.code(201).send(created);
  });

  app.get('/api/v1/public/booking/:slug', async (request) => {
    const params = parseBody(z.object({ slug: slugSchema }), request.params);
    await app.deps.workspace.prepareBookingSlug(params.slug);
    return publicBooking(app.deps, params.slug);
  });

  app.post('/api/v1/public/booking/:slug', async (request, reply) => {
    const params = parseBody(z.object({ slug: slugSchema }), request.params);
    const body = parseBody(
      z.object({
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
        name: z.string().trim().min(1).max(80),
        email: z.string().trim().email().max(254),
      }),
      request.body,
    );
    await app.deps.workspace.prepareBookingSlug(params.slug);
    const created = await bookSlot(app.deps, params.slug, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/tasks', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listTasks(app.deps, tenant);
  });

  app.post('/api/v1/tasks', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(180),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        priority: z.enum(['low', 'normal', 'high']).optional(),
      }),
      request.body,
    );
    const created = await createTask(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.patch('/api/v1/tasks/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(180).optional(),
        done: z.boolean().optional(),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        priority: z.enum(['low', 'normal', 'high']).optional(),
      }),
      request.body,
    );
    return patchTask(app.deps, tenant, params.id, body);
  });

  app.get('/api/v1/notes', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listNotes(app.deps, tenant);
  });

  app.post('/api/v1/notes', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(180),
        body: z.string().max(20000).optional(),
      }),
      request.body,
    );
    const created = await createNote(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.patch('/api/v1/notes/:id', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(180).optional(),
        body: z.string().max(20000).optional(),
      }),
      request.body,
    );
    return patchNote(app.deps, tenant, params.id, body);
  });

  app.get('/api/v1/ai/status', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return aiStatus(app.deps, tenant);
  });

  app.put('/api/v1/admin/ai', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ enabled: z.boolean() }), request.body);
    return setAiEnabled(app.deps, tenant, body.enabled, meta(request));
  });

  app.post('/api/v1/ai/write', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ prompt: z.string().trim().min(1).max(4000) }), request.body);
    return aiWrite(app.deps, tenant, body.prompt, meta(request));
  });

  app.post('/api/v1/ai/summarize', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ text: z.string().trim().min(1).max(20000) }), request.body);
    return aiSummarize(app.deps, tenant, body.text, meta(request));
  });

  app.get('/api/v1/compliance', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return complianceView(app.deps, tenant);
  });

  app.put('/api/v1/compliance/archive', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ enabled: z.boolean() }), request.body);
    return setArchive(app.deps, tenant, body.enabled, meta(request));
  });

  app.put('/api/v1/compliance/retention', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ days: z.number().int().min(30).max(3650) }), request.body);
    return setRetention(app.deps, tenant, body.days, meta(request));
  });

  app.post('/api/v1/compliance/ediscovery', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ query: z.string().trim().min(1).max(500) }), request.body);
    const created = await addDiscoveryCase(app.deps, tenant, body.query, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/compliance/holds', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ matter: z.string().trim().min(1).max(180) }), request.body);
    const created = await addLegalHold(app.deps, tenant, body.matter, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/compliance/journaling', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({ destination: z.string().trim().email().max(254) }),
      request.body,
    );
    const created = await addJournal(app.deps, tenant, body.destination, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/admin/sso', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return ssoView(app.deps, tenant);
  });

  app.put('/api/v1/admin/sso', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        protocol: z.enum(['saml', 'oidc']),
        issuer: z.string().trim().url().max(300),
        metadata: z.string().trim().min(1).max(20000),
      }),
      request.body,
    );
    return saveSso(app.deps, tenant, body, meta(request));
  });

  app.get('/api/v1/admin/scim/tokens', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return { tokens: listScimTokens(app.deps, tenant) };
  });

  app.post('/api/v1/admin/scim/tokens', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ label: z.string().trim().min(1).max(80) }), request.body);
    const created = await createScimToken(app.deps, tenant, body.label, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/scim/v2/ServiceProviderConfig', async () => scimProviderConfig());

  app.get('/api/v1/scim/v2/Users', async (request) => scimListUsers(app.deps, bearer(request)));

  app.post('/api/v1/scim/v2/Users', async (request, reply) => {
    const body = parseBody(
      z.object({
        userName: z.string().trim().email().max(254),
        name: z.object({ formatted: z.string().trim().min(1).max(80) }).optional(),
        displayName: z.string().trim().min(1).max(80).optional(),
      }),
      request.body,
    );
    const displayName = body.name?.formatted ?? body.displayName ?? body.userName;
    const created = await scimCreateUser(
      app.deps,
      bearer(request),
      { userName: body.userName, displayName },
      meta(request),
    );
    return reply.code(201).send(created);
  });

  app.get('/api/v1/calendar/events', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listEvents(app.deps, tenant);
  });

  app.post('/api/v1/calendar/events', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        title: z.string().trim().min(1).max(120),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .optional(),
        end: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .optional(),
        calendar: z.enum(['personal', 'work', 'holidays']).optional(),
        location: z.string().max(180).optional(),
      }),
      request.body,
    );
    const created = await createEvent(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/contacts', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listContacts(app.deps, tenant);
  });

  app.post('/api/v1/contacts', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(80),
        email: z.string().trim().email().max(254),
        phone: z.string().max(40).optional(),
        role: z.string().max(80).optional(),
        notes: z.string().max(2000).optional(),
      }),
      request.body,
    );
    const created = await createContact(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });
}
