import { loadConfig, loadEnvFile } from './config';
import { createPostgresStore } from './db/postgres-store';
import { LiveDns } from './dns/lookup';
import { HttpStalwartPlane } from './mail/http-stalwart';
import { MockMailPlane } from './mail/mock-plane';
import { buildServer } from './server';
import { MemoryStore } from './store/memory';

loadEnvFile();
const config = loadConfig();
const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? '127.0.0.1';

const storeMode = process.env.CONTROL_STORE ?? 'memory';
const store =
  storeMode === 'postgres'
    ? await createPostgresStore(process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? '')
    : new MemoryStore();

if (storeMode === 'postgres') {
  const url = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  if (!url.includes('mrrokesh_app')) {
    console.warn(
      'API database URL is not the mrrokesh_app role. Superusers bypass row-level security.',
    );
  }
  await store.seedPlans();
}

const token = process.env.STALWART_ADMIN_TOKEN ?? '';
const mail =
  process.env.MAIL_PLANE === 'http' && token.length > 0 && !token.includes('CHANGE_ME')
    ? new HttpStalwartPlane(process.env.STALWART_API_URL ?? 'http://127.0.0.1:8080', token)
    : new MockMailPlane();

const app = buildServer({
  config,
  store,
  mail,
  dns: new LiveDns(),
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
