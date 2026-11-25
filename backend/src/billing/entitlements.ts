import type { PlanTier } from '@mrrokesh/shared';

/** Quotas and flags from PROJECT_BRIEF. -1 means unlimited. */
export interface PlanLimits {
  maxUsers: number;
  storageGbPerSeat: number;
  maxDomains: number;
  maxAliasesPerBox: number;
  maxSharedMailboxes: number;
  attachmentBytes: number;
  messagesPerDay: number;
  recipientsPerDay: number;
  externalRecipientsPerDay: number;
  recipientsPerMessage: number;
  messagesPerMinute: number;
  catchAll: boolean;
  imap: boolean;
  sendAs: boolean;
  auditRetentionDays: number;
  orgMfaPolicy: boolean;
  archiveAutoExpand: boolean;
}

const MIB = 1024 * 1024;

function limits(input: {
  maxUsers: number;
  storageGbPerSeat: number;
  maxDomains: number;
  maxAliasesPerBox: number;
  maxSharedMailboxes: number;
  attachmentMb: number;
  messagesPerDay: number;
  recipientsPerDay: number;
  externalRecipientsPerDay: number;
  recipientsPerMessage: number;
  messagesPerMinute: number;
  catchAll: boolean;
  imap: boolean;
  sendAs: boolean;
  auditRetentionDays: number;
  orgMfaPolicy: boolean;
  archiveAutoExpand: boolean;
}): PlanLimits {
  return {
    maxUsers: input.maxUsers,
    storageGbPerSeat: input.storageGbPerSeat,
    maxDomains: input.maxDomains,
    maxAliasesPerBox: input.maxAliasesPerBox,
    maxSharedMailboxes: input.maxSharedMailboxes,
    attachmentBytes: input.attachmentMb * MIB,
    messagesPerDay: input.messagesPerDay,
    recipientsPerDay: input.recipientsPerDay,
    externalRecipientsPerDay: input.externalRecipientsPerDay,
    recipientsPerMessage: input.recipientsPerMessage,
    messagesPerMinute: input.messagesPerMinute,
    catchAll: input.catchAll,
    imap: input.imap,
    sendAs: input.sendAs,
    auditRetentionDays: input.auditRetentionDays,
    orgMfaPolicy: input.orgMfaPolicy,
    archiveAutoExpand: input.archiveAutoExpand,
  };
}

export const PLAN_CATALOG: Record<
  PlanTier,
  {
    displayName: string;
    /** Month-to-month price in paise, GST included. */
    priceInrMonthlyPaise: number;
    /** Annual-plan price in paise per month, GST included. */
    priceInrAnnualPaise: number;
    isStoragePooled: boolean;
    entitlements: PlanLimits;
  }
