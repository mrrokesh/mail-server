import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as schema from './db/schema';

const sql = readFileSync(
  new URL('./db/migrations/0001_initial_schema.sql', import.meta.url),
  'utf8',
);
const v2 = readFileSync(new URL('./db/migrations/0002_v2_modules.sql', import.meta.url), 'utf8');

test('migration uses project tiers and forces row level security', () => {
  assert.match(sql, /'free', 'starter', 'business', 'business_plus', 'enterprise'/);
  assert.equal(sql.includes('business_pro'), false);
  assert.equal(sql.includes('enterprise_sovereign'), false);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /mrrokesh_app NOSUPERUSER NOBYPASSRLS/);
  assert.match(sql, /insufficient_privilege/);
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

test('v2 migration persists chat and the critical module tables', () => {
  assert.match(v2, /CREATE TABLE IF NOT EXISTS drive_files/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS tasks/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS notes/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS booking_pages/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS chat_conversations/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS masked_aliases/);
  assert.match(v2, /CREATE TABLE IF NOT EXISTS campaigns/);
  assert.match(v2, /FORCE ROW LEVEL SECURITY/);
  assert.match(v2, /mrrokesh-chat/);
  assert.equal(v2.toLowerCase().includes('mattermost'), false);
  assert.equal(v2.toLowerCase().includes('rocket.chat'), false);
  assert.ok(schema.driveFiles);
  assert.ok(schema.tasks);
  assert.ok(schema.notes);
  assert.ok(schema.bookingPages);
  assert.ok(schema.chatConversations);
});
