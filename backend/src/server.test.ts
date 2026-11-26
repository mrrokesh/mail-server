import assert from 'node:assert/strict';
import test from 'node:test';
import { testConfig } from './config';
import { buildServer } from './server';

test('health endpoints return ok', async () => {
  const app = buildServer({ logger: false, config: testConfig() });
  const root = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(root.statusCode, 200);
  assert.deepEqual(root.json(), { status: 'ok' });

  const api = await app.inject({ method: 'GET', url: '/api/v1/health' });
  assert.equal(api.statusCode, 200);
  assert.deepEqual(api.json(), { status: 'ok', service: 'mrrokesh-mail-api' });
  await app.close();
});

test('unknown routes use API-RES-404 and hide stack traces', async () => {
  const app = buildServer({ logger: false, config: testConfig() });
  const response = await app.inject({ method: 'GET', url: '/api/v1/missing' });
  assert.equal(response.statusCode, 404);
  const body = response.json() as { code: string; message: string; stack?: string };
  assert.equal(body.code, 'API-RES-404');
  assert.equal(body.message, "We couldn't find that.");
  assert.equal(body.stack, undefined);
  await app.close();
});
