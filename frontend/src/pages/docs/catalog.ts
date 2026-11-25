type DocModule = Record<string, string>;

const modules = import.meta.glob('../../../../docs/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as DocModule;

export interface DocPage {
  slug: string;
  title: string;
  dir: string;
  markdown: string;
}

const ORDER = [
  '',
  'getting-started',
  'what-you-can-do',
  'how-to',
  'roles-and-permissions',
  'error-codes',
  'faq',
  'whats-new',
  'limits',
  'dns-setup',
  'client-setup',
  'deliverability',
  'migration',
  'local-dev',
  'screens-and-apis',
];

function toPage(path: string, markdown: string): DocPage {
  const normalized = path.replace(/\\/g, '/');
  const relative = normalized.split('/docs/')[1] ?? '';
  const withoutExt = relative.replace(/\.md$/, '');
  const slash = withoutExt.lastIndexOf('/');
  const dir = slash >= 0 ? withoutExt.slice(0, slash) : '';
  let slug = withoutExt;
  if (slug === 'README') slug = '';
  if (slug.endsWith('/README')) slug = slug.slice(0, -'/README'.length);
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim();
  return { slug, title: heading || 'Docs', dir, markdown };
}

export const DOC_PAGES: DocPage[] = Object.entries(modules)
  .map(([path, markdown]) => toPage(path, markdown))
  .sort((a, b) => {
    const ai = ORDER.indexOf(a.slug);
    const bi = ORDER.indexOf(b.slug);
    return (ai === -1 ? ORDER.length : ai) - (bi === -1 ? ORDER.length : bi);
  });

export function findDoc(slug: string): DocPage | undefined {
  const normalized = slug
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\.md$/, '')
    .replace(/\/README$/, '')
    .replace(/^README$/, '');
  return DOC_PAGES.find((page) => page.slug === normalized);
}

export function resolveDocHref(dir: string, href: string): string | null {
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const path = (hashAt >= 0 ? href.slice(0, hashAt) : href).trim();
  if (!path) return hash || null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null;
  if (!path.endsWith('.md')) return null;
  const segments = dir ? dir.split('/').filter(Boolean) : [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  let slug = segments.join('/').replace(/\.md$/, '');
  if (slug.endsWith('/README')) slug = slug.slice(0, -'/README'.length);
  if (slug === 'README') slug = '';
  return slug ? `/docs/${slug}${hash}` : `/docs${hash}`;
}

export function headingSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
