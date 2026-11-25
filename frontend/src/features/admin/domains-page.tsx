import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { freshDomain, MOCK_DOMAINS } from '../../lib/mock-data';
import { parseDomain, parseDomains, type MailDomain } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/);

function readyCount(domain: MailDomain): string {
  const ready = domain.checks.filter((check) => check.status === 'ready').length;
  return `${ready} of ${domain.checks.length} ready`;
}

export function DomainsPage() {
  useDocumentTitle('Domains');
  const queryClient = useQueryClient();
  const domains = useQuery({
    queryKey: ['domains'],
    queryFn: () => readOrFallback('/domains', parseDomains, MOCK_DOMAINS),
    staleTime: 5 * 60 * 1000,
  });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'folders' | 'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (domains.data ?? []).filter((domain) => domain.name.includes(needle));
  }, [domains.data, query]);
  const selected = visible.find((domain) => domain.id === selectedId) ?? visible[0] ?? null;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const parsed = domainSchema.safeParse(name);
    if (!parsed.success) {
      setCode('API-VAL-001');
      return;
    }
    if ((domains.data ?? []).some((domain) => domain.name === parsed.data)) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    const local = freshDomain(parsed.data);
    try {
      const result = await writeOrFallback(
        '/domains',
        { method: 'POST', body: JSON.stringify({ name: parsed.data }) },
        parseDomain,
        () => local,
      );
      queryClient.setQueryData<MailDomain[]>(['domains'], (current = []) => [
        ...current,
        result.data,
      ]);
      setSelectedId(result.data.id);
      setOpen(false);
      setName('');
      setPane('read');
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panes" data-pane={pane}>
      <h1 className="visually-hidden">Domains</h1>
      <section className="pane pane-nav">
        <div className="pane-head">
          <p className="strong">Workspace</p>
        </div>
        <p className="pane-note muted">
          Connect a domain, then publish the records the wizard shows.
        </p>
      </section>
      <section className="pane pane-list" aria-label="Domains">
        <div className="pane-head">
          <label className="visually-hidden" htmlFor="domain-search">
            Search domains
          </label>
          <input
            id="domain-search"
            className="input"
            type="search"
            placeholder="Search domains"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Add domain
          </button>
        </div>
        {domains.isPending ? <SkeletonLines /> : null}
        {visible.map((domain) => (
          <button
            key={domain.id}
            type="button"
            className="domain-row"
            aria-selected={domain.id === selected?.id}
            onClick={() => {
              setSelectedId(domain.id);
              setPane('read');
            }}
          >
            <span className="break">{domain.name}</span>
            <span
              className={
                domain.checks.every((check) => check.status === 'ready')
                  ? 'caption status-ready'
                  : 'caption status-waiting'
              }
            >
              {readyCount(domain)}
            </span>
          </button>
        ))}
      </section>
      <article className="pane pane-read">
        {selected ? (
          <div className="read">
            <button
              type="button"
              className="btn btn-text mobile-only"
              onClick={() => setPane('list')}
            >
              Back to domains
            </button>
            <h2 className="h3 break">{selected.name}</h2>
            <p>{readyCount(selected)} records.</p>
            <ul className="stack">
              {selected.checks.map((check) => (
                <li key={check.id}>
                  <span className="strong">{check.label}</span>{' '}
                  <span className={`caption status-${check.status}`}>
                    {check.status === 'ready'
                      ? 'Ready'
                      : check.status === 'fail'
                        ? 'Needs a record'
                        : 'Waiting'}
                  </span>
                </li>
              ))}
            </ul>
            <Link className="btn btn-text" to={`/admin/domains/${selected.id}`}>
              Open DNS wizard
            </Link>
          </div>
        ) : (
          <p className="read muted">Add a domain to start the DNS checks.</p>
        )}
      </article>
      <Sheet open={open} title="Add domain" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={onAdd} noValidate>
          <Field
            label="Domain"
            value={name}
            placeholder="studio.example"
            onChange={(event) => setName(event.target.value)}
          />
          {code ? <ErrorNote code={code} detail="Use a domain like studio.example." /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Adding domain' : 'Add domain'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
