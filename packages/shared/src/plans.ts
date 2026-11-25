/**
 * Plan ids follow PROJECT_BRIEF tiers.
 * Prices and numeric limits stay in PROJECT_BRIEF.md and docs/limits.md.
 */
export const PLAN_TIERS = ['free', 'starter', 'business', 'business_plus', 'enterprise'] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_TIER_LABEL: Record<PlanTier, string> = {
  free: 'Free',
  starter: 'Starter',
  business: 'Business',
  business_plus: 'Business Plus',
  enterprise: 'Enterprise',
};

export const PRIVACY_ADDON_ID = 'privacy' as const;
