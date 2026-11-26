import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, Plus, ShieldCheck, Trash2, Webhook } from 'lucide-react';
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
  profile: z.object({
    tier: z.enum(['authorized', 'silver', 'gold']),
    marginPercent: z.number(),
    companyLegalName: z.string(),
    gstin: z.string().nullable(),
  }),
  wholesaleCatalog: z.array(
    z.object({
      tier: z.string(),
      displayName: z.string(),
      retailMonthlyPaise: z.number(),
      wholesaleMonthlyPaise: z.number(),
      retailAnnualPaise: z.number(),
      wholesaleAnnualPaise: z.number(),
    }),
  ),
  tenants: z.array(
    z.object({
      id: z.string(),
      customerName: z.string(),
      primaryDomain: z.string(),
      planTier: z.enum(['starter', 'business', 'business_plus', 'enterprise']),
      seats: z.number(),
      status: z.enum(['active', 'trialing', 'suspended']),
      loginHost: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  webhooks: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      events: z.array(z.string()),
      secretHint: z.string(),
      enabled: z.boolean(),
    }),
  ),
  metrics: z.object({
    tenantCount: z.number(),
    activeSeats: z.number(),
    monthlyWholesalePaise: z.number(),
  }),
});

function inr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function PartnerPage() {
  useDocumentTitle('Reseller & Partner Console');
  const queryClient = useQueryClient();
  const [openTenant, setOpenTenant] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [planTier, setPlanTier] = useState<'starter' | 'business' | 'business_plus' | 'enterprise'>(
    'business',
  );
  const [seats, setSeats] = useState('10');
  const [loginHost, setLoginHost] = useState('');

  const [tier, setTier] = useState<'authorized' | 'silver' | 'gold'>('authorized');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');

  const [hookUrl, setHookUrl] = useState('');
  const [secretBanner, setSecretBanner] = useState<string | null>(null);
  const [handoffBanner, setHandoffBanner] = useState<string | null>(null);
  const [code, setCode] = useState<ErrorCode | null>(null);

  const overview = useQuery({
    queryKey: ['partner', 'overview'],
    queryFn: () =>
      readLive('/partner/overview', (input) => {
        const parsed = overviewSchema.safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
  });

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    const data = overview.data;
    try {
      await writeLive(
        '/partner/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            tier,
            companyLegalName: legalName.trim() || data?.profile.companyLegalName || 'Partner Org',
            gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
          }),
        },
        (input) => input,
      );
      await queryClient.invalidateQueries({ queryKey: ['partner', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function createTenant(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    try {
      await writeLive(
        '/partner/tenants',
        {
          method: 'POST',
          body: JSON.stringify({
            customerName: customerName.trim(),
            primaryDomain: primaryDomain.trim().toLowerCase(),
            planTier,
            seats: Number(seats) || 5,
            loginHost: loginHost.trim() ? loginHost.trim().toLowerCase() : null,
          }),
        },
        (input) => input,
      );
      setOpenTenant(false);
      setCustomerName('');
      setPrimaryDomain('');
      setLoginHost('');
      await queryClient.invalidateQueries({ queryKey: ['partner', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function toggleStatus(id: string, current: 'active' | 'trialing' | 'suspended') {
    setCode(null);
    const next = current === 'suspended' ? 'active' : 'suspended';
    try {
      await writeLive(
        `/partner/tenants/${id}`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) },
        (input) => input,
      );
      await queryClient.invalidateQueries({ queryKey: ['partner', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function actAsAdmin(id: string) {
    setCode(null);
    try {
      const res = await writeLive(
        `/partner/tenants/${id}/act-as-admin`,
        { method: 'POST', body: JSON.stringify({}) },
        (input) => {
          const parsed = z
            .object({ handoffId: z.string(), customerName: z.string(), expiresInSec: z.number() })
            .safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setHandoffBanner(
        `Audited support session ${res.data.handoffId.slice(0, 8)} opened for ${res.data.customerName} (15 min TTL, recorded in audit log).`,
      );
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function addWebhook(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    try {
      const res = await writeLive(
        '/partner/webhooks',
        {
          method: 'POST',
          body: JSON.stringify({
            url: hookUrl.trim(),
            events: ['tenant.created', 'tenant.updated'],
          }),
        },
        (input) => {
          const parsed = z.object({ signingSecretOnce: z.string() }).safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setSecretBanner(`Webhook signing secret (shown once): ${res.data.signingSecretOnce}`);
      setHookUrl('');
      await queryClient.invalidateQueries({ queryKey: ['partner', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  async function removeWebhook(id: string) {
    setCode(null);
    try {
      await writeLive(`/partner/webhooks/${id}`, { method: 'DELETE' }, () => true);
      await queryClient.invalidateQueries({ queryKey: ['partner', 'overview'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    }
  }

  const data = overview.data;

  return (
    <div className="page-wrap">
      <div className="spread">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 className="h2">Reseller &amp; Partner Console</h1>
          <p className="caption muted">
            Provision customer workspaces, track wholesale INR margins, run audited support
            sessions, and configure REST provisioning webhooks.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
          onClick={() => setOpenTenant(true)}
        >
          <Icon icon={Plus} size={17} />
          <span>Provision tenant</span>
        </button>
      </div>

      {overview.isPending ? <SkeletonLines count={4} /> : null}
      {overview.isError ? (
        <ErrorNote
          code={overview.error instanceof ApiProblem ? overview.error.code : 'API-SRV-500'}
        />
      ) : null}
      {code ? <ErrorNote code={code} /> : null}
      {handoffBanner ? (
        <div className="privacy-bar">
          <span className="caption status-ready">{handoffBanner}</span>
        </div>
      ) : null}
      {secretBanner ? (
        <div className="privacy-bar">
          <span className="caption mono">{secretBanner}</span>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="caption muted">Customer tenants</span>
              <span className="kpi-value">{data.metrics.tenantCount}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Managed seats</span>
              <span className="kpi-value">{data.metrics.activeSeats}</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Partner margin</span>
              <span className="kpi-value">{data.profile.marginPercent}%</span>
            </div>
            <div className="kpi-card">
              <span className="caption muted">Est. wholesale MRR</span>
              <span className="kpi-value">{inr(data.metrics.monthlyWholesalePaise)}</span>
            </div>
          </div>

          <section className="stack-3">
            <h2 className="h3">Managed customer tenants</h2>
            {data.tenants.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No customer tenants yet"
                description="Provision your first customer domain workspace with wholesale reseller pricing."
                action={
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setOpenTenant(true)}
                  >
                    Provision tenant
                  </button>
                }
              />
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Domain</th>
                      <th>Plan</th>
                      <th>Seats</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenants.map((t) => (
                      <tr key={t.id}>
                        <td className="strong">{t.customerName}</td>
                        <td className="mono">{t.primaryDomain}</td>
                        <td>
                          <Badge tone="brand">{t.planTier}</Badge>
                        </td>
                        <td className="tabular">{t.seats}</td>
                        <td>
                          <Badge
                            tone={
                              t.status === 'active'
                                ? 'success'
                                : t.status === 'suspended'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="cluster-2">
                            <button
                              type="button"
                              className="btn btn-quiet btn-sm"
                              onClick={() => void actAsAdmin(t.id)}
                            >
                              <Icon icon={ShieldCheck} size={14} />
                              <span>Act as admin</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-quiet btn-sm"
                              onClick={() => void toggleStatus(t.id, t.status)}
                            >
                              {t.status === 'suspended' ? 'Restore' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="two-col">
            <section className="card stack">
              <div className="cluster-2">
                <Icon icon={KeyRound} size={18} />
                <h2 className="h3">Partner tier &amp; legal entity</h2>
              </div>
              <form className="stack" onSubmit={(event) => void saveProfile(event)}>
                <SelectField
                  label="Partner tier"
                  value={tier}
                  onChange={(event) =>
                    setTier(event.target.value as 'authorized' | 'silver' | 'gold')
                  }
                >
                  <option value="authorized">Authorized Partner (20% margin)</option>
                  <option value="silver">Silver Partner (28% margin)</option>
                  <option value="gold">Gold Partner (35% margin)</option>
                </SelectField>
                <Field
                  label="Company legal name"
                  placeholder={data.profile.companyLegalName}
                  value={legalName}
                  onChange={(event) => setLegalName(event.target.value)}
                />
                <Field
                  label="Partner GSTIN (optional)"
                  placeholder="33ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(event) => setGstin(event.target.value)}
                />
                <button type="submit" className="btn btn-quiet">
                  Update partner profile
                </button>
              </form>
            </section>

            <section className="card stack">
              <h2 className="h3">Wholesale INR price sheet ({data.profile.marginPercent}% off)</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Retail / mo</th>
                      <th>Wholesale / mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wholesaleCatalog.map((row) => (
                      <tr key={row.tier}>
                        <td className="strong">{row.displayName}</td>
                        <td className="tabular muted">{inr(row.retailAnnualPaise)}</td>
                        <td className="tabular strong">{inr(row.wholesaleAnnualPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="card stack">
            <div className="cluster-2">
              <Icon icon={Webhook} size={18} />
              <h2 className="h3">Provisioning webhooks</h2>
            </div>
            <form className="cluster" onSubmit={(event) => void addWebhook(event)}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <Field
                  label="HTTPS endpoint URL"
                  type="url"
                  placeholder="https://billing.partner.example/mrrokesh-webhook"
                  value={hookUrl}
                  onChange={(event) => setHookUrl(event.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-quiet">
                Add webhook
              </button>
            </form>
            {data.webhooks.length > 0 ? (
              <div className="stack-2">
                {data.webhooks.map((hook) => (
                  <div key={hook.id} className="spread">
                    <div className="stack-1">
                      <span className="mono caption break">{hook.url}</span>
                      <span className="caption muted">
                        Events: {hook.events.join(', ')} · Secret {hook.secretHint}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      aria-label="Delete webhook"
                      onClick={() => void removeWebhook(hook.id)}
                    >
                      <Icon icon={Trash2} size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <Sheet
        open={openTenant}
        onClose={() => setOpenTenant(false)}
        title="Provision customer workspace"
      >
        <form className="sheet-form" onSubmit={(event) => void createTenant(event)}>
          <Field
            label="Customer organization name"
            placeholder="Apex Designs Pvt Ltd"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
          <Field
            label="Primary domain"
            placeholder="apexdesigns.in"
            value={primaryDomain}
            onChange={(event) => setPrimaryDomain(event.target.value)}
            required
          />
          <div className="two-col">
            <SelectField
              label="Plan tier"
              value={planTier}
              onChange={(event) =>
                setPlanTier(
                  event.target.value as 'starter' | 'business' | 'business_plus' | 'enterprise',
                )
              }
            >
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="business_plus">Business Plus</option>
              <option value="enterprise">Enterprise</option>
            </SelectField>
            <Field
              label="Seats"
              type="number"
              min={1}
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            />
          </div>
          <Field
            label="White-label login host (optional)"
            placeholder="mail.apexdesigns.in"
            value={loginHost}
            onChange={(event) => setLoginHost(event.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Provision tenant
          </button>
        </form>
      </Sheet>
    </div>
  );
}
