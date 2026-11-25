import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ERROR_CODES, isErrorCode, toApiError } from './codes';

const REQUIRED_CODES = [
  'API-AUTH-001',
  'API-AUTH-002',
  'API-AUTH-003',
  'API-VAL-001',
  'API-RES-404',
  'API-RATE-429',
  'API-SRV-500',
  'API-SRV-503',
  'API-MAIL-001',
  'API-DNS-001',
  'API-BILL-001',
  'API-QUOTA-001',
  'API-MIG-001',
  'API-SEC-001',
  'API-TEN-001',
  'API-CAL-001',
  'API-DRV-001',
  'WEB-NET-001',
  'WEB-NET-002',
  'WEB-BRW-001',
  'WEB-STO-001',
  'WEB-UPL-001',
  'WEB-RND-001',
  'WEB-MAIL-001',
  'AND-NET-001',
  'AND-PERM-001',
  'AND-PERM-002',
  'AND-PERM-003',
  'AND-PLAY-001',
  'AND-VER-001',
  'AND-BIO-001',
  'AND-STO-001',
  'AND-MAIL-001',
  'IOS-NET-001',
  'IOS-PERM-001',
  'IOS-PERM-002',
  'IOS-PERM-003',
  'IOS-ATT-001',
  'IOS-BIO-001',
  'IOS-VER-001',
  'IOS-IAP-001',
  'IOS-MAIL-001',
] as const;

test('every registry key matches its code and has a meaning and action', () => {
  const seen = new Set<string>();
  for (const [key, definition] of Object.entries(ERROR_CODES)) {
    assert.equal(key, definition.code);
    assert.equal(seen.has(definition.code), false);
    seen.add(definition.code);
    assert.ok(definition.meaning.length > 0);
    assert.ok(definition.action.length > 0);
    assert.match(definition.code, /^(API|WEB|AND|IOS)-[A-Z]+-\d{3}$/);
  }
});

test('playbook and product codes from the brief are present', () => {
  for (const code of REQUIRED_CODES) {
    assert.equal(isErrorCode(code), true);
  }
});

test('API-MAIL-001 keeps the brief meaning (message size, not mailbox quota)', () => {
  assert.equal(ERROR_CODES['API-MAIL-001'].http, 413);
  assert.match(ERROR_CODES['API-MAIL-001'].meaning, /plan limit/i);
});

test('toApiError returns code, message, and optional details', () => {
  const body = toApiError('API-AUTH-001');
  assert.deepEqual(body, {
    code: 'API-AUTH-001',
    message: 'Email or password is incorrect.',
  });
  const withDetails = toApiError('API-VAL-001', { fields: ['email'] });
  assert.deepEqual(withDetails.details, { fields: ['email'] });
});

test('docs/error-codes.md lists every code', () => {
  const docPath = new URL('../../../../docs/error-codes.md', import.meta.url);
  const doc = readFileSync(docPath, 'utf8');
  for (const code of Object.keys(ERROR_CODES)) {
    assert.ok(doc.includes(code), `missing ${code} from docs/error-codes.md`);
  }
});
