import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { asUuid, loadTenant, parseBody } from '../services/access';
import type { AuthMeta } from '../services/auth';
import {
  brandAdmin,
  chatPresence,
  createCampaign,
  createConversation,
  createMaskedAlias,
  createSimulation,
  disableMaskedAlias,
  enterpriseHome,
  listCampaigns,
  listChatMessages,
  listConversations,
  listMaskedAliases,
  listPrivacyKeys,
  postChatMessage,
  privacyDashboard,
  publicBrand,
  registerByok,
  registerRecovery,
  sampleSiem,
  saveBrand,
  savePrivacyKey,
  saveSiem,
  searchChat,
  setDedicatedIp,
  setPrivacyAddon,
  unsubscribe,
  unsubscribeInfo,
} from '../v2/service';

const hostSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/);

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(300)
  .refine((value) => value.startsWith('https://'), 'Use an https URL.');

function meta(request: FastifyRequest): AuthMeta {
  return {
    requestId: asUuid(request.id),
    ip: request.ip && request.ip.length > 0 ? request.ip : null,
  };
}

export function registerV2(app: FastifyInstance): void {
  app.get('/api/v1/chat/conversations', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listConversations(app.deps, tenant);
  });

  app.post('/api/v1/chat/conversations', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        kind: z.enum(['direct', 'group', 'channel']),
        title: z.string().trim().min(1).max(120),
        memberUserIds: z.array(z.string().uuid()).max(50).optional(),
      }),
      request.body,
    );
    const created = await createConversation(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/chat/conversations/:id/messages', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return listChatMessages(app.deps, tenant, params.id);
  });

  app.post('/api/v1/chat/conversations/:id/messages', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    const body = parseBody(
      z.object({
        body: z.string().trim().min(1).max(4000),
        threadRootId: z.string().uuid().optional(),
        driveFileId: z.string().uuid().optional(),
      }),
      request.body,
    );
    const created = await postChatMessage(app.deps, tenant, params.id, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/chat/search', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const query = parseBody(z.object({ q: z.string().trim().min(1).max(80) }), request.query);
    return searchChat(app.deps, tenant, query.q);
  });

  app.get('/api/v1/chat/presence', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return chatPresence(tenant);
  });

  app.get('/api/v1/privacy/aliases', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listMaskedAliases(app.deps, tenant);
  });

  app.post('/api/v1/privacy/aliases', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        label: z.string().trim().min(1).max(80),
        localPart: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9][a-z0-9-]{1,30}$/)
          .optional(),
      }),
      request.body,
    );
    const created = await createMaskedAlias(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/privacy/aliases/:id/disable', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return disableMaskedAlias(app.deps, tenant, params.id, meta(request));
  });

  app.get('/api/v1/privacy/dashboard', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return privacyDashboard(app.deps, tenant);
  });

  app.put('/api/v1/privacy/addon', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ enabled: z.boolean() }).strict(), request.body);
    return setPrivacyAddon(app.deps, tenant, body.enabled, meta(request));
  });

  app.get('/api/v1/privacy/keys', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listPrivacyKeys(app.deps, tenant);
  });

  app.put('/api/v1/privacy/keys', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z
        .object({
          address: z.string().trim().email().max(254),
          publicKeyArmored: z.string().trim().min(40).max(8000),
          wrappedPrivateKey: z.string().trim().min(40).max(8000),
          fingerprint: z
            .string()
            .trim()
            .regex(/^[A-Fa-f0-9]{16,128}$/),
        })
        .strict(),
      request.body,
    );
    return savePrivacyKey(app.deps, tenant, body, meta(request));
  });

  app.post('/api/v1/privacy/recovery', async (request) => {
    const tenant = await loadTenant(request, 'session');
    parseBody(z.object({ registered: z.literal(true) }).strict(), request.body);
    return registerRecovery(app.deps, tenant, meta(request));
  });

  app.get('/api/v1/enterprise', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return enterpriseHome(app.deps, tenant);
  });

  app.post('/api/v1/enterprise/byok', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z
        .object({
          version: z.number().int().min(1).max(32767),
          kmsKeyRef: z
            .string()
            .trim()
            .min(1)
            .max(200)
            .regex(/^[A-Za-z0-9:._/=+-]+$/)
            .refine((value) => !value.includes('BEGIN'), 'Send a key reference, not key material.'),
        })
        .strict(),
      request.body,
    );
    const created = await registerByok(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/enterprise/siem', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z
        .object({
          kind: z.enum(['webhook', 'syslog']),
          target: z.string().trim().min(1).max(300),
        })
        .strict()
        .superRefine((value, context) => {
          if (value.kind === 'webhook') {
            const parsed = httpsUrl.safeParse(value.target);
            if (!parsed.success) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['target'],
                message: 'Use an https webhook URL.',
              });
            }
          } else if (!/^[a-z0-9.-]+:\d{2,5}$/i.test(value.target)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['target'],
              message: 'Use host:port for syslog.',
            });
          }
        }),
      request.body,
    );
    const created = await saveSiem(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.post('/api/v1/enterprise/siem/:id/sample', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const params = parseBody(z.object({ id: z.string().uuid() }), request.params);
    return sampleSiem(app.deps, tenant, params.id);
  });

  app.post('/api/v1/enterprise/attack-simulations', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({ title: z.string().trim().min(1).max(120) }).strict(),
      request.body,
    );
    const created = await createSimulation(app.deps, tenant, body.title, meta(request));
    return reply.code(201).send(created);
  });

  app.put('/api/v1/enterprise/dedicated-ip', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(z.object({ enabled: z.boolean() }).strict(), request.body);
    return setDedicatedIp(app.deps, tenant, body.enabled, meta(request));
  });

  app.get('/api/v1/admin/brand', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return brandAdmin(app.deps, tenant);
  });

  app.put('/api/v1/admin/brand', async (request) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z
        .object({
          loginHost: hostSchema,
          productName: z.string().trim().min(1).max(40),
          logoUrl: z.union([httpsUrl, z.literal('')]).optional(),
        })
        .strict(),
      request.body,
    );
    return saveBrand(
      app.deps,
      tenant,
      {
        loginHost: body.loginHost,
        productName: body.productName,
        ...(body.logoUrl ? { logoUrl: body.logoUrl } : {}),
      },
      meta(request),
    );
  });

  app.get('/api/v1/public/brand', async (request) => {
    const query = parseBody(z.object({ host: z.string().trim().min(1).max(253) }), request.query);
    await app.deps.workspace.prepareBrandHost(query.host);
    return publicBrand(app.deps, query.host);
  });

  app.get('/api/v1/campaigns', async (request) => {
    const tenant = await loadTenant(request, 'session');
    return listCampaigns(app.deps, tenant);
  });

  app.post('/api/v1/campaigns', async (request, reply) => {
    const tenant = await loadTenant(request, 'session');
    const body = parseBody(
      z.object({
        name: z.string().trim().min(1).max(120),
        subject: z.string().trim().min(1).max(200),
      }),
      request.body,
    );
    const created = await createCampaign(app.deps, tenant, body, meta(request));
    return reply.code(201).send(created);
  });

  app.get('/api/v1/public/campaigns/unsubscribe/:token', async (request) => {
    const params = parseBody(z.object({ token: z.string().min(20).max(200) }), request.params);
    return unsubscribeInfo(app.deps, params.token);
  });

  app.post('/api/v1/public/campaigns/unsubscribe/:token', async (request) => {
    const params = parseBody(z.object({ token: z.string().min(20).max(200) }), request.params);
    const body = parseBody(
      z.object({
        email: z.string().trim().email().max(254),
        'List-Unsubscribe': z.literal('One-Click').optional(),
      }),
      request.body,
    );
    return unsubscribe(app.deps, params.token, body.email, meta(request));
  });
}
