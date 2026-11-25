import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as schema from './db/schema';

const sql = readFileSync(
  new URL('./db/migrations/0001_initial_schema.sql', import.meta.url),
  'utf8',
);

test('migration uses project tiers and forces row level security', () => {
  assert.match(sql, /'free', 'starter', 'business', 'business_plus', 'enterprise'/);
  assert.equal(sql.includes('business_pro'), false);
  assert.equal(sql.includes('enterprise_sovereign'), false);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /mrrokesh_app NOSUPERUSER NOBYPASSRLS/);
  assert.match(sql, /app_lookup_user_by_email/);
  assert.ok(schema.organizations);
  assert.ok(schema.users);
  assert.ok(schema.auditLogs);
  assert.ok(schema.subscriptionPlans);
  assert.deepEqual(schema.PLAN_TIER_VALUES, [
    'free',
    'starter',
    'business',
    'business_plus',
    'enterprise',
  ]);
});
