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
        <div style={{ flex: 1, minWidth: 240 }}>
          <QuotaMeter
            label="Domain readiness"
            usedLabel={`${readyCount} of ${domain.checks.length} records verified`}
            percent={pct}
          />
        </div>
        {note ? <span className="caption muted">{note}</span> : null}
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Type</th>
              <th>Host / Name</th>
              <th>Expected Value</th>
              <th>Copy</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {domain.checks.map((check) => (
              <tr
                key={check.id}
                onClick={() => setSelectedId(check.id)}
                style={{ cursor: 'pointer' }}
              >
                <td className="strong">{check.label}</td>
                <td className="mono">{check.type}</td>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                  {check.host}
                </td>
                <td className="mono break" style={{ maxWidth: 340 }}>
                  {check.value.length > 72 && selected.id !== check.id
                    ? `${check.value.slice(0, 68)}...`
                    : check.value}
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    aria-label={`Copy ${check.label} value`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onCopy(check.id, check.value);
                    }}
                  >
                    <Icon icon={copiedId === check.id ? Check : Copy} size={15} />
                  </button>
                </td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card stack-3">
        <div className="spread">
          <h2 className="h3">{selected.label} details</h2>
          <Badge tone={selected.status === 'ready' ? 'success' : 'warning'}>
            {selected.type} · {selected.host}
          </Badge>
        </div>
        <p className="mono break">{selected.value}</p>
        {spec ? (
          <p className="field-error">
            {spec.message || spec.meaning} <span className="mono">{selected.code}</span>
            {spec.action ? <span className="muted"> — {spec.action}</span> : null}
          </p>
        ) : (
          <p className="caption status-ready">This record matches expected DNS authentication.</p>
        )}
      </div>
    </div>
  );
}
