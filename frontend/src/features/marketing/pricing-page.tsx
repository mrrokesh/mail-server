import { PLAN_TIER_LABEL, type PlanTier } from '@mrrokesh/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonLines } from '../../components/ui/skeleton';
import { readOrFallback } from '../../lib/api';
import { formatInr } from '../../lib/dates';
import { MOCK_PLANS } from '../../lib/mock-data';
import { parsePlans, type PlanOffer } from '../../lib/schemas';
import { useDocumentTitle } from '../../lib/use-document-title';

const LIMITS: { label: string; values: Record<PlanTier, string> }[] = [
  {
    label: 'People',
    values: {
      free: 'Up to 5',
      starter: 'Up to 300',
      business: 'Up to 300',
      business_plus: 'Up to 300',
      enterprise: 'Unlimited',
    },
  },
  {
    label: 'Mail storage',
    values: {
      free: '5 GB, shared with drive',
      starter: '15 GB',
      business: '50 GB',
      business_plus: '100 GB',
      enterprise: '100 GB',
    },
  },
  {
    label: 'Domains',
    values: {
      free: '1',
      starter: '3',
      business: '10',
      business_plus: '50',
      enterprise: 'Unlimited',
    },
  },
  {
    label: 'Attachment',
    values: {
      free: '25 MB',
      starter: '50 MB',
      business: '100 MB',
      business_plus: '150 MB',
      enterprise: '150 MB',
    },
  },
  {
    label: 'IMAP, POP, SMTP',
    values: {
      free: 'No',
      starter: 'Yes',
      business: 'Yes',
      business_plus: 'Yes',
      enterprise: 'Yes',
    },
  },
  {
    label: 'ActiveSync and EWS',
    values: {
      free: 'No',
      starter: 'No',
      business: 'Yes',
      business_plus: 'Yes',
      enterprise: 'Yes',
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
  if (amount === null) return 'Contract';
  if (amount === 0) return formatInr(0);
  return formatInr(amount);
}

export function PricingPage() {
  useDocumentTitle('Pricing');
  const plans = usePlans();
  const [cycle, setCycle] = useState<'annual' | 'monthly'>('annual');
  const catalog = plans.data;

  return (
    <article className="section">
      <div className="container stack-6">
        <header className="stack">
          <h1 className="h1">Clear prices, in rupees</h1>
          <p className="measure">
            Every price includes 18% GST. Annual is the monthly charge when you pay for a year.
            Month-to-month is listed beside it.
          </p>
          <div className="segment" role="tablist" aria-label="Billing period">
            <button
              type="button"
              role="tab"
              aria-selected={cycle === 'annual'}
              onClick={() => setCycle('annual')}
            >
              Annual
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
        </header>
        {plans.isPending ? <SkeletonLines count={2} /> : null}
        {catalog ? (
          <div className="plan-grid">
            {catalog.plans.map((plan) => {
              const featured = plan.id === 'business';
              return (
                <article
                  key={plan.id}
                  className={featured ? 'plan-card card-featured' : 'plan-card'}
                >
                  <h2 className="h3">{PLAN_TIER_LABEL[plan.id]}</h2>
                  <p className="strong">{priceLabel(plan, cycle)}</p>
                  <p className="muted">
                    {cycle === 'annual' ? 'Per user, each month' : 'Per user, month to month'}
                  </p>
                  <p>{plan.summary}</p>
                  <ul>
                    {plan.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {featured ? (
                    <Link className="btn btn-primary" to={`/signup?plan=${plan.id}`}>
                      Choose {PLAN_TIER_LABEL[plan.id]}
                    </Link>
                  ) : (
                    <Link className="btn btn-quiet" to={`/signup?plan=${plan.id}`}>
                      Choose {PLAN_TIER_LABEL[plan.id]}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : null}
        {catalog ? (
          <p className="measure">
            Privacy is an add-on at {formatInr(catalog.privacyAnnualInr)} a user on the annual
            price, or {formatInr(catalog.privacyMonthlyInr)} month to month. It is included with
            Enterprise.
          </p>
        ) : null}
        <div className="table-scroll">
          <table>
            <caption className="table-note">
              Limits from the plan table. Archive and drive pools are allowances, not separate
              products on this screen.
            </caption>
            <thead>
              <tr>
                <th scope="col">Limit</th>
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
    </article>
  );
}
