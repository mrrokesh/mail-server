import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Lock, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge, EmptyState } from '../../components/ui/primitives';
import { Sheet } from '../../components/ui/sheet';
import { SkeletonLines } from '../../components/ui/skeleton';
import { ApiProblem, readLive, writeLive } from '../../lib/api';
import { useDocumentTitle } from '../../lib/use-document-title';

const overviewSchema = z.object({
  operatorEmail: z.string(),
  orgs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      status: z.string(),
      sendingPaused: z.boolean(),
      dataResidencyRegion: z.string(),
      planTier: z.string(),
      subscriptionStatus: z.string(),
      activeUsers: z.number(),
      domainCount: z.number(),
      verifiedDomains: z.number(),
      mailboxCount: z.number(),
    }),
  ),
  queue: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      orgName: z.string(),
      category: z.string(),
      summary: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      status: z.enum(['open', 'resolved']),
      ipPool: z.string(),
      createdAt: z.string(),
    }),
  ),
  summary: z.object({
    totalOrgs: z.number(),
    pausedSendingCount: z.number(),
    suspendedCount: z.number(),
    openAbuseAlerts: z.number(),
  }),
});

const inspectSchema = z.object({
  org: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    sendingPaused: z.boolean(),
    enforceMfa: z.boolean(),
    dataResidencyRegion: z.string(),
  }),
  counts: z.object({
    users: z.number(),
    domains: z.number(),
    verifiedDomains: z.number(),
    mailboxes: z.number(),
  }),
  domains: z.array(
    z.object({
      id: z.string(),
      domainName: z.string(),
      isVerified: z.boolean(),
      spfStatus: z.string(),
      dkimStatus: z.string(),
      dmarcStatus: z.string(),
    }),
  ),
});

