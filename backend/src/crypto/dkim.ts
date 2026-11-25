import crypto from 'node:crypto';

export function generateDkimKey(now: Date): {
  selector: string;
  publicKeyDns: string;
  privateKeyPem: string;
  rotateAfter: Date;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const der = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
  const selector = `mrrokesh${now.getUTCFullYear()}`;
  return {
    selector,
    publicKeyDns: `v=DKIM1; k=rsa; p=${der.toString('base64')}`,
    privateKeyPem: privateKey,
    rotateAfter: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
  };
}
