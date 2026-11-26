export function refreshCookie(token: string, maxAgeSec: number, secure: boolean): string {
  const parts = [
    `mr_refresh=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/api/v1/auth',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearRefreshCookie(secure: boolean): string {
  return refreshCookie('', 0, secure);
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}
