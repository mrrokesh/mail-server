import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { ERROR_CODES } from '@mrrokesh/shared';
import { DOC_PAGES, findDoc, headingSlug, resolveDocHref } from './catalog';
import { useDocumentTitle } from '../../lib/use-document-title';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const element = node as { props?: { children?: ReactNode } };
    return textOf(element.props?.children);
  }
  return '';
}

export function DocsPage() {
  const params = useParams();
  const slug = params['*'] ?? '';
  const page = findDoc(slug);
  const [query, setQuery] = useState('');
  useDocumentTitle(page?.title ?? 'Docs');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return DOC_PAGES;
    return DOC_PAGES.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(needle) || entry.markdown.toLowerCase().includes(needle)
      );
    });
  }, [query]);

  const components = useMemo<Components>(() => {
    const dir = page?.dir ?? '';
    return {
      h1: ({ children }) => <h1 className="h1">{children}</h1>,
      h2: ({ children }) => (
        <h2 className="h2" id={headingSlug(textOf(children))}>
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="prose-h3" id={headingSlug(textOf(children))}>
          {children}
        </h3>
      ),
      a: ({ href, children }) => {
        const local = href ? resolveDocHref(dir, href) : null;
        if (local?.startsWith('/')) return <Link to={local}>{children}</Link>;
        if (local?.startsWith('#')) return <a href={local}>{children}</a>;
        return (
          <a href={href} rel="noreferrer">
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        <div className="table-scroll">
          <table>{children}</table>
        </div>
      ),
    };
  }, [page?.dir]);

  return (
    <div className="docs-layout">
      <aside className="docs-nav">
        <label className="visually-hidden" htmlFor="docs-search">
          Search docs
        </label>
        <input
          id="docs-search"
          className="input"
          type="search"
          value={query}
          placeholder="Search docs"
          onChange={(event) => setQuery(event.target.value)}
        />
        <nav aria-label="Documentation">
          {visible.map((entry) => (
            <Link
              key={entry.slug || 'index'}
              to={entry.slug ? `/docs/${entry.slug}` : '/docs'}
              aria-current={entry.slug === (page?.slug ?? '') ? 'page' : undefined}
            >
              {entry.title}
            </Link>
          ))}
        </nav>
      </aside>
      {page ? (
        <article className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {page.markdown}
          </ReactMarkdown>
        </article>
      ) : (
        <article className="prose">
          <h1 className="h1">We could not find that</h1>
          <p>
            {ERROR_CODES['API-RES-404'].message} <span className="caption">API-RES-404</span>
          </p>
          <p>{ERROR_CODES['API-RES-404'].action}</p>
          <Link to="/docs">Back to docs</Link>
        </article>
      )}
    </div>
  );
}
