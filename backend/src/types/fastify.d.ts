import type { AccessClaims } from '../crypto/jwt';
import type { AppDeps } from '../app-deps';
import type { TenantContext } from '../services/access';

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps;
  }

  interface FastifyRequest {
    rawBody?: string;
    auth?: AccessClaims;
    tenant?: TenantContext;
  }
}

export {};
