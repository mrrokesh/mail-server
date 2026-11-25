import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

/** Playbook cost. Production config refuses any other value. */
export const BCRYPT_COST = 12;

export function pepperDigest(password: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(password.normalize('NFKC')).digest('base64');
}

export function passwordPolicyError(password: string): string | null {
  const normalized = password.normalize('NFKC');
  if (normalized.length < 8 || normalized.length > 128) {
    return 'Use 8 to 128 characters.';
  }
  return null;
}

export async function hashPassword(
  password: string,
  pepper: string,
  cost = BCRYPT_COST,
): Promise<string> {
  return bcrypt.hash(pepperDigest(password, pepper), cost);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  pepper: string,
): Promise<boolean> {
  return bcrypt.compare(pepperDigest(password, pepper), passwordHash);
}

export function needsRehash(passwordHash: string, cost = BCRYPT_COST): boolean {
  return bcrypt.getRounds(passwordHash) < cost;
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
