import crypto from 'node:crypto';

export function razorpaySignature(secret: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyRazorpaySignature(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = Buffer.from(razorpaySignature(secret, rawBody));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
