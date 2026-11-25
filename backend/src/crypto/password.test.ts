import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptString, encryptString } from './aes';
import { BCRYPT_COST, hashPassword, needsRehash, verifyPassword } from './password';
import { generateTotpSecret, totpCode, verifyTotp } from './totp';

const pepper = 'unit-test-pepper-value-32-characters';

test('password pepper and bcrypt round-trip', async () => {
  const hash = await hashPassword('correct horse', pepper, 4);
  assert.equal(await verifyPassword('correct horse', hash, pepper), true);
  assert.equal(await verifyPassword('wrong horse', hash, pepper), false);
  assert.equal(needsRehash(hash, BCRYPT_COST), true);
});

test('production cost is bcrypt 12', async () => {
  const hash = await hashPassword('correct horse', pepper, BCRYPT_COST);
  assert.ok(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$'));
  assert.equal(needsRehash(hash, BCRYPT_COST), false);
});

test('aes-gcm round-trip rejects a different key', () => {
  const key = Buffer.alloc(32, 3);
  const encrypted = encryptString(key, 'totp-seed');
  assert.equal(decryptString(key, encrypted.ciphertext, encrypted.iv), 'totp-seed');
  const other = Buffer.alloc(32, 4);
  assert.throws(() => decryptString(other, encrypted.ciphertext, encrypted.iv));
});

test('totp accepts the current code only', () => {
  const now = new Date('2026-11-26T00:00:00Z');
  const secret = generateTotpSecret();
  const code = totpCode(secret, now);
  assert.equal(verifyTotp(secret, code, now), true);
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal(verifyTotp(secret, wrong, now), false);
});
