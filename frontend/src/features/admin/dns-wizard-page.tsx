import { ERROR_CODES, type ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCircle2, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/ui/icon';
import { Badge, QuotaMeter } from '../../components/ui/primitives';
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
    staleTime: 60 * 1000,
  });
  const domain = (domains.data ?? []).find((item) => item.id === domainId) ?? null;
  useDocumentTitle(domain ? `${domain.name} · DNS Wizard` : 'DNS Wizard');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'list' | 'read'>('list');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

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
          ? 'DNS check completed. Publish the remaining records highlighted below.'
          : 'All DNS checks passed. This domain is ready for outbound and inbound mail.',
      );
    } catch (error) {
      const code = error instanceof ApiProblem ? error.code : 'API-SRV-500';
      setNote(ERROR_CODES[code].message || ERROR_CODES[code].meaning);
    } finally {
      setPending(false);
    }
  }

  async function onCopy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setNote('Clipboard copy was blocked by the browser. Select the value manually.');
    }
  }

  if (domains.isPending) {
    return (
      <div className="page-wrap">
        <SkeletonLines count={4} />
      </div>
    );
  }

  if (!domain || !selected) {
    return (
      <div className="page-wrap">
        <h1 className="h2">Domain not found</h1>
        <p className="muted">
          {ERROR_CODES['API-RES-404'].message} <span className="mono">API-RES-404</span>
        </p>
        <div>
          <Link className="btn btn-quiet" to="/admin/domains">
            Back to domains
          </Link>
        </div>
      </div>
    );
  }

  const readyCount = domain.checks.filter((c) => c.status === 'ready').length;
  const pct = (readyCount / Math.max(1, domain.checks.length)) * 100;
  const spec = selected.code ? ERROR_CODES[selected.code as ErrorCode] : null;

  return (
    <div className="page-wrap">
      <div className="spread">
        <div className="stack-2">
          <Link className="caption muted cluster-2" to="/admin/domains">
            <Icon icon={ArrowLeft} size={14} />
            <span>Back to domains</span>
          </Link>
          <h1 className="h2 break">{domain.name}</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={onCheck} disabled={pending}>
          <Icon icon={RefreshCw} size={16} />
          <span>{pending ? 'Checking DNS...' : 'Verify DNS records'}</span>
        </button>
      </div>

      <div className="card spread">
        <div style={{ flex: 1, minWidth: 220 }}>
          <QuotaMeter
            label="Domain readiness"
            usedLabel={`${readyCount} of ${domain.checks.length} records verified`}
            percent={pct}
          />
        </div>
        {note ? <span className="caption muted">{note}</span> : null}
      </div>

      <div className="card-bg" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="panes-two" data-pane={pane} style={{ minHeight: 380 }}>
          <section className="pane pane-list" aria-label="DNS records">
            <div className="pane-head pane-head-inline">
              <h2 className="h3">DNS records ({domain.checks.length})</h2>
              <span className="caption muted">{readyCount} verified</span>
            </div>
            {domain.checks.map((check) => (
              <button
                key={check.id}
                type="button"
                className="domain-row"
                aria-selected={check.id === selected.id}
                onClick={() => {
                  setSelectedId(check.id);
                  setPane('read');
                }}
              >
                <div className="stack-1" style={{ minWidth: 0 }}>
                  <span className="strong">{check.label}</span>
                  <span className="caption mono muted truncate">
                    {check.type} · {check.host}
                  </span>
                </div>
                <Badge
                  tone={
                    check.status === 'ready'
                      ? 'success'
                      : check.status === 'fail'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {check.status === 'ready' ? (
                    <>
                      <Icon icon={CheckCircle2} size={12} />
                      <span>Ready</span>
                    </>
                  ) : check.status === 'fail' ? (
                    <>
                      <Icon icon={ShieldAlert} size={12} />
                      <span>Needs record</span>
                    </>
                  ) : (
                    'Waiting'
                  )}
                </Badge>
              </button>
            ))}
          </section>

          <article className="pane pane-read" aria-label="Selected DNS record details">
            <div className="read">
              <button
                type="button"
                className="btn btn-text mobile-only"
                style={{ justifyContent: 'flex-start', paddingInline: 0 }}
                onClick={() => setPane('list')}
              >
                <Icon icon={ArrowLeft} size={15} />
                <span>Back to records</span>
              </button>

              <div className="spread">
                <div className="stack-1">
                  <h2 className="h3">{selected.label}</h2>
                  <span className="caption mono muted">{selected.type} record</span>
                </div>
                <Badge
                  tone={
                    selected.status === 'ready'
                      ? 'success'
                      : selected.status === 'fail'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {selected.status === 'ready'
                    ? 'Ready'
                    : selected.status === 'fail'
                      ? 'Needs record'
                      : 'Waiting'}
                </Badge>
              </div>

              <div className="card stack-3">
                <div className="stack-1">
                  <span className="caption muted">Host / Name</span>
                  <div className="spread" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <code className="mono break" style={{ flex: 1, minWidth: 0 }}>
                      {selected.host}
                    </code>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      style={{ flexShrink: 0 }}
                      aria-label={`Copy ${selected.label} host`}
                      onClick={() => void onCopy(`${selected.id}-host`, selected.host)}
                    >
                      <Icon icon={copiedId === `${selected.id}-host` ? Check : Copy} size={15} />
                    </button>
                  </div>
                </div>

                <div
                  className="stack-1"
                  style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}
                >
                  <span className="caption muted">Expected Value</span>
                  <div className="spread" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <code className="mono break" style={{ flex: 1, minWidth: 0 }}>
                      {selected.value}
                    </code>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      style={{ flexShrink: 0 }}
                      aria-label={`Copy ${selected.label} value`}
                      onClick={() => void onCopy(selected.id, selected.value)}
                    >
                      <Icon icon={copiedId === selected.id ? Check : Copy} size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {spec ? (
                <p className="field-error">
                  {spec.message || spec.meaning} <span className="mono">{selected.code}</span>
                  {spec.action ? <span className="muted"> — {spec.action}</span> : null}
                </p>
              ) : (
                <p className="caption status-ready">
                  This record matches expected DNS authentication.
                </p>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
