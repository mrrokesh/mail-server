import { PLAN_TIER_LABEL, type PlanTier } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { SkeletonLines } from '../../components/ui/skeleton';
import { readOrFallback } from '../../lib/api';
import { formatInr } from '../../lib/dates';
import { MOCK_PLANS } from '../../lib/mock-data';
import { parsePlans, type PlanOffer } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const LIMITS: { label: string; values: Record<PlanTier, string> }[] = [
  {
    label: 'Users per workspace',
    values: {
      free: 'Up to 5',
      starter: 'Up to 300',
      business: 'Up to 300',
      business_plus: 'Up to 300',
      enterprise: 'Unlimited',
    },
  },
  {
    label: 'Mail storage per seat',
    values: {
      free: '5 GB shared',
      starter: '15 GB',
      business: '50 GB',
      business_plus: '100 GB',
      enterprise: '100 GB',
    },
  },
  {
    label: 'Drive storage',
    values: {
      free: 'Shared 5 GB',
      starter: '5 GB',
      business: '50 GB',
      business_plus: '1 TB',
      enterprise: '5 TB pooled',
    },
  },
  {
    label: 'Custom domains',
    values: {
      free: '1',
      starter: '3',
      business: '10',
      business_plus: '50',
      enterprise: 'Unlimited',
    },
  },
  {
    label: 'Aliases per mailbox',
    values: {
      free: '5',
      starter: '50',
      business: '300',
      business_plus: '300',
      enterprise: '400',
    },
  },
  {
    label: 'Max attachment size',
    values: {
      free: '25 MB',
      starter: '50 MB',
      business: '100 MB',
      business_plus: '150 MB',
      enterprise: '150 MB',
    },
  },
  {
    label: 'Shared mailboxes (free)',
    values: {
      free: 'None',
      starter: '2 (15 GB)',
      business: '20 (50 GB)',
      business_plus: 'Unlimited',
      enterprise: 'Unlimited',
    },
  },
  {
    label: 'IMAP, POP3, and SMTP',
    values: {
      free: 'Web & Mobile only',
      starter: 'Included',
      business: 'Included',
      business_plus: 'Included',
      enterprise: 'Included',
    },
  },
  {
    label: 'ActiveSync & EWS',
    values: {
      free: 'No',
      starter: 'No',
      business: 'Included',
      business_plus: 'Included',
      enterprise: 'Included',
    },
  },
  {
    label: 'Retention, legal hold, eDiscovery',
    values: {
      free: 'No',
      starter: 'No',
      business: 'No',
      business_plus: 'Included',
      enterprise: 'Included + SIEM',
    },
  },
];

function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => readOrFallback('/plans', parsePlans, MOCK_PLANS),
    staleTime: 5 * 60 * 1000,
  });
}

function priceLabel(plan: PlanOffer, cycle: 'annual' | 'monthly'): string {
  const amount = cycle === 'annual' ? plan.annualInr : plan.monthlyInr;
  if (amount === null) return 'Custom';
  if (amount === 0) return formatInr(0);
  return formatInr(amount);
}

export function PricingPage() {
  useDocumentTitle('Pricing');
  const plans = usePlans();
  const [cycle, setCycle] = useState<'annual' | 'monthly'>('annual');
  const [seats, setSeats] = useState(5);
  const catalog = plans.data ?? MOCK_PLANS;

  return (
    <article className="section">
      <div className="container stack-8">
        <header className="stack">
          <h1 className="h1">Clear rupee pricing</h1>
          <p className="body-lg muted measure">
            Every price includes 18% GST with zero renewal shock. Compare annual commitments beside
            month-to-month billing.
          </p>
          <div className="spread">
            <div className="segment" role="tablist" aria-label="Billing period">
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'annual'}
                onClick={() => setCycle('annual')}
              >
                Annual (save ~18%)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cycle === 'monthly'}
                onClick={() => setCycle('monthly')}
              >
                Monthly
              </button>
            </div>
            <div className="cluster">
              <label className="caption muted" htmlFor="seat-estimator">
                Estimate for seats
              </label>
              <input
                id="seat-estimator"
                className="input input-compact"
                style={{ width: 96 }}
                type="number"
                min={1}
                max={300}
                value={seats}
                onChange={(e) => setSeats(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
        </header>

        {plans.isPending ? <SkeletonLines count={2} /> : null}

        <div className="plan-grid">
          {catalog.plans.map((plan) => {
            const featured = plan.id === 'business';
            const unit = cycle === 'annual' ? plan.annualInr : plan.monthlyInr;
            const estimate = unit && unit > 0 ? formatInr(unit * seats) : null;
            return (
              <article key={plan.id} className={featured ? 'plan-card card-featured' : 'plan-card'}>
                <div className="spread">
                  <h2 className="h3">{PLAN_TIER_LABEL[plan.id]}</h2>
                  {featured ? <Badge tone="brand">Popular</Badge> : null}
                </div>
                <div className="stack-2">
                  <p className="plan-price">{priceLabel(plan, cycle)}</p>
                  <p className="caption muted">
                    {unit === null
                      ? 'Annual contract · custom SLA'
                      : unit === 0
                        ? 'Up to 5 seats free'
                        : `per user / month${estimate ? ` · ${estimate} for ${seats} seats` : ''}`}
                  </p>
                </div>
                <div className="stack-3">
                  <p className="caption">{plan.summary}</p>
                  <ul className="plan-list">
                    {plan.highlights.map((item) => (
                      <li key={item}>
                        <Icon icon={Check} size={15} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  className={featured ? 'btn btn-primary' : 'btn btn-quiet'}
                  to={`/signup?plan=${plan.id}`}
                >
                  Choose {PLAN_TIER_LABEL[plan.id]}
                </Link>
              </article>
            );
          })}
        </div>

        <div className="card spread">
          <div className="stack-2">
            <h2 className="h3">Privacy Add-on</h2>
            <p className="muted measure">
              Adds client-side OpenPGP key management, unlimited masked email aliases, and the
              privacy dashboard on Starter, Business, or Business Plus. Included with Enterprise.
            </p>
          </div>
          <div className="stack-2" style={{ textAlign: 'right' }}>
            <p className="h3 tabular">
              {formatInr(cycle === 'annual' ? catalog.privacyAnnualInr : catalog.privacyMonthlyInr)}
            </p>
            <p className="caption muted">per user / month incl. GST</p>
          </div>
        </div>

        <div className="stack-3">
          <h2 className="h2">Compare plan limits</h2>
          <div className="table-scroll">
            <table>
              <caption className="table-note">
                All quotas are enforced server-side in real time. Full numeric table in
                /docs/limits.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  {(['free', 'starter', 'business', 'business_plus', 'enterprise'] as const).map(
                    (id) => (
                      <th key={id} scope="col">
                        {PLAN_TIER_LABEL[id]}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {LIMITS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.values.free}</td>
                    <td>{row.values.starter}</td>
                    <td>{row.values.business}</td>
                    <td>{row.values.business_plus}</td>
                    <td>{row.values.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </article>
  );
}
