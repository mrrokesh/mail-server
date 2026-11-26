import { ERROR_CODES } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/ui/icon';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { MOCK_DOMAINS } from '../../lib/mock-data';
import { parseChecks, parseDomains, type MailDomain } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

export function DnsWizardPage() {
  const { domainId } = useParams();
  const queryClient = useQueryClient();
  const domains = useQuery({
    queryKey: ['domains'],
    queryFn: () => readOrFallback('/domains', parseDomains, MOCK_DOMAINS),
    staleTime: 5 * 60 * 1000,
  });
  const domain = (domains.data ?? []).find((item) => item.id === domainId) ?? null;
  useDocumentTitle(domain ? domain.name : 'DNS wizard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [pane, setPane] = useState<'list' | 'read'>('list');
  const selected =
    domain?.checks.find((check) => check.id === selectedId) ?? domain?.checks[0] ?? null;

  async function onCheck() {
    if (!domain) return;
    setPending(true);
    setNote('');
    try {
      const result = await writeOrFallback(
        `/domains/${domain.id}/verify`,
        { method: 'POST' },
        parseChecks,
        () => domain.checks,
      );
      queryClient.setQueryData<MailDomain[]>(['domains'], (current = []) =>
        current.map((item) => (item.id === domain.id ? { ...item, checks: result.data } : item)),
      );
      const failed = result.data.find((check) => check.status === 'fail');
      setNote(
        failed
          ? 'Checked just now. A record still needs a fix.'
          : 'Checked just now. All records are in place.',
      );
    } catch (error) {
      const code = error instanceof ApiProblem ? error.code : 'API-SRV-500';
      setNote(ERROR_CODES[code].message || ERROR_CODES[code].meaning);
    } finally {
      setPending(false);
    }
  }

  async function onCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNote('Copy is blocked in this browser. Select the value and copy it.');
    }
  }

  if (domains.isPending) {
    return (
      <div className="read">
        <SkeletonLines count={3} />
      </div>
    );
  }

  if (!domain || !selected) {
    return (
      <div className="read">
        <h1 className="h1">We could not find that</h1>
        <p>
          {ERROR_CODES['API-RES-404'].message} <span className="caption">API-RES-404</span>
        </p>
        <Link className="btn btn-text" to="/admin/domains">
          Back to domains
        </Link>
      </div>
    );
  }

  const spec = selected.code ? ERROR_CODES[selected.code] : null;

  return (
    <div className="panes" data-pane={pane}>
      <section className="pane pane-nav">
        <div className="read">
          <Link className="btn btn-text" to="/admin/domains">
            Back to domains
          </Link>
          <p className="muted">Publish each record, then run the check.</p>
        </div>
      </section>
      <section className="pane pane-list" aria-label="DNS records">
        <div className="pane-head">
          <h1 className="h3 break">{domain.name}</h1>
          <button type="button" className="btn btn-primary" onClick={onCheck} disabled={pending}>
            {pending ? 'Checking records' : 'Check records'}
          </button>
        </div>
        {note ? <p className="caption pane-note">{note}</p> : null}
        {domain.checks.map((check) => (
          <button
            key={check.id}
            type="button"
            className="domain-row"
            aria-selected={check.id === selected.id}
            onClick={() => {
              setSelectedId(check.id);
              setCopied(false);
              setPane('read');
            }}
          >
            <span>{check.label}</span>
            <span className={`caption status-${check.status}`}>
              {check.status === 'ready'
                ? 'Ready'
                : check.status === 'fail'
                  ? 'Needs a record'
                  : 'Waiting'}
            </span>
          </button>
        ))}
      </section>
      <article className="pane pane-read">
        <div className="read">
          <button
            type="button"
            className="btn btn-text mobile-only"
            onClick={() => setPane('list')}
          >
            Back to records
          </button>
          <h2 className="h3">{selected.label}</h2>
          <p className={`caption status-${selected.status}`}>
            {selected.status === 'ready'
              ? 'Ready'
              : selected.status === 'fail'
                ? 'Needs a record'
                : 'Waiting'}
          </p>
          <dl className="stack">
            <div>
              <dt className="caption muted">Type</dt>
              <dd>{selected.type}</dd>
            </div>
            <div>
              <dt className="caption muted">Host</dt>
              <dd className="break">{selected.host}</dd>
            </div>
            <div className="record-line">
              <div>
                <dt className="caption muted">Value</dt>
                <dd className="break">{selected.value}</dd>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={copied ? 'Copied record value' : 'Copy record value'}
                onClick={() => void onCopy(selected.value)}
              >
                <Icon icon={copied ? Check : Copy} />
              </button>
            </div>
          </dl>
          {spec ? (
            <p className="field-error">
              {spec.message || spec.meaning} <span>{selected.code}</span>
              {spec.action ? <span className="muted"> {spec.action}</span> : null}
            </p>
          ) : (
            <p className="muted">This record matches what we expect.</p>
          )}
        </div>
      </article>
    </div>
  );
}
