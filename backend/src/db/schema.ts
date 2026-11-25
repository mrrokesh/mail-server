import {
  boolean,
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { PlanLimits } from '../billing/entitlements';

const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

const inet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

export const PLAN_TIER_VALUES = [
  'free',
  'starter',
  'business',
  'business_plus',
  'enterprise',
] as const;

export const planTierEnum = pgEnum('plan_tier', PLAN_TIER_VALUES);
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'annual']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'read_only',
  'canceled',
  'suspended',
]);
export const orgRoleEnum = pgEnum('org_role', [
  'owner',
  'billing_admin',
  'user_admin',
  'helpdesk',
  'security_admin',
  'compliance_admin',
  'read_only',
  'member',
]);
export const mailboxKindEnum = pgEnum('mailbox_kind', [
  'user',
  'shared',
  'room_resource',
  'equipment_resource',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: planTierEnum('tier').notNull().unique(),
  displayName: text('display_name').notNull(),
  priceInrMonthly: integer('price_inr_monthly').notNull(),
  priceInrAnnual: integer('price_inr_annual').notNull(),
  priceUsdMonthly: integer('price_usd_monthly').notNull(),
  priceUsdAnnual: integer('price_usd_annual').notNull(),
  storageGbPerSeat: integer('storage_gb_per_seat').notNull(),
  isStoragePooled: boolean('is_storage_pooled').notNull().default(false),
  maxDomains: integer('max_domains').notNull(),
  maxAliasesPerBox: integer('max_aliases_per_box').notNull(),
  entitlements: jsonb('entitlements').$type<PlanLimits>().notNull(),
  createdAt: timestamps.createdAt,
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: citext('slug').notNull().unique(),
  stalwartTenantId: text('stalwart_tenant_id').notNull().unique(),
  dataResidencyRegion: text('data_residency_region').notNull().default('ap-south-1'),
  enforceMfa: boolean('enforce_mfa').notNull().default(false),
  ssoEnabled: boolean('sso_enabled').notNull().default(false),
  ssoConfigEnc: bytea('sso_config_enc'),
  ssoConfigIv: bytea('sso_config_iv'),
  kmsKeyVersion: smallint('kms_key_version').notNull().default(1),
  status: text('status').notNull().default('active'),
  sendingPaused: boolean('sending_paused').notNull().default(false),
  gstin: text('gstin'),
  placeOfSupply: text('place_of_supply'),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgSubscriptions = pgTable('org_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  cycle: billingCycleEnum('cycle').notNull().default('annual'),
  currency: text('currency').notNull(),
  seatLimit: integer('seat_limit').notNull(),
  extraStorageGb: integer('extra_storage_gb').notNull().default(0),
  dedicatedIpAddon: boolean('dedicated_ip_addon').notNull().default(false),
  compliancePackAddon: boolean('compliance_pack_addon').notNull().default(false),
  paymentGateway: text('payment_gateway').notNull(),
  gatewayCustomerId: text('gateway_customer_id'),
  gatewaySubId: text('gateway_sub_id').unique(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  limitOverrides: jsonb('limit_overrides').$type<Partial<PlanLimits>>(),
  createdAt: timestamps.createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: citext('email').notNull(),
    fullName: text('full_name').notNull(),
    role: orgRoleEnum('role').notNull().default('member'),
    passwordHash: text('password_hash').notNull(),
    pepperVersion: smallint('pepper_version').notNull().default(1),
    totpSecretEnc: bytea('totp_secret_enc'),
    totpSecretIv: bytea('totp_secret_iv'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamps.createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  familyId: uuid('family_id').notNull(),
  deviceLabel: text('device_label'),
  platform: text('platform'),
  ipAddress: inet('ip_address'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const webauthnPasskeys = pgTable('webauthn_passkeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: bytea('public_key').notNull(),
  signCount: integer('sign_count').notNull().default(0),
  transports: text('transports').array(),
  label: text('label').notNull(),
  createdAt: timestamps.createdAt,
});

export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  domainName: citext('domain_name').notNull().unique(),
  verificationTxt: text('verification_txt').notNull(),
  isVerified: boolean('is_verified').notNull().default(false),
  mxVerified: boolean('mx_verified').notNull().default(false),
  spfVerified: boolean('spf_verified').notNull().default(false),
  dkimVerified: boolean('dkim_verified').notNull().default(false),
  dmarcVerified: boolean('dmarc_verified').notNull().default(false),
  mtaStsEnabled: boolean('mta_sts_enabled').notNull().default(false),
  daneEnabled: boolean('dane_enabled').notNull().default(false),
  bimiSvgUrl: text('bimi_svg_url'),
  deliverabilityScore: smallint('deliverability_score').notNull().default(0),
  catchAllMailboxId: uuid('catch_all_mailbox_id'),
  lastDnsCheckedAt: timestamp('last_dns_checked_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const domainDkimKeys = pgTable(
  'domain_dkim_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .notNull()
      .references(() => domains.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    selector: text('selector').notNull(),
    algorithm: text('algorithm').notNull(),
    publicKeyDns: text('public_key_dns').notNull(),
    privateKeyEnc: bytea('private_key_enc').notNull(),
    privateKeyIv: bytea('private_key_iv').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    rotateAfter: timestamp('rotate_after', { withTimezone: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex('domain_dkim_selector_unique').on(table.domainId, table.selector)],
);

export const mailboxes = pgTable('mailboxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: mailboxKindEnum('kind').notNull().default('user'),
  address: citext('address').notNull().unique(),
  stalwartPrincipalId: text('stalwart_principal_id').notNull().unique(),
  quotaBytes: integer('quota_bytes').notNull(),
  usedBytes: integer('used_bytes').notNull().default(0),
  archiveAutoExpand: boolean('archive_auto_expand').notNull().default(false),
  litigationHoldUntil: timestamp('litigation_hold_until', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const mailboxAliases = pgTable('mailbox_aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  mailboxId: uuid('mailbox_id')
    .notNull()
    .references(() => mailboxes.id, { onDelete: 'cascade' }),
  domainId: uuid('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  aliasAddress: citext('alias_address').notNull().unique(),
  isDisposableMasked: boolean('is_disposable_masked').notNull().default(false),
  label: text('label'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamps.createdAt,
});

export const mailboxDelegations = pgTable(
  'mailbox_delegations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    mailboxId: uuid('mailbox_id')
      .notNull()
      .references(() => mailboxes.id, { onDelete: 'cascade' }),
    delegateUserId: uuid('delegate_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    canRead: boolean('can_read').notNull().default(true),
    canSendAs: boolean('can_send_as').notNull().default(false),
    canSendOnBehalf: boolean('can_send_on_behalf').notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (table) => [uniqueIndex('mailbox_delegate_unique').on(table.mailboxId, table.delegateUserId)],
);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  requestId: uuid('request_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  ipAddress: inet('ip_address'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamps.createdAt,
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const billingCheckouts = pgTable('billing_checkouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  tier: planTierEnum('tier').notNull(),
  cycle: billingCycleEnum('cycle').notNull(),
  seats: integer('seats').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  gstin: text('gstin'),
  placeOfSupply: text('place_of_supply').notNull(),
  status: text('status').notNull(),
  createdAt: timestamps.createdAt,
});

export const gstInvoices = pgTable('gst_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  checkoutId: uuid('checkout_id')
    .notNull()
    .references(() => billingCheckouts.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  gstin: text('gstin'),
  placeOfSupply: text('place_of_supply').notNull(),
  taxablePaise: integer('taxable_paise').notNull(),
  cgstPaise: integer('cgst_paise').notNull(),
  sgstPaise: integer('sgst_paise').notNull(),
  igstPaise: integer('igst_paise').notNull(),
  totalPaise: integer('total_paise').notNull(),
  sacCode: text('sac_code').notNull(),
  createdAt: timestamps.createdAt,
});

export const appPasswords = pgTable('app_passwords', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  mailboxId: uuid('mailbox_id')
    .notNull()
    .references(() => mailboxes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  passwordHash: text('password_hash').notNull(),
  pepperVersion: smallint('pepper_version').notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const sendingDaily = pgTable(
  'sending_daily',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    messagesSent: integer('messages_sent').notNull().default(0),
    recipientsTotal: integer('recipients_total').notNull().default(0),
    recipientsExternal: integer('recipients_external').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId, table.day] })],
);

export const sendingMinute = pgTable(
  'sending_minute',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    minuteBucket: text('minute_bucket').notNull(),
    messagesSent: integer('messages_sent').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId, table.minuteBucket] })],
);