> = {
  free: {
    displayName: 'Free',
    priceInrMonthlyPaise: 0,
    priceInrAnnualPaise: 0,
    isStoragePooled: false,
    entitlements: limits({
      maxUsers: 5,
      storageGbPerSeat: 5,
      maxDomains: 1,
      maxAliasesPerBox: 5,
      maxSharedMailboxes: 0,
      attachmentMb: 25,
      messagesPerDay: 100,
      recipientsPerDay: 300,
      externalRecipientsPerDay: 100,
      recipientsPerMessage: 50,
      messagesPerMinute: 10,
      catchAll: false,
      imap: false,
      sendAs: false,
      auditRetentionDays: 0,
      orgMfaPolicy: false,
      archiveAutoExpand: false,
    }),
  },
  starter: {
    displayName: 'Starter',
    priceInrMonthlyPaise: 8500,
    priceInrAnnualPaise: 6900,
    isStoragePooled: false,
    entitlements: limits({
      maxUsers: 300,
      storageGbPerSeat: 15,
      maxDomains: 3,
      maxAliasesPerBox: 50,
      maxSharedMailboxes: 2,
      attachmentMb: 50,
      messagesPerDay: 500,
      recipientsPerDay: 2000,
      externalRecipientsPerDay: 1000,
      recipientsPerMessage: 100,
      messagesPerMinute: 20,
      catchAll: true,
      imap: true,
      sendAs: true,
      auditRetentionDays: 90,
      orgMfaPolicy: true,
      archiveAutoExpand: false,
    }),
  },
  business: {
    displayName: 'Business',
    priceInrMonthlyPaise: 17900,
    priceInrAnnualPaise: 14900,
    isStoragePooled: false,
    entitlements: limits({
      maxUsers: 300,
      storageGbPerSeat: 50,
      maxDomains: 10,
      maxAliasesPerBox: 300,
      maxSharedMailboxes: 20,
      attachmentMb: 100,
      messagesPerDay: 2000,
      recipientsPerDay: 10000,
      externalRecipientsPerDay: 3000,
      recipientsPerMessage: 500,
      messagesPerMinute: 30,
      catchAll: true,
      imap: true,
      sendAs: true,
      auditRetentionDays: 180,
      orgMfaPolicy: true,
      archiveAutoExpand: false,
    }),
  },
  business_plus: {
    displayName: 'Business Plus',
    priceInrMonthlyPaise: 41900,
    priceInrAnnualPaise: 34900,
    isStoragePooled: false,
    entitlements: limits({
      maxUsers: 300,
      storageGbPerSeat: 100,
      maxDomains: 50,
      maxAliasesPerBox: 300,
      maxSharedMailboxes: -1,
      attachmentMb: 150,
      messagesPerDay: 2000,
      recipientsPerDay: 10000,
      externalRecipientsPerDay: 3000,
      recipientsPerMessage: 1000,
      messagesPerMinute: 30,
      catchAll: true,
      imap: true,
      sendAs: true,
      auditRetentionDays: 365,
      orgMfaPolicy: true,
      archiveAutoExpand: true,
    }),
  },
  enterprise: {
    displayName: 'Enterprise',
    priceInrMonthlyPaise: 69900,
    priceInrAnnualPaise: 69900,
    isStoragePooled: true,
    entitlements: limits({
      maxUsers: -1,
      storageGbPerSeat: 100,
      maxDomains: -1,
      maxAliasesPerBox: 400,
      maxSharedMailboxes: -1,
      attachmentMb: 150,
      messagesPerDay: 10000,
      recipientsPerDay: 50000,
      externalRecipientsPerDay: 20000,
      recipientsPerMessage: 1000,
      messagesPerMinute: 30,
      catchAll: true,
      imap: true,
      sendAs: true,
      auditRetentionDays: 3650,
      orgMfaPolicy: true,
      archiveAutoExpand: true,
    }),
  },
};

export const TRIAL_DAYS = 30;
export const TRIAL_SEATS = 2;
export const TRIAL_EXTERNAL_RECIPIENTS_PER_DAY = 200;
export const SAC_CODE = '998315';

export type FeatureFlag =
  'catchAll' | 'imap' | 'sendAs' | 'audit' | 'orgMfaPolicy' | 'sharedMailbox';

export function minimumTier(feature: FeatureFlag): PlanTier {
  void feature;
  return 'starter';
}

export function seatCap(entitlements: PlanLimits, seatLimit: number): number {
  if (entitlements.maxUsers < 0) return seatLimit;
  return Math.min(entitlements.maxUsers, seatLimit);
}

export function withinCap(used: number, cap: number): boolean {
  if (cap < 0) return true;
  return used < cap;
}

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function utcMinute(now: Date): string {
  return now.toISOString().slice(0, 16);
}

export function quotaBytes(storageGb: number): number {
  return storageGb * 1024 * 1024 * 1024;
}

export type IpPool = 'free' | 'trial' | 'paid' | 'enterprise';

export function ipPool(tier: PlanTier, paidAt: Date | null): IpPool {
  if (tier === 'enterprise' && paidAt) return 'enterprise';
  if (paidAt) return 'paid';
  if (tier === 'free') return 'free';
  return 'trial';
}
