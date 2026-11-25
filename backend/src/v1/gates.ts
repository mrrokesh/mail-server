import type { PlanTier } from '@mrrokesh/shared';
import { PLAN_CATALOG } from '../billing/entitlements';
import { ApiError } from '../errors';
import type { TenantContext } from '../services/access';

const RANK: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  business: 2,
  business_plus: 3,
  enterprise: 4,
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export function tierAtLeast(tier: PlanTier, minimum: PlanTier): boolean {
  return RANK[tier] >= RANK[minimum];
}

export function assertTier(tenant: TenantContext, minimum: PlanTier, feature: string): void {
  if (!tierAtLeast(tenant.plan.tier, minimum)) {
    throw new ApiError('API-BILL-003', { feature, requiredTier: minimum });
  }
}

export function driveUploadLimit(tier: PlanTier): number {
  if (tier === 'free') return 250 * MB;
  if (tier === 'starter') return GB;
  if (tier === 'business') return 5 * GB;
  return 10 * GB;
}

export function driveStorageLimit(tier: PlanTier): number {
  if (tier === 'free' || tier === 'starter') return 5 * GB;
  if (tier === 'business') return 50 * GB;
  if (tier === 'business_plus') return 1024 * GB;
  return 5 * 1024 * GB;
}

export function bookingPageCap(tier: PlanTier): number {
  if (tier === 'starter') return 1;
  if (tier === 'free') return 0;
  return -1;
}

export function meetLimits(tier: PlanTier): {
  participants: number;
  minutes: number;
  recording: boolean;
} {
  if (tier === 'starter') return { participants: 50, minutes: 60, recording: false };
  if (tier === 'business') return { participants: 150, minutes: 24 * 60, recording: false };
  if (tier === 'business_plus') return { participants: 300, minutes: 24 * 60, recording: true };
  return { participants: 1000, minutes: 24 * 60, recording: true };
}

export function maskedAliasCap(tier: PlanTier, privacyIncluded: boolean): number {
  if (privacyIncluded || tier === 'enterprise') return -1;
  if (tier === 'starter') return 10;
  if (tier === 'business' || tier === 'business_plus') return 50;
  return 0;
}

export function aiDailyCap(tier: PlanTier): number {
  if (tier === 'starter') return 25;
  if (tier === 'business') return 80;
  if (tier === 'business_plus') return 300;
  if (tier === 'enterprise') return 1000;
  return 0;
}

const PLAN_COPY: Record<PlanTier, { summary: string; highlights: string[] }> = {
  free: {
    summary: 'For a small team that uses the web and mobile apps.',
    highlights: ['Up to 5 people', '5 GB for mail and drive', '1 domain', 'Web and the mobile app'],
  },
  starter: {
    summary: 'For a company that also wants desktop mail clients.',
    highlights: ['Up to 300 people', '15 GB mail', '3 domains', 'IMAP, POP, and SMTP'],
  },
  business: {
    summary: 'For teams that need more storage and ActiveSync.',
    highlights: ['50 GB mail', '10 domains', 'ActiveSync and EWS', '100 MB attachments'],
  },
  business_plus: {
    summary: 'For a larger mailbox, drive, and archive allowance.',
    highlights: ['100 GB mail', '1 TB drive', '50 domains', 'Archive up to 1.5 TB'],
  },
  enterprise: {
    summary: 'Contract pricing, custom sending limits, privacy included.',
    highlights: [
      'Custom sending limits',
      'Privacy included',
      '5 TB pooled drive',
      'Unlimited domains',
    ],
  },
};

export function webPlanCatalog() {
  const tiers = Object.keys(PLAN_CATALOG) as PlanTier[];
  return {
    privacyAnnualInr: 99,
    privacyMonthlyInr: 119,
    plans: tiers.map((tier) => {
      const catalog = PLAN_CATALOG[tier];
      return {
        id: tier,
        annualInr: Math.round(catalog.priceInrAnnualPaise / 100),
        monthlyInr: tier === 'enterprise' ? null : Math.round(catalog.priceInrMonthlyPaise / 100),
        summary: PLAN_COPY[tier].summary,
        highlights: PLAN_COPY[tier].highlights,
      };
    }),
  };
}
