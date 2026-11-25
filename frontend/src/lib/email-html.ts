const ALLOWED = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'img',
]);
const DROP = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'svg',
  'math',
]);

export function sanitizeEmailHtml(
  unsafe: string,
  allowImages: boolean,
): { html: string; blockedImages: number } {
  const doc = new DOMParser().parseFromString(unsafe, 'text/html');
  const stats = { blockedImages: 0 };
  clean(doc.body, allowImages, stats);
  return { html: doc.body.innerHTML, blockedImages: stats.blockedImages };
}

function clean(node: ParentNode, allowImages: boolean, stats: { blockedImages: number }) {
  let index = 0;
  while (index < node.childNodes.length) {
    const kid = node.childNodes.item(index);
    if (!kid) break;
    if (kid.nodeType === Node.COMMENT_NODE) {
      kid.remove();
      continue;
    }
    if (kid.nodeType !== Node.ELEMENT_NODE) {
      index += 1;
      continue;
    }
    const element = kid as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (DROP.has(tag) || (tag === 'img' && !allowImages)) {
      if (tag === 'img') stats.blockedImages += 1;
      element.remove();
      continue;
    }
    if (!ALLOWED.has(tag)) {
      while (element.firstChild) node.insertBefore(element.firstChild, element);
      element.remove();
      continue;
    }
    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      const keepLink = tag === 'a' && name === 'href' && /^(https?:|mailto:)/i.test(value);
      const keepSrc = tag === 'img' && name === 'src' && /^https?:/i.test(value);
      const keepAlt = tag === 'img' && name === 'alt';
      if (!keepLink && !keepSrc && !keepAlt) element.removeAttribute(attr.name);
    }
    if (tag === 'a') {
      element.setAttribute('rel', 'noreferrer noopener');
      element.setAttribute('target', '_blank');
    }
    clean(element, allowImages, stats);
    index += 1;
  }
}

export function textToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n{2,}/).filter((part) => part.length > 0);
  if (paragraphs.length === 0) return '<p></p>';
  return paragraphs.map((part) => `<p>${part.replace(/\n/g, '<br>')}</p>`).join('');
}

export function frameDocument(bodyHtml: string, theme: 'light' | 'dark'): string {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const css = [
    'html,body{margin:0;background:transparent;}',
    `body{font-family:${read('--font-body')};font-size:${read('--font-size-body')};line-height:${read('--line-height-body')};color:${read('--color-text-primary')};}`,
    `a{color:${read('--color-brand')};}`,
    `p{margin:0 0 ${read('--space-4')};}`,
    'p:last-child{margin-bottom:0;}',
  ].join('');
  return `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`;
}
