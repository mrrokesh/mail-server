import { ERROR_CODES, toApiError } from '@mrrokesh/shared';
import Fastify, { type FastifyError } from 'fastify';
import type { AppConfig } from './config';
import { loadConfig } from './config';
import type { DnsLookup } from './dns/lookup';
import { LiveDns } from './dns/lookup';
import { ApiError, BadJsonError } from './errors';
import { MemoryRateLimiter } from './http/rate-limit';
import type { MailPlane } from './mail/plane';
import { MockMailPlane } from './mail/mock-plane';
import { registerApi } from './routes/register';
import { registerV1 } from './routes/v1-modules';
import { registerV2 } from './routes/v2-modules';
import type { ControlStore } from './store/types';
import { MemoryStore } from './store/memory';
import { WorkspaceStore } from './v1/workspace';
import type { AppDeps } from './app-deps';

export interface BuildOptions {
  logger?: boolean;
  config?: AppConfig;
  store?: ControlStore;
  workspace?: WorkspaceStore;
  mail?: MailPlane;
  dns?: DnsLookup;
  now?: () => Date;
}

export function buildServer(options?: BuildOptions) {
  const config = options?.config ?? loadConfig();
  const deps: AppDeps = {
    config,
    store: options?.store ?? new MemoryStore(),
    workspace: options?.workspace ?? new WorkspaceStore(),
    mail: options?.mail ?? new MockMailPlane(),
    dns: options?.dns ?? new LiveDns(),
    challenges: new Map(),
    rates: new MemoryRateLimiter(),
    now: options?.now ?? (() => new Date()),
  };

  const app = Fastify({
    logger: options?.logger === false ? false : { level: 'info' },
    genReqId: (request) => {
      const header = request.headers['x-request-id'];
      return typeof header === 'string' && header.length > 0 ? header : crypto.randomUUID();
    },
  });
  app.decorate('deps', deps);

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => {
      const raw = typeof body === 'string' ? body : body.toString('utf8');
      const params = new URLSearchParams(raw);
      const parsed: Record<string, string> = {};
      for (const [key, value] of params) parsed[key] = value;
      done(null, parsed);
    },
  );

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const raw = typeof body === 'string' ? body : body.toString('utf8');
    request.rawBody = raw;
    if (!raw) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(raw) as unknown);
    } catch {
      done(new BadJsonError(), undefined);
    }
  });

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin === deps.config.webOrigin) {
      reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-credentials', 'true');
      reply.header('vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      reply.header('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      reply.header('access-control-allow-headers', 'Authorization,Content-Type,X-Request-Id');
      return reply.code(204).send();
    }
    return undefined;
  });

  app.get('/health', async () => ({ status: 'ok' as const }));
  app.get('/api/v1/health', async () => ({
    status: 'ok' as const,
    service: 'mrrokesh-mail-api',
  }));

  registerApi(app);
  registerV1(app);
  registerV2(app);

  app.addHook('onResponse', async () => {
    try {
      await deps.workspace.flush();
    } catch (error) {
      app.log.error({ err: error }, 'module flush failed');
    }
  });

  app.setNotFoundHandler((request, reply) => {
    const error = ERROR_CODES['API-RES-404'];
    return reply.status(error.http ?? 404).send(toApiError('API-RES-404', { path: request.url }));
  });

  app.setErrorHandler((error: FastifyError | ApiError | BadJsonError, request, reply) => {
    if (error instanceof BadJsonError) {
      return reply.status(422).send(toApiError('API-VAL-001'));
    }
    if (error instanceof ApiError) {
      request.log.warn({ code: error.code }, 'api error');
      return reply.status(error.statusCode).send(toApiError(error.code, error.details));
    }
    request.log.error({ err: error }, 'unhandled error');
    const spec = ERROR_CODES['API-SRV-500'];
    return reply
      .status(spec.http ?? 500)
      .send(toApiError('API-SRV-500', { requestId: request.id }));
  });

  return app;
}