export function OperatorPage() {
  useDocumentTitle('Operator & Abuse Console');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [inspected, setInspected] = useState<z.infer<typeof inspectSchema> | null>(null);
  const [alertOrgId, setAlertOrgId] = useState('');
  const [alertCategory, setAlertCategory] = useState<
    'abuse_spike' | 'spam_complaint' | 'bounce_rate' | 'trial_review'
  >('bounce_rate');
  const [alertSummary, setAlertSummary] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);

  const overview = useQuery({
    queryKey: ['operator', 'overview'],
    queryFn: () =>
      readLive('/operator/overview', (input) => {
        const parsed = overviewSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
    retry: false,
  });

  async function inspectOrg(orgId: string) {
    setCode(null);
    try {
      const res = await writeLive(
        `/operator/orgs/${orgId}/inspect`,
        { method: 'POST', body: JSON.stringify({ reason: 'Operator support inspection' }) },
        (input) => {
          const parsed = inspectSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setInspected(res.data);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function toggleSending(orgId: string, currentlyPaused: boolean) {
    setCode(null);
    try {
      await writeLive(
        `/operator/orgs/${orgId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            sendingPaused: !currentlyPaused,
            reason: !currentlyPaused
              ? 'Operator abuse-desk outbound hold'
              : 'Operator cleared outbound hold',
          }),
        },
        (input) => input,
      );
      await queryClient.invalidateQueries({ queryKey: ['operator', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function toggleSuspended(orgId: string, status: string) {
    setCode(null);
    const next = status === 'suspended' ? 'active' : 'suspended';
    try {
      await writeLive(
        `/operator/orgs/${orgId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: next,
            reason:
              next === 'suspended' ? 'Operator compliance suspension' : 'Operator reactivated',
          }),
        },
        (input) => input,
      );
      await queryClient.invalidateQueries({ queryKey: ['operator', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function createAlert(event: FormEvent) {
    event.preventDefault();
    const orgId = alertOrgId || overview.data?.orgs[0]?.id;
    if (!orgId) return;
    setCode(null);
    try {
      await writeLive(
        '/operator/queue',
        {
          method: 'POST',
          body: JSON.stringify({
            organizationId: orgId,
            category: alertCategory,
            summary: alertSummary.trim(),
            severity: 'high',
            ipPool: 'trial',
          }),
        },
        (input) => input,
      );
      setAlertSummary('');
      await queryClient.invalidateQueries({ queryKey: ['operator', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function toggleQueue(id: string, current: 'open' | 'resolved') {
    setCode(null);
    try {
      await writeLive(
        `/operator/queue/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: current === 'open' ? 'resolved' : 'open' }),
        },
        (input) => input,
      );
      await queryClient.invalidateQueries({ queryKey: ['operator', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  if (overview.isError) {
    const errCode = overview.error instanceof ApiProblem ? overview.error.code : 'API-AUTH-003';
    return (
      <div className="page-wrap">
        <h1 className="h2">MR Rokesh Operator Console</h1>
        <EmptyState
          icon={Lock}
          title="Platform operator authorization required"
          description="Only allowlisted MR Rokesh staff operators (OPERATOR_EMAILS) can inspect cross-tenant telemetry or pause sending. Every inspection writes an immutable audit event visible to the tenant."
        />
        <ErrorNote code={errCode} />
      </div>
    );
  }

  const data = overview.data;
  const visibleOrgs = (data?.orgs ?? []).filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Operator &amp; Abuse Console</h1>
          <p className="caption muted">
            Platform-wide tenant oversight, IP pool triage, and mandatory tenant-audited support
            access.
          </p>
        </div>
        {data ? <Badge tone="brand">Operator · {data.operatorEmail}</Badge> : null}
      </div>

      {overview.isPending ? <SkeletonLines count={4} /> : null}
      {code ? <ErrorNote code={code} /> : null}

      {data ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="caption muted">Total tenants</span>
              <span className="kpi-value">{data.summary.totalOrgs}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Sending paused</span>
              <span className="kpi-value">{data.summary.pausedSendingCount}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Suspended orgs</span>
              <span className="kpi-value">{data.summary.suspendedCount}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Open abuse alerts</span>
              <span className="kpi-value">{data.summary.openAbuseAlerts}</span>
            </div>
          </div>

          <section className="stack-3">
            <div className="spread">
              <h2 className="h3">Tenants directory</h2>
              <input
                className="input"
                type="search"
                style={{ maxWidth: 280 }}
                placeholder="Filter organizations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Plan</th>
                    <th>Domains</th>
                    <th>Seats</th>
                    <th>Sending</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrgs.map((org) => (
                    <tr key={org.id}>
                      <td>
                        <div className="stack-1">
                          <span className="strong">{org.name}</span>
                          <span className="caption mono muted">{org.slug}</span>
                        </div>
                      </td>
                      <td>
                        <Badge tone="brand">{org.planTier}</Badge>
                      </td>
                      <td className="tabular">
                        {org.verifiedDomains}/{org.domainCount}
                      </td>
                      <td className="tabular">{org.activeUsers}</td>
                      <td>
                        <Badge tone={org.sendingPaused ? 'danger' : 'success'}>
                          {org.sendingPaused ? 'Paused' : 'Normal'}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={org.status === 'suspended' ? 'danger' : 'success'}>
                          {org.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="cluster-2" style={{ flexWrap: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => void inspectOrg(org.id)}
                          >
                            <Icon icon={Eye} size={14} />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => void toggleSending(org.id, org.sendingPaused)}
                          >
                            {org.sendingPaused ? 'Resume send' : 'Pause send'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => void toggleSuspended(org.id, org.status)}
                          >
                            {org.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card stack">
            <div className="cluster-2">
              <Icon icon={ShieldAlert} size={18} />
              <h2 className="h3">Abuse &amp; IP pool queue</h2>
            </div>
            <form className="cluster" onSubmit={(event) => void createAlert(event)}>
              <SelectField
                label="Target tenant"
                value={alertOrgId || data.orgs[0]?.id || ''}
                onChange={(event) => setAlertOrgId(event.target.value)}
              >
                {data.orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Category"
                value={alertCategory}
                onChange={(event) =>
                  setAlertCategory(
                    event.target.value as
                      'abuse_spike' | 'spam_complaint' | 'bounce_rate' | 'trial_review',
                  )
                }
              >
                <option value="bounce_rate">Bounce rate</option>
                <option value="abuse_spike">Abuse spike</option>
                <option value="spam_complaint">Spam complaint</option>
                <option value="trial_review">Trial pool review</option>
              </SelectField>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field
                  label="Summary"
                  placeholder="Describe rate or complaint threshold"
                  value={alertSummary}
                  onChange={(event) => setAlertSummary(event.target.value)}
                  required
                />
              </div>
              <button className="btn btn-quiet" type="submit">
                Log alert
              </button>
            </form>

            {data.queue.length === 0 ? (
              <p className="caption muted">No open abuse or IP pool alerts.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Category</th>
                      <th>Pool</th>
                      <th>Summary</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queue.map((q) => (
                      <tr key={q.id}>
                        <td className="strong">{q.orgName}</td>
                        <td>{q.category}</td>
                        <td>
                          <Badge>{q.ipPool}</Badge>
                        </td>
                        <td className="caption break">{q.summary}</td>
                        <td>
                          <Badge tone={q.status === 'resolved' ? 'success' : 'warning'}>
                            {q.status}
                          </Badge>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() => void toggleQueue(q.id, q.status)}
                          >
                            {q.status === 'open' ? 'Resolve' : 'Reopen'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <Sheet
        open={Boolean(inspected)}
        onClose={() => setInspected(null)}
        title={inspected ? `Inspected tenant · ${inspected.org.name}` : 'Tenant inspection'}
        size="lg"
      >
        {inspected ? (
          <div className="stack">
            <div className="privacy-bar">
              <span className="caption">
                An immutable <code>operator.inspect</code> event was appended to{' '}
                {inspected.org.name}&apos;s compliance audit log.
              </span>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="caption muted">Region</span>
                <span className="kpi-value">{inspected.org.dataResidencyRegion}</span>
              </div>
              <div className="kpi-card">
                <span className="caption muted">Users</span>
                <span className="kpi-value">{inspected.counts.users}</span>
              </div>
              <div className="kpi-card">
                <span className="caption muted">Mailboxes</span>
                <span className="kpi-value">{inspected.counts.mailboxes}</span>
              </div>
              <div className="kpi-card">
                <span className="caption muted">Verified domains</span>
                <span className="kpi-value">
                  {inspected.counts.verifiedDomains}/{inspected.counts.domains}
                </span>
              </div>
            </div>
            {inspected.domains.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Verified</th>
                      <th>SPF</th>
                      <th>DKIM</th>
                      <th>DMARC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspected.domains.map((d) => (
                      <tr key={d.id}>
                        <td className="mono">{d.domainName}</td>
                        <td>{d.isVerified ? 'Yes' : 'No'}</td>
                        <td>{d.spfStatus}</td>
                        <td>{d.dkimStatus}</td>
                        <td>{d.dmarcStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="caption muted">No custom domains connected yet.</p>
            )}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
