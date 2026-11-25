import type { PlanTier } from '@mrrokesh/shared';
import type { PlanLimits } from '../billing/entitlements';

export const ORG_ROLES = [
  'owner',
  'billing_admin',
  'user_admin',
  'helpdesk',
  'security_admin',
  'compliance_admin',
  'read_only',
  'member',
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const MAILBOX_KINDS = ['user', 'shared', 'room_resource', 'equipment_resource'] as const;
export type MailboxKind = (typeof MAILBOX_KINDS)[number];

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'read_only',
  'canceled',
  'suspended',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ['monthly', 'annual'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const ORG_STATUSES = ['active', 'suspended', 'pending_deletion'] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export interface PlanRecord {
  id: string;
  tier: PlanTier;
  displayName: string;
  priceInrMonthlyPaise: number;
  priceInrAnnualPaise: number;
  priceUsdMonthlyCents: number;
  priceUsdAnnualCents: number;
  storageGbPerSeat: number;
  isStoragePooled: boolean;
  maxDomains: number;
  maxAliasesPerBox: number;
  entitlements: PlanLimits;
  createdAt: Date;
}

export interface OrgRecord {
  id: string;
  name: string;
  slug: string;
  stalwartTenantId: string;
  dataResidencyRegion: string;
  enforceMfa: boolean;
  ssoEnabled: boolean;
  status: OrgStatus;
  sendingPaused: boolean;
  gstin: string | null;
  placeOfSupply: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  currency: 'INR' | 'USD';
  seatLimit: number;
  extraStorageGb: number;
  paymentGateway: 'razorpay' | 'stripe';
  gatewayCustomerId: string | null;
  gatewaySubId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paidAt: Date | null;
  limitOverrides: Partial<PlanLimits> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: OrgRole;
  passwordHash: string;
  pepperVersion: number;
  totpSecretEnc: Buffer | null;
  totpSecretIv: Buffer | null;
  mfaEnabled: boolean;
  isActive: boolean;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPatch {
  fullName?: string;
  role?: OrgRole;
  passwordHash?: string;
  pepperVersion?: number;
  totpSecretEnc?: Buffer | null;
  totpSecretIv?: Buffer | null;
  mfaEnabled?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
  lastLoginAt?: Date | null;
}

export interface RefreshRecord {
  id: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  familyId: string;
  deviceLabel: string | null;
  platform: 'web' | 'android' | 'ios' | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ResetRecord {
  id: string;
  organizationId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface PasskeyRecord {
  id: string;
  userId: string;
  organizationId: string;
  credentialId: string;
  publicKey: Buffer;
  signCount: number;
  transports: string[];
  label: string;
  createdAt: Date;
}

export interface DomainRecord {
  id: string;
  organizationId: string;
  domainName: string;
  verificationTxt: string;
  isVerified: boolean;
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  mtaStsEnabled: boolean;
  daneEnabled: boolean;
  deliverabilityScore: number;
  catchAllMailboxId: string | null;
  lastDnsCheckedAt: Date | null;
  createdAt: Date;
}

export interface DkimRecord {
  id: string;
  domainId: string;
  organizationId: string;
  selector: string;
  algorithm: 'rsa-2048' | 'ed25519';
  publicKeyDns: string;
  privateKeyEnc: Buffer;
  privateKeyIv: Buffer;
  isActive: boolean;
  rotateAfter: Date;
  createdAt: Date;
}

export interface MailboxRecord {
  id: string;
  organizationId: string;
  domainId: string;
  userId: string | null;
  kind: MailboxKind;
  address: string;
  stalwartPrincipalId: string;
  quotaBytes: number;
  usedBytes: number;
  archiveAutoExpand: boolean;
  createdAt: Date;
}

export interface AliasRecord {
  id: string;
  organizationId: string;
  mailboxId: string;
  domainId: string;
  aliasAddress: string;
  isDisposableMasked: boolean;
  label: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DelegationRecord {
  id: string;
  organizationId: string;
  mailboxId: string;
  delegateUserId: string;
  canRead: boolean;
  canSendAs: boolean;
  canSendOnBehalf: boolean;
  createdAt: Date;
}

export interface AuditRecord {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  requestId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CheckoutRecord {
  id: string;
  organizationId: string;
  tier: PlanTier;
  cycle: BillingCycle;
  seats: number;
  amountPaise: number;
  gstin: string | null;
  placeOfSupply: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: Date;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  checkoutId: string;
  invoiceNumber: string;
  gstin: string | null;
  placeOfSupply: string;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  sacCode: string;
  createdAt: Date;
}

export interface AppPasswordRecord {
  id: string;
  organizationId: string;
  mailboxId: string;
  userId: string;
  label: string;
  passwordHash: string;
  pepperVersion: number;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface SendReservation {
  organizationId: string;
  userId: string;
  day: string;
  minute: string;
  addMessages: number;
  addRecipients: number;
  addExternal: number;
  maxMessagesPerDay: number;
  maxRecipientsPerDay: number;
  maxExternalPerDay: number;
  maxPerMinute: number;
}

export type SendReservationResult =
  | {
      ok: true;
      usage: { messages: number; recipients: number; external: number; minute: number };
    }
  | { ok: false; reason: 'messages' | 'recipients' | 'external' | 'minute' };

export interface SignupWrite {
  org: OrgRecord;
  user: UserRecord;
  subscription: SubscriptionRecord;
  audit: AuditRecord;
}

export interface ControlStore {
  seedPlans(): Promise<void>;
  listPlans(): Promise<PlanRecord[]>;
  findPlanByTier(tier: PlanTier): Promise<PlanRecord | null>;
  findPlanById(id: string): Promise<PlanRecord | null>;
  signup(input: SignupWrite): Promise<'ok' | 'duplicate_slug' | 'duplicate_email'>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUser(organizationId: string, userId: string): Promise<UserRecord | null>;
  listUsers(organizationId: string): Promise<UserRecord[]>;
  insertUser(user: UserRecord): Promise<'ok' | 'duplicate_email'>;
  updateUser(organizationId: string, userId: string, patch: UserPatch): Promise<UserRecord | null>;
  countActiveUsers(organizationId: string): Promise<number>;
  findOrgBySlug(slug: string): Promise<OrgRecord | null>;
  findOrg(organizationId: string): Promise<OrgRecord | null>;
  updateOrg(organizationId: string, patch: Partial<OrgRecord>): Promise<OrgRecord | null>;
  findSubscription(organizationId: string): Promise<SubscriptionRecord | null>;
  updateSubscription(
    organizationId: string,
    patch: Partial<SubscriptionRecord>,
  ): Promise<SubscriptionRecord | null>;
  insertRefresh(row: RefreshRecord): Promise<void>;
  findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null>;
  revokeRefresh(organizationId: string, id: string, at: Date): Promise<void>;
  revokeRefreshFamily(organizationId: string, familyId: string, at: Date): Promise<void>;
  revokeAllRefreshForUser(organizationId: string, userId: string, at: Date): Promise<void>;
  listRefreshForUser(organizationId: string, userId: string): Promise<RefreshRecord[]>;
  insertReset(row: ResetRecord): Promise<void>;
  findResetByHash(tokenHash: string): Promise<ResetRecord | null>;
  markResetUsed(organizationId: string, id: string, at: Date): Promise<void>;
  insertPasskey(row: PasskeyRecord): Promise<'ok' | 'duplicate'>;
  listPasskeys(organizationId: string, userId: string): Promise<PasskeyRecord[]>;
  findPasskey(credentialId: string): Promise<PasskeyRecord | null>;
  updatePasskeyCounter(organizationId: string, id: string, signCount: number): Promise<void>;
  findDomainByName(name: string): Promise<DomainRecord | null>;
  insertDomain(domain: DomainRecord, dkim: DkimRecord): Promise<'ok' | 'duplicate'>;
  listDomains(organizationId: string): Promise<DomainRecord[]>;
  findDomain(organizationId: string, id: string): Promise<DomainRecord | null>;
  updateDomain(
    organizationId: string,
    id: string,
    patch: Partial<DomainRecord>,
  ): Promise<DomainRecord | null>;
  countDomains(organizationId: string): Promise<number>;
  listDkim(organizationId: string, domainId: string): Promise<DkimRecord[]>;
  insertMailbox(row: MailboxRecord): Promise<'ok' | 'duplicate'>;
  listMailboxes(organizationId: string): Promise<MailboxRecord[]>;
  findMailbox(organizationId: string, id: string): Promise<MailboxRecord | null>;
  findMailboxByAddress(address: string): Promise<MailboxRecord | null>;
  countMailboxesByKind(organizationId: string, kind: MailboxKind): Promise<number>;
  insertAlias(row: AliasRecord): Promise<'ok' | 'duplicate'>;
  listAliases(organizationId: string, mailboxId: string): Promise<AliasRecord[]>;
  listAliasesForOrg(organizationId: string): Promise<AliasRecord[]>;
  deleteAlias(organizationId: string, mailboxId: string, aliasId: string): Promise<boolean>;
  countAliases(organizationId: string, mailboxId: string): Promise<number>;
  insertDelegation(row: DelegationRecord): Promise<'ok' | 'duplicate'>;
  listDelegationsForUser(organizationId: string, userId: string): Promise<DelegationRecord[]>;
  insertAudit(row: AuditRecord): Promise<void>;
  listAudit(organizationId: string, since: Date): Promise<AuditRecord[]>;
  reserveSend(input: SendReservation): Promise<SendReservationResult>;
  insertCheckout(row: CheckoutRecord): Promise<void>;
  findCheckout(id: string): Promise<CheckoutRecord | null>;
  updateCheckout(
    organizationId: string,
    id: string,
    patch: Partial<CheckoutRecord>,
  ): Promise<CheckoutRecord | null>;
  insertInvoice(row: InvoiceRecord): Promise<void>;
  listInvoices(organizationId: string): Promise<InvoiceRecord[]>;
  countInvoices(organizationId: string): Promise<number>;
  insertAppPassword(row: AppPasswordRecord): Promise<void>;
  listAppPasswords(organizationId: string, mailboxId: string): Promise<AppPasswordRecord[]>;
  revokeAppPassword(
    organizationId: string,
    mailboxId: string,
    id: string,
    at: Date,
  ): Promise<boolean>;
}
