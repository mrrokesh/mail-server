import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BCRYPT_COST } from './crypto/password';
import { decodeAesKey } from './crypto/aes';

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface AppConfig {
  nodeEnv: string;
  passwordPepper: string;
  pepperVersion: number;
  peppers: Record<number, string>;
  jwtSecret: string;
  dataEncryptionKey: Buffer;
  accessTtlSec: number;
  refreshTtlSec: number;
  bcryptCost: number;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  supplierStateCode: string;
  mxHost: string;
  spfInclude: string;
  dmarcRua: string;
  tlsRptRua: string;
  webauthnRpId: string;
  webauthnRpName: string;
  webauthnOrigin: string;
  webOrigin: string;
  rateLimits: {
    login: RateLimitRule;
    signup: RateLimitRule;
    passwordReset: RateLimitRule;
    dns: RateLimitRule;
  };
}

export function loadEnvFile(): void {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return;
  }
}

function requiredSecret(name: string, min: number): string {
  const value = process.env[name]?.trim() ?? '';
  if (value.length < min || value.includes('CHANGE_ME')) {
    throw new Error(
      `${name} must be set to ${min}+ random characters and must not contain CHANGE_ME`,
    );
  }
  return value;
}

export function loadConfig(): AppConfig {
  const passwordPepper = requiredSecret('PASSWORD_PEPPER', 32);
  const jwtSecret = requiredSecret('JWT_ACCESS_SECRET', 32);
  const dataKeyMaterial = requiredSecret('DATA_ENCRYPTION_KEY_V1', 32);
  if (passwordPepper === jwtSecret || passwordPepper === dataKeyMaterial) {
    throw new Error('PASSWORD_PEPPER, JWT_ACCESS_SECRET, and DATA_ENCRYPTION_KEY_V1 must differ');
  }
  const pepperVersion = Number(process.env.PASSWORD_PEPPER_ACTIVE_VERSION ?? 1);
  const peppers: Record<number, string> = { [pepperVersion]: passwordPepper };
  if (process.env.PASSWORD_PEPPER_V1 && !process.env.PASSWORD_PEPPER_V1.includes('CHANGE_ME')) {
    peppers[1] = process.env.PASSWORD_PEPPER_V1;
  }
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production' && pepperVersion !== 1 && !peppers[1]) {
    throw new Error('Keep PASSWORD_PEPPER_V1 until every user has signed in on the new pepper');
  }
  return {
    nodeEnv,
    passwordPepper,
    pepperVersion,
    peppers,
    jwtSecret,
    dataEncryptionKey: decodeAesKey(dataKeyMaterial),
    accessTtlSec: 15 * 60,
    refreshTtlSec: 30 * 24 * 60 * 60,
    bcryptCost: BCRYPT_COST,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    supplierStateCode: process.env.SUPPLIER_STATE_CODE ?? '29',
    mxHost: process.env.MX_HOST ?? 'mx1.rokeshcloud.com',
    spfInclude: process.env.SPF_INCLUDE ?? 'spf.rokeshcloud.com',
    dmarcRua: process.env.DMARC_RUA ?? 'dmarc@rokeshcloud.com',
    tlsRptRua: process.env.TLSRPT_RUA ?? 'tlsrpt@rokeshcloud.com',
    webauthnRpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
    webauthnRpName: 'MR Rokesh Mail',
    webauthnOrigin: process.env.WEB_URL ?? 'http://127.0.0.1:5173',
    webOrigin: process.env.WEB_URL ?? 'http://127.0.0.1:5173',
    rateLimits: {
      login: { limit: 10, windowMs: 60_000 },
      signup: { limit: 20, windowMs: 60_000 },
      passwordReset: { limit: 5, windowMs: 60_000 },
      dns: { limit: 30, windowMs: 60_000 },
    },
  };
}

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const pepper = 'test-pepper-value-must-be-32-characters-min';
  return {
    nodeEnv: 'test',
    passwordPepper: pepper,
    pepperVersion: 1,
    peppers: { 1: pepper },
    jwtSecret: 'test-jwt-secret-value-must-be-32-characters',
    dataEncryptionKey: Buffer.alloc(32, 7),
    accessTtlSec: 15 * 60,
    refreshTtlSec: 30 * 24 * 60 * 60,
    bcryptCost: 4,
    razorpayKeyId: 'rzp_test_local',
    razorpayKeySecret: 'razorpay-secret-test',
    razorpayWebhookSecret: 'whsec_test_local',
    supplierStateCode: '29',
    mxHost: 'mx1.rokeshcloud.com',
    spfInclude: 'spf.rokeshcloud.com',
    dmarcRua: 'dmarc@rokeshcloud.com',
    tlsRptRua: 'tlsrpt@rokeshcloud.com',
    webauthnRpId: 'localhost',
    webauthnRpName: 'MR Rokesh Mail',
    webauthnOrigin: 'http://127.0.0.1:5173',
    webOrigin: 'http://127.0.0.1:5173',
    rateLimits: {
      login: { limit: 1000, windowMs: 60_000 },
      signup: { limit: 1000, windowMs: 60_000 },
      passwordReset: { limit: 1000, windowMs: 60_000 },
      dns: { limit: 1000, windowMs: 60_000 },
    },
    ...overrides,
  };
}
