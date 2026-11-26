import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Globe, MailPlus, Plus, ShieldCheck } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readOrFallback, writeOrFallback } from '../../lib/api';
import { freshDomain, MOCK_DOMAINS } from '../../lib/mock-data';
import { parseDomain, parseDomains, type MailDomain } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/);

const overviewSchema = z.object({
  seats: z.object({ active: z.number(), total: z.number(), limit: z.number() }),
  domains: z.object({ total: z.number(), verified: z.number(), limit: z.number() }),
  mailboxes: z.object({ total: z.number() }),
  security: z.object({ mfaEnforced: z.boolean(), mfaEnabledCount: z.number() }),
});

function readyCount(domain: MailDomain): number {
  return domain.checks.filter((check) => check.status === 'ready').length;
}

export function DomainsPage() {
  useDocumentTitle('Domains & DNS');
  const queryClient = useQueryClient();
  const domains = useQuery({
    queryKey: ['domains'],
    queryFn: () => readOrFallback('/domains', parseDomains, MOCK_DOMAINS),
    staleTime: 60 * 1000,
  });
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () =>
      readOrFallback(
        '/admin/overview',
        (input) => {
          const parsed = overviewSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
        null,
      ),
  });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<'list' | 'read'>('list');
  const [open, setOpen] = useState(false);
  const [mbxOpen, setMbxOpen] = useState(false);
  const [name, setName] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [mbxKind, setMbxKind] = useState<'user' | 'shared'>('user');
  const [mbxNote, setMbxNote] = useState<string | null>(null);
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
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function onCreateMailbox(event: FormEvent) {
    event.preventDefault();
    if (!selected || !localPart.trim()) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    setCode(null);
    setMbxNote(null);
    try {
      await writeOrFallback(
        '/mailboxes',
        {
          method: 'POST',
          body: JSON.stringify({
            domainId: selected.id,
            localPart: localPart.trim().toLowerCase(),
            kind: mbxKind,
          }),
        },
        (input) => Boolean(input),
        () => false,
      );
      setMbxNote(`Created ${localPart.trim().toLowerCase()}@${selected.name}`);
      setLocalPart('');
      setMbxOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['mailboxes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  const ov = overview.data;

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Domains &amp; DNS</h1>
          <p className="caption muted">
            Verify ownership, configure MX/SPF/DKIM/DMARC/MTA-STS, and provision domain mailboxes.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon icon={Plus} size={17} />
          <span>Add domain</span>
        </button>
      </div>

      {ov ? (
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="caption muted">Active seats</span>
            <span className="kpi-value">
              {ov.seats.active} / {ov.seats.limit === -1 ? '∞' : ov.seats.limit}
            </span>
          </div>
          <div className="kpi-card">
            <span className="caption muted">Verified domains</span>
            <span className="kpi-value">
              {ov.domains.verified} / {ov.domains.total}
            </span>
          </div>
          <div className="kpi-card">
            <span className="caption muted">Provisioned mailboxes</span>
            <span className="kpi-value">{ov.mailboxes.total}</span>
          </div>
          <div className="kpi-card">
            <span className="caption muted">MFA enforcement</span>
            <span className="kpi-value">{ov.security.mfaEnforced ? 'Required' : 'Optional'}</span>
          </div>
        </div>
      ) : null}

      <div className="card-bg" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="panes-two" data-pane={pane} style={{ minHeight: 420 }}>
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
            </div>
            {domains.isPending ? (
              <div className="pane-note">
                <SkeletonLines count={3} />
              </div>
            ) : null}
            {!domains.isPending && visible.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No domains connected"
                description="Add your company domain to generate MX, SPF, DKIM, and DMARC records."
                action={
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setOpen(true)}
                  >
                    Add domain
                  </button>
                }
              />
            ) : null}
            {visible.map((domain) => {
              const ready = readyCount(domain);
              const allReady = ready === domain.checks.length;
              return (
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
                  <span className="cluster-2 truncate">
                    <Icon icon={Globe} size={16} />
                    <span className="strong break">{domain.name}</span>
                  </span>
                  <Badge tone={allReady ? 'success' : 'warning'}>
                    {ready}/{domain.checks.length} ready
                  </Badge>
                </button>
              );
            })}
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
                <div className="spread">
                  <div>
                    <h2 className="h3 break">{selected.name}</h2>
                    <p className="caption muted">
                      {readyCount(selected)} of {selected.checks.length} DNS records verified
                    </p>
                  </div>
                  <div className="cluster-2">
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => {
                        setCode(null);
                        setMbxOpen(true);
                      }}
                    >
                      <Icon icon={MailPlus} size={15} />
                      <span>Create mailbox</span>
                    </button>
                    <Link className="btn btn-primary btn-sm" to={`/admin/domains/${selected.id}`}>
                      <span>Open DNS wizard</span>
                      <Icon icon={ArrowRight} size={15} />
                    </Link>
                  </div>
                </div>
                {mbxNote ? (
                  <div className="privacy-bar">
                    <span className="caption status-ready">{mbxNote}</span>
                  </div>
                ) : null}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Check</th>
                        <th>Type</th>
                        <th>Host</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.checks.map((check) => (
                        <tr key={check.id}>
                          <td className="strong">{check.label}</td>
                          <td className="mono">{check.type}</td>
                          <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                            {check.host}
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
                                'Action needed'
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
              </div>
            ) : (
              <EmptyState
                icon={ShieldCheck}
                title="Select a domain"
                description="Inspect DNS authentication health or add a new domain to start verification."
              />
            )}
          </article>
        </div>
      </div>

      <Sheet open={open} title="Add custom domain" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={(e) => void onAdd(e)} noValidate>
          <Field
            label="Domain name"
            value={name}
            placeholder="northwind.example"
            onChange={(event) => setName(event.target.value)}
          />
          {code ? <ErrorNote code={code} detail="Enter a domain like northwind.example." /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Adding domain...' : 'Add domain'}
          </button>
        </form>
      </Sheet>

      <Sheet
        open={mbxOpen}
        title={selected ? `Create mailbox on ${selected.name}` : 'Create mailbox'}
        onClose={() => setMbxOpen(false)}
      >
        <form className="sheet-form" onSubmit={(e) => void onCreateMailbox(e)} noValidate>
          <Field
            label="Local part (before @)"
            placeholder="ada"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value)}
            required
          />
          <SelectField
            label="Mailbox kind"
            value={mbxKind}
            onChange={(e) => setMbxKind(e.target.value as 'user' | 'shared')}
          >
            <option value="user">User mailbox</option>
            <option value="shared">Shared mailbox (no paid seat)</option>
          </SelectField>
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Provisioning...' : 'Create mailbox'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
