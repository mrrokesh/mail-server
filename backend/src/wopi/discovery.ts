const cache = new Map<string, { at: number; xml: string }>();

function actionUrl(xml: string, extension: string): string | null {
  const ext = extension.replace(/^\./, '');
  const patterns = [
    new RegExp(`<action\\b[^>]*\\bext="${ext}"[^>]*\\bname="edit"[^>]*\\burlsrc="([^"]+)"`, 'i'),
    new RegExp(`<action\\b[^>]*\\bname="edit"[^>]*\\bext="${ext}"[^>]*\\burlsrc="([^"]+)"`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function publicEditorUrl(urlsrc: string, collaboraUrl: string): string {
  const source = new URL(urlsrc);
  const published = new URL(collaboraUrl);
  source.protocol = published.protocol;
  source.host = published.host;
  return source.toString();
}

export async function collaboraFrameUrl(input: {
  collaboraUrl: string;
  wopiSrc: string;
  accessToken: string;
  accessTokenTtl: number;
  extension: string;
}): Promise<string> {
  const base = input.collaboraUrl.replace(/\/$/, '');
  const now = Date.now();
  const cached = cache.get(base);
  let xml = cached && now - cached.at < 60_000 ? cached.xml : '';
  if (!xml) {
    const response = await fetch(`${base}/hosting/discovery`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('discovery');
    xml = await response.text();
    cache.set(base, { at: now, xml });
  }
  const urlsrc = actionUrl(xml, input.extension);
  if (!urlsrc) throw new Error('discovery-action');
  const editor = publicEditorUrl(urlsrc, base);
  const joiner =
    editor.endsWith('?') || editor.endsWith('&') ? '' : editor.includes('?') ? '&' : '?';
  const params = new URLSearchParams({
    WOPISrc: input.wopiSrc,
    access_token: input.accessToken,
    access_token_ttl: String(input.accessTokenTtl),
  });
  return `${editor}${joiner}${params.toString()}`;
}
