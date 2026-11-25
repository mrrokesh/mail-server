import crypto from 'node:crypto';

export function encryptString(key: Buffer, plaintext: string): { ciphertext: Buffer; iv: Buffer } {
  if (key.length !== 32) {
    throw new Error('AES-256-GCM key must be 32 bytes');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { ciphertext, iv };
}

export function decryptString(key: Buffer, ciphertext: Buffer, iv: Buffer): string {
  if (key.length !== 32) {
    throw new Error('AES-256-GCM key must be 32 bytes');
  }
  if (ciphertext.length < 16) {
    throw new Error('Ciphertext is too short');
  }
  const tag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function decodeAesKey(material: string): Buffer {
  const decoded = Buffer.from(material, 'base64');
  if (decoded.length === 32) return decoded;
  if (Buffer.byteLength(material) === 32) return Buffer.from(material);
  throw new Error('DATA_ENCRYPTION_KEY_V1 must be 32 bytes (openssl rand -base64 32)');
}
