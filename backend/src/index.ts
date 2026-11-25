import postgres from 'postgres';
import { loadConfig, loadEnvFile } from './config';
import { createPostgresStore } from './db/postgres-store';
import { createPostgresWorkspace } from './db/postgres-workspace';
import { LiveDns } from './dns/lookup';
import { MemoryRateLimiter, RedisRateLimiter } from './http/rate-limit';
import { HttpStalwartPlane } from './mail/http-stalwart';
import { MockMailPlane } from './mail/mock-plane';
import { PostgresMailArchive } from './mail/postgres-archive';
import { buildServer } from './server';
import { MemoryStore } from './store/memory';
import { WorkspaceStore } from './v1/workspace';

loadEnvFile();
const config = loadConfig();
const port = Number(process.env.API_PORT ?? 4000);
const requestedHost = process.env.API_HOST ?? '127.0.0.1';
// Collabora runs in Docker and calls WOPI on the host. A loopback bind is invisible there.
const host =
  requestedHost === '127.0.0.1' || requestedHost === 'localhost' ? '0.0.0.0' : requestedHost;

const storeMode = process.env.CONTROL_STORE ?? 'memory';
const databaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
const store = storeMode === 'postgres' ? await createPostgresStore(databaseUrl) : new MemoryStore();
const workspace =
  storeMode === 'postgres' ? createPostgresWorkspace(databaseUrl) : new WorkspaceStore();

if (storeMode === 'postgres') {
  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  if (!url.includes('mrrokesh_app')) {
    console.warn(
      'API database URL is not the mrrokesh_app role. The table owner and superusers bypass row-level security. On a managed database that cannot create mrrokesh_app, that bypass is expected.',
    );
  }
  await store.seedPlans();
}

const token = process.env.STALWART_ADMIN_TOKEN ?? '';
const archive =
  storeMode === 'postgres' && databaseUrl.length > 0
    ? new PostgresMailArchive(postgres(databaseUrl, { max: 2 }))
    : undefined;
const mail =
  process.env.MAIL_PLANE === 'http' && token.length > 0 && !token.includes('CHANGE_ME')
    ? new HttpStalwartPlane(
        process.env.STALWART_API_URL ?? 'http://127.0.0.1:8080',
        token,
        fetch,
        archive,
      )
    : new MockMailPlane();

const redisUrl = process.env.REDIS_URL ?? '';
const rates = redisUrl.length > 0 ? new RedisRateLimiter(redisUrl) : new MemoryRateLimiter();

const app = buildServer({
  config,
  store,
  workspace,
  mail,
  dns: new LiveDns(),
  rates,
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
