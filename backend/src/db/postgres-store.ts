import { eq } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { PLAN_TIERS, type PlanTier } from '@mrrokesh/shared';
import { PLAN_CATALOG, type PlanLimits } from '../billing/entitlements';
import { subscriptionPlans } from './schema';
import type {
  AliasRecord,
  AppPasswordRecord,
  AuditRecord,
  CheckoutRecord,
  ControlStore,
  DelegationRecord,
  DkimRecord,
  DomainRecord,
  InvoiceRecord,
  MailboxKind,
  MailboxRecord,
  OrgRecord,
  OrgRole,
  PasskeyRecord,
  PlanRecord,
  RefreshRecord,
  ResetRecord,
  SendReservation,
  SendReservationResult,
  SignupWrite,
  SubscriptionRecord,
  SubscriptionStatus,
  UserPatch,
  UserRecord,
} from '../store/types';

type Row = Record<string, unknown>;
type Database = PostgresJsDatabase<{ subscriptionPlans: typeof subscriptionPlans }>;

function asRow(value: unknown): Row | null {
  if (!value || typeof value !== 'object') return null;
  return value as Row;
}

function text(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Expected text ${key}`);
  return value;
}

function textOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  return text(row, key);
}

function flag(row: Row, key: string): boolean {
  const value = row[key];
  if (typeof value !== 'boolean') throw new Error(`Expected boolean ${key}`);
  return value;
}

function when(row: Row, key: string): Date {
  const value = row[key];
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  throw new Error(`Expected timestamp ${key}`);
}

function whenOrNull(row: Row, key: string): Date | null {
  if (row[key] == null) return null;
  return when(row, key);
}

function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  throw new Error(`Expected number ${key}`);
}

function bytes(row: Row, key: string): Buffer | null {
  const value = row[key];
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new Error(`Expected bytea ${key}`);
}

function jsonObject(row: Row, key: string): Record<string, unknown> {
  const value = row[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function mapPlan(row: typeof subscriptionPlans.$inferSelect): PlanRecord {
  return {
    id: row.id,
    tier: row.tier,
    displayName: row.displayName,
    priceInrMonthlyPaise: row.priceInrMonthly,
    priceInrAnnualPaise: row.priceInrAnnual,
    priceUsdMonthlyCents: row.priceUsdMonthly,
    priceUsdAnnualCents: row.priceUsdAnnual,
    storageGbPerSeat: row.storageGbPerSeat,
    isStoragePooled: row.isStoragePooled,
    maxDomains: row.maxDomains,
    maxAliasesPerBox: row.maxAliasesPerBox,
    entitlements: row.entitlements,
    createdAt: row.createdAt,
  };
}

function mapOrg(row: Row): OrgRecord {
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    slug: text(row, 'slug'),
    stalwartTenantId: text(row, 'stalwart_tenant_id'),
    dataResidencyRegion: text(row, 'data_residency_region'),
    enforceMfa: flag(row, 'enforce_mfa'),
    ssoEnabled: flag(row, 'sso_enabled'),
    status: text(row, 'status') as OrgRecord['status'],
    sendingPaused: flag(row, 'sending_paused'),
    gstin: textOrNull(row, 'gstin'),
    placeOfSupply: textOrNull(row, 'place_of_supply'),
    createdAt: when(row, 'created_at'),
    updatedAt: when(row, 'updated_at'),
  };
}

function mapUser(row: Row): UserRecord {
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    email: text(row, 'email'),
    fullName: text(row, 'full_name'),
    role: text(row, 'role') as OrgRole,
    passwordHash: text(row, 'password_hash'),
    pepperVersion: num(row, 'pepper_version'),
    totpSecretEnc: bytes(row, 'totp_secret_enc'),
    totpSecretIv: bytes(row, 'totp_secret_iv'),
    mfaEnabled: flag(row, 'mfa_enabled'),
    isActive: flag(row, 'is_active'),
    deletedAt: whenOrNull(row, 'deleted_at'),
    lastLoginAt: whenOrNull(row, 'last_login_at'),
    createdAt: when(row, 'created_at'),
    updatedAt: when(row, 'updated_at'),
  };
}

function mapSubscription(row: Row): SubscriptionRecord {
  const overrides = row.limit_overrides;
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    planId: text(row, 'plan_id'),
    status: text(row, 'status') as SubscriptionStatus,
    cycle: text(row, 'cycle') as SubscriptionRecord['cycle'],
    currency: text(row, 'currency') as 'INR' | 'USD',
    seatLimit: num(row, 'seat_limit'),
    extraStorageGb: num(row, 'extra_storage_gb'),
    paymentGateway: text(row, 'payment_gateway') as 'razorpay' | 'stripe',
    gatewayCustomerId: textOrNull(row, 'gateway_customer_id'),
    gatewaySubId: textOrNull(row, 'gateway_sub_id'),
    currentPeriodStart: when(row, 'current_period_start'),
    currentPeriodEnd: when(row, 'current_period_end'),
    paidAt: whenOrNull(row, 'paid_at'),
    limitOverrides:
      overrides && typeof overrides === 'object' ? (overrides as Partial<PlanLimits>) : null,
    createdAt: when(row, 'created_at'),
    updatedAt: when(row, 'updated_at'),
  };
}

function mapDomain(row: Row): DomainRecord {
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    domainName: text(row, 'domain_name'),
    verificationTxt: text(row, 'verification_txt'),
    isVerified: flag(row, 'is_verified'),
    mxVerified: flag(row, 'mx_verified'),
    spfVerified: flag(row, 'spf_verified'),
    dkimVerified: flag(row, 'dkim_verified'),
    dmarcVerified: flag(row, 'dmarc_verified'),
    mtaStsEnabled: flag(row, 'mta_sts_enabled'),
    daneEnabled: flag(row, 'dane_enabled'),
    deliverabilityScore: num(row, 'deliverability_score'),
    catchAllMailboxId: textOrNull(row, 'catch_all_mailbox_id'),
    lastDnsCheckedAt: whenOrNull(row, 'last_dns_checked_at'),
    createdAt: when(row, 'created_at'),
  };
}

function mapMailbox(row: Row): MailboxRecord {
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    domainId: text(row, 'domain_id'),
    userId: textOrNull(row, 'user_id'),
    kind: text(row, 'kind') as MailboxKind,
    address: text(row, 'address'),
    stalwartPrincipalId: text(row, 'stalwart_principal_id'),
    quotaBytes: num(row, 'quota_bytes'),
    usedBytes: num(row, 'used_bytes'),
    archiveAutoExpand: flag(row, 'archive_auto_expand'),
    createdAt: when(row, 'created_at'),
  };
}

function underLimit(current: number, add: number, max: number): boolean {
  if (max < 0) return true;
  return current + add <= max;
}

export class PostgresStore implements ControlStore {
  constructor(
    private readonly sql: Sql,
    private readonly db: Database,
  ) {}

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }

  private async inOrg<T>(organizationId: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
    const result = await this.sql.begin(async (tx) => {
      await tx`select set_config('app.current_org_id', ${organizationId}, true)`;
      return fn(tx as unknown as Sql);
    });
    return result as T;
  }

  async seedPlans(): Promise<void> {
    for (const tier of PLAN_TIERS) {
      const catalog = PLAN_CATALOG[tier];
      await this.db
        .insert(subscriptionPlans)
        .values({
          tier,
          displayName: catalog.displayName,
          priceInrMonthly: catalog.priceInrMonthlyPaise,
          priceInrAnnual: catalog.priceInrAnnualPaise,
          priceUsdMonthly: 0,
          priceUsdAnnual: 0,
          storageGbPerSeat: catalog.entitlements.storageGbPerSeat,
          isStoragePooled: catalog.isStoragePooled,
          maxDomains: catalog.entitlements.maxDomains,
          maxAliasesPerBox: catalog.entitlements.maxAliasesPerBox,
          entitlements: catalog.entitlements,
        })
        .onConflictDoUpdate({
          target: subscriptionPlans.tier,
          set: {
            displayName: catalog.displayName,
            priceInrMonthly: catalog.priceInrMonthlyPaise,
            priceInrAnnual: catalog.priceInrAnnualPaise,
            storageGbPerSeat: catalog.entitlements.storageGbPerSeat,
            isStoragePooled: catalog.isStoragePooled,
            maxDomains: catalog.entitlements.maxDomains,
            maxAliasesPerBox: catalog.entitlements.maxAliasesPerBox,
            entitlements: catalog.entitlements,
          },
        });
    }
  }

  async listPlans(): Promise<PlanRecord[]> {
    const rows = await this.db.select().from(subscriptionPlans);
    return rows.map(mapPlan);
  }

  async findPlanByTier(tier: PlanTier): Promise<PlanRecord | null> {
    const rows = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.tier, tier))
      .limit(1);
    return rows[0] ? mapPlan(rows[0]) : null;
  }

  async findPlanById(id: string): Promise<PlanRecord | null> {
    const rows = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .limit(1);
    return rows[0] ? mapPlan(rows[0]) : null;
  }

  async signup(input: SignupWrite): Promise<'ok' | 'duplicate_slug' | 'duplicate_email'> {
    const slug = await this.sql`select id from app_lookup_org_by_slug(${input.org.slug})`;
    if (slug.length > 0) return 'duplicate_slug';
    const email = await this.sql`select id from app_lookup_user_by_email(${input.user.email})`;
    if (email.length > 0) return 'duplicate_email';
    await this.sql.begin(async (tx) => {
      await tx`
        insert into organizations (
          id, name, slug, stalwart_tenant_id, data_residency_region, enforce_mfa, sso_enabled,
          status, sending_paused, gstin, place_of_supply, created_at, updated_at
        ) values (
          ${input.org.id}, ${input.org.name}, ${input.org.slug}, ${input.org.stalwartTenantId},
          ${input.org.dataResidencyRegion}, ${input.org.enforceMfa}, ${input.org.ssoEnabled},
          ${input.org.status}, ${input.org.sendingPaused}, ${input.org.gstin}, ${input.org.placeOfSupply},
          ${stamp(input.org.createdAt)}, ${stamp(input.org.updatedAt)}
        )
      `;
      await tx`select set_config('app.current_org_id', ${input.org.id}, true)`;
      await insertUserTx(tx as unknown as Sql, input.user);
      await tx`
        insert into org_subscriptions (
          id, organization_id, plan_id, status, cycle, currency, seat_limit, extra_storage_gb,
          payment_gateway, gateway_customer_id, gateway_sub_id, current_period_start,
          current_period_end, paid_at, limit_overrides, created_at, updated_at
        ) values (
          ${input.subscription.id}, ${input.subscription.organizationId}, ${input.subscription.planId},
          ${input.subscription.status}::subscription_status, ${input.subscription.cycle}::billing_cycle,
          ${input.subscription.currency}, ${input.subscription.seatLimit}, ${input.subscription.extraStorageGb},
          ${input.subscription.paymentGateway}, ${input.subscription.gatewayCustomerId},
          ${input.subscription.gatewaySubId}, ${stamp(input.subscription.currentPeriodStart)},
          ${stamp(input.subscription.currentPeriodEnd)}, ${stamp(input.subscription.paidAt)},
          ${JSON.stringify(input.subscription.limitOverrides)}::jsonb, ${stamp(input.subscription.createdAt)},
          ${stamp(input.subscription.updatedAt)}
        )
      `;
      await insertAuditTx(tx as unknown as Sql, input.audit);
    });
    return 'ok';
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const rows = await this.sql`select * from app_lookup_user_by_email(${email})`;
    const row = asRow(rows[0]);
    return row ? mapUser(row) : null;
  }

  async findUser(organizationId: string, userId: string): Promise<UserRecord | null> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from users where id = ${userId}`,
    );
    const row = asRow(rows[0]);
    return row ? mapUser(row) : null;
  }

  async listUsers(organizationId: string): Promise<UserRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from users where deleted_at is null order by created_at`,
    );
    return rows.map((item) => mapUser(asRow(item) as Row));
  }

  async insertUser(user: UserRecord): Promise<'ok' | 'duplicate_email'> {
    try {
      await this.inOrg(user.organizationId, (tx) => insertUserTx(tx, user));
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate_email';
      throw error;
    }
  }

  async updateUser(
    organizationId: string,
    userId: string,
    patch: UserPatch,
  ): Promise<UserRecord | null> {
    const current = await this.findUser(organizationId, userId);
    if (!current) return null;
    const next: UserRecord = { ...current, ...defined(patch), updatedAt: new Date() };
    await this.inOrg(
      organizationId,
      (tx) => tx`
      update users set
        full_name = ${next.fullName},
        role = ${next.role}::org_role,
        password_hash = ${next.passwordHash},
        pepper_version = ${next.pepperVersion},
        totp_secret_enc = ${next.totpSecretEnc},
        totp_secret_iv = ${next.totpSecretIv},
        mfa_enabled = ${next.mfaEnabled},
        is_active = ${next.isActive},
        deleted_at = ${stamp(next.deletedAt)},
        last_login_at = ${stamp(next.lastLoginAt)},
        updated_at = ${stamp(next.updatedAt)}
      where id = ${userId}
    `,
    );
    return next;
  }

  async countActiveUsers(organizationId: string): Promise<number> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`select count(*)::int as count from users where is_active = true and deleted_at is null`,
    );
    return num(asRow(rows[0]) as Row, 'count');
  }

  async findOrgBySlug(slug: string): Promise<OrgRecord | null> {
    const rows = await this.sql`select * from app_lookup_org_by_slug(${slug})`;
    const row = asRow(rows[0]);
    return row ? mapOrg(row) : null;
  }

  async findOrg(organizationId: string): Promise<OrgRecord | null> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from organizations where id = ${organizationId}`,
    );
    const row = asRow(rows[0]);
    return row ? mapOrg(row) : null;
  }

  async updateOrg(organizationId: string, patch: Partial<OrgRecord>): Promise<OrgRecord | null> {
    const current = await this.findOrg(organizationId);
    if (!current) return null;
    const next = { ...current, ...defined(patch), updatedAt: new Date() };
    await this.inOrg(
      organizationId,
      (tx) => tx`
      update organizations set
        name = ${next.name}, slug = ${next.slug}, enforce_mfa = ${next.enforceMfa},
        status = ${next.status}, sending_paused = ${next.sendingPaused},
        gstin = ${next.gstin}, place_of_supply = ${next.placeOfSupply}, updated_at = ${stamp(next.updatedAt)}
      where id = ${organizationId}
    `,
    );
    return next;
  }

  async findSubscription(organizationId: string): Promise<SubscriptionRecord | null> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from org_subscriptions where organization_id = ${organizationId}`,
    );
    const row = asRow(rows[0]);
    return row ? mapSubscription(row) : null;
  }

  async updateSubscription(
    organizationId: string,
    patch: Partial<SubscriptionRecord>,
  ): Promise<SubscriptionRecord | null> {
    const current = await this.findSubscription(organizationId);
    if (!current) return null;
    const next = { ...current, ...defined(patch), updatedAt: new Date() };
    await this.inOrg(
      organizationId,
      (tx) => tx`
      update org_subscriptions set
        plan_id = ${next.planId},
        status = ${next.status}::subscription_status,
        cycle = ${next.cycle}::billing_cycle,
        seat_limit = ${next.seatLimit},
        gateway_customer_id = ${next.gatewayCustomerId},
        gateway_sub_id = ${next.gatewaySubId},
        current_period_start = ${stamp(next.currentPeriodStart)},
        current_period_end = ${stamp(next.currentPeriodEnd)},
        paid_at = ${stamp(next.paidAt)},
        limit_overrides = ${JSON.stringify(next.limitOverrides)}::jsonb,
        updated_at = ${stamp(next.updatedAt)}
      where organization_id = ${organizationId}
    `,
    );
    return next;
  }

  async insertRefresh(row: RefreshRecord): Promise<void> {
    await this.inOrg(
      row.organizationId,
      (tx) => tx`
      insert into refresh_tokens (
        id, user_id, organization_id, token_hash, family_id, device_label, platform,
        ip_address, expires_at, revoked_at, created_at
      ) values (
        ${row.id}, ${row.userId}, ${row.organizationId}, ${row.tokenHash}, ${row.familyId},
        ${row.deviceLabel}, ${row.platform}, ${row.ipAddress}, ${stamp(row.expiresAt)}, ${stamp(row.revokedAt)},
        ${stamp(row.createdAt)}
      )
    `,
    );
  }

  async findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null> {
    const rows = await this.sql`select * from app_lookup_refresh_by_hash(${tokenHash})`;
    const row = asRow(rows[0]);
    if (!row) return null;
    return {
      id: text(row, 'id'),
      userId: text(row, 'user_id'),
      organizationId: text(row, 'organization_id'),
      tokenHash: text(row, 'token_hash'),
      familyId: text(row, 'family_id'),
      deviceLabel: textOrNull(row, 'device_label'),
      platform: textOrNull(row, 'platform') as RefreshRecord['platform'],
      ipAddress: textOrNull(row, 'ip_address'),
      expiresAt: when(row, 'expires_at'),
      revokedAt: whenOrNull(row, 'revoked_at'),
      createdAt: when(row, 'created_at'),
    };
  }

  async revokeRefresh(organizationId: string, id: string, at: Date): Promise<void> {
    await this.inOrg(
      organizationId,
      (tx) =>
        tx`update refresh_tokens set revoked_at = ${at} where id = ${id} and revoked_at is null`,
    );
  }

  async revokeRefreshFamily(organizationId: string, familyId: string, at: Date): Promise<void> {
    await this.inOrg(
      organizationId,
      (tx) =>
        tx`update refresh_tokens set revoked_at = ${at} where family_id = ${familyId} and revoked_at is null`,
    );
  }

  async revokeAllRefreshForUser(organizationId: string, userId: string, at: Date): Promise<void> {
    await this.inOrg(
      organizationId,
      (tx) =>
        tx`update refresh_tokens set revoked_at = ${at} where user_id = ${userId} and revoked_at is null`,
    );
  }

  async listRefreshForUser(organizationId: string, userId: string): Promise<RefreshRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`select * from refresh_tokens where user_id = ${userId} and revoked_at is null order by created_at desc`,
    );
    const mapped: RefreshRecord[] = [];
    for (const item of rows) {
      const parsed = await this.findRefreshByHash(text(asRow(item) as Row, 'token_hash'));
      if (parsed) mapped.push(parsed);
    }
    return mapped;
  }

  async insertReset(row: ResetRecord): Promise<void> {
    await this.inOrg(
      row.organizationId,
      (tx) => tx`
      insert into password_reset_tokens (
        id, organization_id, user_id, token_hash, expires_at, used_at, created_at
      ) values (
        ${row.id}, ${row.organizationId}, ${row.userId}, ${row.tokenHash}, ${stamp(row.expiresAt)},
        ${stamp(row.usedAt)}, ${stamp(row.createdAt)}
      )
    `,
    );
  }

  async findResetByHash(tokenHash: string): Promise<ResetRecord | null> {
    const rows = await this.sql`select * from app_lookup_reset_by_hash(${tokenHash})`;
    const row = asRow(rows[0]);
    if (!row) return null;
    return {
      id: text(row, 'id'),
      organizationId: text(row, 'organization_id'),
      userId: text(row, 'user_id'),
      tokenHash: text(row, 'token_hash'),
      expiresAt: when(row, 'expires_at'),
      usedAt: whenOrNull(row, 'used_at'),
      createdAt: when(row, 'created_at'),
    };
  }

  async markResetUsed(organizationId: string, id: string, at: Date): Promise<void> {
    await this.inOrg(
      organizationId,
      (tx) => tx`update password_reset_tokens set used_at = ${at} where id = ${id}`,
    );
  }

  async insertPasskey(row: PasskeyRecord): Promise<'ok' | 'duplicate'> {
    try {
      await this.inOrg(
        row.organizationId,
        (tx) => tx`
        insert into webauthn_passkeys (
          id, user_id, organization_id, credential_id, public_key, sign_count, transports, label, created_at
        ) values (
          ${row.id}, ${row.userId}, ${row.organizationId}, ${row.credentialId}, ${row.publicKey},
          ${row.signCount}, ${row.transports}, ${row.label}, ${row.createdAt}
        )
      `,
      );
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate';
      throw error;
    }
  }

  async listPasskeys(organizationId: string, userId: string): Promise<PasskeyRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from webauthn_passkeys where user_id = ${userId}`,
    );
    return rows.map((item) => mapPasskey(asRow(item) as Row));
  }

  async findPasskey(credentialId: string): Promise<PasskeyRecord | null> {
    const rows = await this.sql`select * from app_lookup_passkey(${credentialId})`;
    const row = asRow(rows[0]);
    return row ? mapPasskey(row) : null;
  }

  async updatePasskeyCounter(organizationId: string, id: string, signCount: number): Promise<void> {
    await this.inOrg(
      organizationId,
      (tx) => tx`update webauthn_passkeys set sign_count = ${signCount} where id = ${id}`,
    );
  }

  async findDomainByName(name: string): Promise<DomainRecord | null> {
    const rows = await this.sql`select * from app_lookup_domain_by_name(${name})`;
    const row = asRow(rows[0]);
    return row ? mapDomain(row) : null;
  }

  async insertDomain(domain: DomainRecord, dkim: DkimRecord): Promise<'ok' | 'duplicate'> {
    try {
      await this.inOrg(domain.organizationId, async (tx) => {
        await tx`
          insert into domains (
            id, organization_id, domain_name, verification_txt, is_verified, mx_verified, spf_verified,
            dkim_verified, dmarc_verified, mta_sts_enabled, dane_enabled, deliverability_score,
            catch_all_mailbox_id, last_dns_checked_at, created_at
          ) values (
            ${domain.id}, ${domain.organizationId}, ${domain.domainName}, ${domain.verificationTxt},
            ${domain.isVerified}, ${domain.mxVerified}, ${domain.spfVerified}, ${domain.dkimVerified},
            ${domain.dmarcVerified}, ${domain.mtaStsEnabled}, ${domain.daneEnabled},
            ${domain.deliverabilityScore}, ${domain.catchAllMailboxId}, ${stamp(domain.lastDnsCheckedAt)},
            ${stamp(domain.createdAt)}
          )
        `;
        await tx`
          insert into domain_dkim_keys (
            id, domain_id, organization_id, selector, algorithm, public_key_dns, private_key_enc,
            private_key_iv, is_active, rotate_after, created_at
          ) values (
            ${dkim.id}, ${dkim.domainId}, ${dkim.organizationId}, ${dkim.selector}, ${dkim.algorithm},
            ${dkim.publicKeyDns}, ${dkim.privateKeyEnc}, ${dkim.privateKeyIv}, ${dkim.isActive},
            ${stamp(dkim.rotateAfter)}, ${stamp(dkim.createdAt)}
          )
        `;
      });
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate';
      throw error;
    }
  }

  async listDomains(organizationId: string): Promise<DomainRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from domains order by created_at`,
    );
    return rows.map((item) => mapDomain(asRow(item) as Row));
  }

  async findDomain(organizationId: string, id: string): Promise<DomainRecord | null> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from domains where id = ${id}`,
    );
    const row = asRow(rows[0]);
    return row ? mapDomain(row) : null;
  }

  async updateDomain(
    organizationId: string,
    id: string,
    patch: Partial<DomainRecord>,
  ): Promise<DomainRecord | null> {
    const current = await this.findDomain(organizationId, id);
    if (!current) return null;
    const next = { ...current, ...defined(patch) };
    await this.inOrg(
      organizationId,
      (tx) => tx`
      update domains set
        is_verified = ${next.isVerified}, mx_verified = ${next.mxVerified},
        spf_verified = ${next.spfVerified}, dkim_verified = ${next.dkimVerified},
        dmarc_verified = ${next.dmarcVerified}, mta_sts_enabled = ${next.mtaStsEnabled},
        deliverability_score = ${next.deliverabilityScore},
        catch_all_mailbox_id = ${next.catchAllMailboxId},
        last_dns_checked_at = ${next.lastDnsCheckedAt}
      where id = ${id}
    `,
    );
    return next;
  }

  async countDomains(organizationId: string): Promise<number> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select count(*)::int as count from domains`,
    );
    return num(asRow(rows[0]) as Row, 'count');
  }

  async listDkim(organizationId: string, domainId: string): Promise<DkimRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from domain_dkim_keys where domain_id = ${domainId}`,
    );
    return rows.map((item) => {
      const row = asRow(item) as Row;
      return {
        id: text(row, 'id'),
        domainId: text(row, 'domain_id'),
        organizationId: text(row, 'organization_id'),
        selector: text(row, 'selector'),
        algorithm: text(row, 'algorithm') as DkimRecord['algorithm'],
        publicKeyDns: text(row, 'public_key_dns'),
        privateKeyEnc: bytes(row, 'private_key_enc') as Buffer,
        privateKeyIv: bytes(row, 'private_key_iv') as Buffer,
        isActive: flag(row, 'is_active'),
        rotateAfter: when(row, 'rotate_after'),
        createdAt: when(row, 'created_at'),
      };
    });
  }

  async insertMailbox(row: MailboxRecord): Promise<'ok' | 'duplicate'> {
    try {
      await this.inOrg(
        row.organizationId,
        (tx) => tx`
        insert into mailboxes (
          id, organization_id, domain_id, user_id, kind, address, stalwart_principal_id,
          quota_bytes, used_bytes, archive_auto_expand, created_at
        ) values (
          ${row.id}, ${row.organizationId}, ${row.domainId}, ${row.userId}, ${row.kind}::mailbox_kind,
          ${row.address}, ${row.stalwartPrincipalId}, ${row.quotaBytes}, ${row.usedBytes},
          ${row.archiveAutoExpand}, ${stamp(row.createdAt)}
        )
      `,
      );
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate';
      throw error;
    }
  }

  async listMailboxes(organizationId: string): Promise<MailboxRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from mailboxes order by created_at`,
    );
    return rows.map((item) => mapMailbox(asRow(item) as Row));
  }

  async findMailbox(organizationId: string, id: string): Promise<MailboxRecord | null> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from mailboxes where id = ${id}`,
    );
    const row = asRow(rows[0]);
    return row ? mapMailbox(row) : null;
  }

  async findMailboxByAddress(address: string): Promise<MailboxRecord | null> {
    const rows = await this.sql`
      select * from mailboxes where address = ${address}
    `;
    const row = asRow(rows[0]);
    return row ? mapMailbox(row) : null;
  }

  async countMailboxesByKind(organizationId: string, kind: MailboxKind): Promise<number> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select count(*)::int as count from mailboxes where kind = ${kind}::mailbox_kind`,
    );
    return num(asRow(rows[0]) as Row, 'count');
  }

  async insertAlias(row: AliasRecord): Promise<'ok' | 'duplicate'> {
    try {
      await this.inOrg(
        row.organizationId,
        (tx) => tx`
        insert into mailbox_aliases (
          id, organization_id, mailbox_id, domain_id, alias_address, is_disposable_masked,
          label, is_active, created_at
        ) values (
          ${row.id}, ${row.organizationId}, ${row.mailboxId}, ${row.domainId}, ${row.aliasAddress},
          ${row.isDisposableMasked}, ${row.label}, ${row.isActive}, ${row.createdAt}
        )
      `,
      );
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate';
      throw error;
    }
  }

  async listAliases(organizationId: string, mailboxId: string): Promise<AliasRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from mailbox_aliases where mailbox_id = ${mailboxId}`,
    );
    return rows.map((item) => mapAlias(asRow(item) as Row));
  }

  async listAliasesForOrg(organizationId: string): Promise<AliasRecord[]> {
    const rows = await this.inOrg(organizationId, (tx) => tx`select * from mailbox_aliases`);
    return rows.map((item) => mapAlias(asRow(item) as Row));
  }

  async deleteAlias(organizationId: string, mailboxId: string, aliasId: string): Promise<boolean> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`delete from mailbox_aliases where id = ${aliasId} and mailbox_id = ${mailboxId} returning id`,
    );
    return rows.length > 0;
  }

  async countAliases(organizationId: string, mailboxId: string): Promise<number> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`select count(*)::int as count from mailbox_aliases where mailbox_id = ${mailboxId} and is_active = true`,
    );
    return num(asRow(rows[0]) as Row, 'count');
  }

  async insertDelegation(row: DelegationRecord): Promise<'ok' | 'duplicate'> {
    try {
      await this.inOrg(
        row.organizationId,
        (tx) => tx`
        insert into mailbox_delegations (
          id, organization_id, mailbox_id, delegate_user_id, can_read, can_send_as,
          can_send_on_behalf, created_at
        ) values (
          ${row.id}, ${row.organizationId}, ${row.mailboxId}, ${row.delegateUserId}, ${row.canRead},
          ${row.canSendAs}, ${row.canSendOnBehalf}, ${row.createdAt}
        )
      `,
      );
      return 'ok';
    } catch (error) {
      if (isUnique(error)) return 'duplicate';
      throw error;
    }
  }

  async listDelegationsForUser(
    organizationId: string,
    userId: string,
  ): Promise<DelegationRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from mailbox_delegations where delegate_user_id = ${userId}`,
    );
    return rows.map((item) => {
      const row = asRow(item) as Row;
      return {
        id: text(row, 'id'),
        organizationId: text(row, 'organization_id'),
        mailboxId: text(row, 'mailbox_id'),
        delegateUserId: text(row, 'delegate_user_id'),
        canRead: flag(row, 'can_read'),
        canSendAs: flag(row, 'can_send_as'),
        canSendOnBehalf: flag(row, 'can_send_on_behalf'),
        createdAt: when(row, 'created_at'),
      };
    });
  }

  async insertAudit(row: AuditRecord): Promise<void> {
    await this.inOrg(row.organizationId, (tx) => insertAuditTx(tx, row));
  }

  async listAudit(organizationId: string, since: Date): Promise<AuditRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`select * from audit_logs where created_at >= ${since} order by created_at desc limit 200`,
    );
    return rows.map((item) => {
      const row = asRow(item) as Row;
      return {
        id: text(row, 'id'),
        organizationId: text(row, 'organization_id'),
        actorUserId: textOrNull(row, 'actor_user_id'),
        requestId: text(row, 'request_id'),
        action: text(row, 'action'),
        targetType: text(row, 'target_type'),
        targetId: textOrNull(row, 'target_id'),
        ipAddress: textOrNull(row, 'ip_address'),
        metadata: jsonObject(row, 'metadata'),
        createdAt: when(row, 'created_at'),
      };
    });
  }

  async reserveSend(input: SendReservation): Promise<SendReservationResult> {
    return this.inOrg(input.organizationId, async (tx) => {
      const dailyRows = await tx`
        select messages_sent, recipients_total, recipients_external
        from sending_daily
        where organization_id = ${input.organizationId}
          and user_id = ${input.userId}
          and day = ${input.day}
      `;
      const minuteRows = await tx`
        select messages_sent from sending_minute
        where organization_id = ${input.organizationId}
          and user_id = ${input.userId}
          and minute_bucket = ${input.minute}
      `;
      const externalRows = await tx`
        select coalesce(sum(recipients_external), 0)::int as external
        from sending_daily
        where organization_id = ${input.organizationId} and day = ${input.day}
      `;
      const daily = asRow(dailyRows[0]);
      const minute = asRow(minuteRows[0]);
      const messages = daily ? num(daily, 'messages_sent') : 0;
      const recipients = daily ? num(daily, 'recipients_total') : 0;
      const minuteCount = minute ? num(minute, 'messages_sent') : 0;
      const tenantExternal = num(asRow(externalRows[0]) as Row, 'external');
      if (!underLimit(minuteCount, input.addMessages, input.maxPerMinute)) {
        return { ok: false as const, reason: 'minute' as const };
      }
      if (!underLimit(messages, input.addMessages, input.maxMessagesPerDay)) {
        return { ok: false as const, reason: 'messages' as const };
      }
      if (!underLimit(recipients, input.addRecipients, input.maxRecipientsPerDay)) {
        return { ok: false as const, reason: 'recipients' as const };
      }
      if (!underLimit(tenantExternal, input.addExternal, input.maxExternalPerDay)) {
        return { ok: false as const, reason: 'external' as const };
      }
      await tx`
        insert into sending_daily (
          organization_id, user_id, day, messages_sent, recipients_total, recipients_external
        ) values (
          ${input.organizationId}, ${input.userId}, ${input.day}, ${input.addMessages},
          ${input.addRecipients}, ${input.addExternal}
        )
        on conflict (organization_id, user_id, day) do update set
          messages_sent = sending_daily.messages_sent + excluded.messages_sent,
          recipients_total = sending_daily.recipients_total + excluded.recipients_total,
          recipients_external = sending_daily.recipients_external + excluded.recipients_external
      `;
      await tx`
        insert into sending_minute (organization_id, user_id, minute_bucket, messages_sent)
        values (${input.organizationId}, ${input.userId}, ${input.minute}, ${input.addMessages})
        on conflict (organization_id, user_id, minute_bucket) do update set
          messages_sent = sending_minute.messages_sent + excluded.messages_sent
      `;
      return {
        ok: true as const,
        usage: {
          messages: messages + input.addMessages,
          recipients: recipients + input.addRecipients,
          external: tenantExternal + input.addExternal,
          minute: minuteCount + input.addMessages,
        },
      };
    });
  }

  async insertCheckout(row: CheckoutRecord): Promise<void> {
    await this.inOrg(
      row.organizationId,
      (tx) => tx`
      insert into billing_checkouts (
        id, organization_id, tier, cycle, seats, amount_paise, gstin, place_of_supply, status, created_at
      ) values (
        ${row.id}, ${row.organizationId}, ${row.tier}::plan_tier, ${row.cycle}::billing_cycle,
        ${row.seats}, ${row.amountPaise}, ${row.gstin}, ${row.placeOfSupply}, ${row.status}, ${stamp(row.createdAt)}
      )
    `,
    );
  }

  async findCheckout(id: string): Promise<CheckoutRecord | null> {
    const rows = await this.sql`select * from app_lookup_checkout(${id})`;
    const row = asRow(rows[0]);
    if (!row) return null;
    return {
      id: text(row, 'id'),
      organizationId: text(row, 'organization_id'),
      tier: text(row, 'tier') as PlanTier,
      cycle: text(row, 'cycle') as CheckoutRecord['cycle'],
      seats: num(row, 'seats'),
      amountPaise: num(row, 'amount_paise'),
      gstin: textOrNull(row, 'gstin'),
      placeOfSupply: text(row, 'place_of_supply'),
      status: text(row, 'status') as CheckoutRecord['status'],
      createdAt: when(row, 'created_at'),
    };
  }

  async updateCheckout(
    organizationId: string,
    id: string,
    patch: Partial<CheckoutRecord>,
  ): Promise<CheckoutRecord | null> {
    const current = await this.findCheckout(id);
    if (!current || current.organizationId !== organizationId) return null;
    const next = { ...current, ...defined(patch) };
    await this.inOrg(
      organizationId,
      (tx) => tx`
      update billing_checkouts set status = ${next.status} where id = ${id}
    `,
    );
    return next;
  }

  async insertInvoice(row: InvoiceRecord): Promise<void> {
    await this.inOrg(
      row.organizationId,
      (tx) => tx`
      insert into gst_invoices (
        id, organization_id, checkout_id, invoice_number, gstin, place_of_supply, taxable_paise,
        cgst_paise, sgst_paise, igst_paise, total_paise, sac_code, created_at
      ) values (
        ${row.id}, ${row.organizationId}, ${row.checkoutId}, ${row.invoiceNumber}, ${row.gstin},
        ${row.placeOfSupply}, ${row.taxablePaise}, ${row.cgstPaise}, ${row.sgstPaise}, ${row.igstPaise},
        ${row.totalPaise}, ${row.sacCode}, ${stamp(row.createdAt)}
      )
    `,
    );
  }

  async listInvoices(organizationId: string): Promise<InvoiceRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from gst_invoices order by created_at`,
    );
    return rows.map((item) => mapInvoice(asRow(item) as Row));
  }

  async countInvoices(organizationId: string): Promise<number> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select count(*)::int as count from gst_invoices`,
    );
    return num(asRow(rows[0]) as Row, 'count');
  }

  async insertAppPassword(row: AppPasswordRecord): Promise<void> {
    await this.inOrg(
      row.organizationId,
      (tx) => tx`
      insert into app_passwords (
        id, organization_id, mailbox_id, user_id, label, password_hash, pepper_version, revoked_at, created_at
      ) values (
        ${row.id}, ${row.organizationId}, ${row.mailboxId}, ${row.userId}, ${row.label},
        ${row.passwordHash}, ${row.pepperVersion}, ${row.revokedAt}, ${row.createdAt}
      )
    `,
    );
  }

  async listAppPasswords(organizationId: string, mailboxId: string): Promise<AppPasswordRecord[]> {
    const rows = await this.inOrg(
      organizationId,
      (tx) => tx`select * from app_passwords where mailbox_id = ${mailboxId}`,
    );
    return rows.map((item) => {
      const row = asRow(item) as Row;
      return {
        id: text(row, 'id'),
        organizationId: text(row, 'organization_id'),
        mailboxId: text(row, 'mailbox_id'),
        userId: text(row, 'user_id'),
        label: text(row, 'label'),
        passwordHash: text(row, 'password_hash'),
        pepperVersion: num(row, 'pepper_version'),
        revokedAt: whenOrNull(row, 'revoked_at'),
        createdAt: when(row, 'created_at'),
      };
    });
  }

  async revokeAppPassword(
    organizationId: string,
    mailboxId: string,
    id: string,
    at: Date,
  ): Promise<boolean> {
    const rows = await this.inOrg(
      organizationId,
      (tx) =>
        tx`update app_passwords set revoked_at = ${at} where id = ${id} and mailbox_id = ${mailboxId} returning id`,
    );
    return rows.length > 0;
  }
}

function defined<T extends object>(patch: Partial<T>): Partial<T> {
  const next: Partial<T> = {};
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

function mapPasskey(row: Row): PasskeyRecord {
  const transports = row.transports;
  return {
    id: text(row, 'id'),
    userId: text(row, 'user_id'),
    organizationId: text(row, 'organization_id'),
    credentialId: text(row, 'credential_id'),
    publicKey: bytes(row, 'public_key') as Buffer,
    signCount: num(row, 'sign_count'),
    transports: Array.isArray(transports) ? transports.map(String) : [],
    label: text(row, 'label'),
    createdAt: when(row, 'created_at'),
  };
}

function mapAlias(row: Row): AliasRecord {
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    mailboxId: text(row, 'mailbox_id'),
    domainId: text(row, 'domain_id'),
    aliasAddress: text(row, 'alias_address'),
    isDisposableMasked: flag(row, 'is_disposable_masked'),
    label: textOrNull(row, 'label'),
    isActive: flag(row, 'is_active'),
    createdAt: when(row, 'created_at'),
  };
}

function mapInvoice(row: Row): InvoiceRecord {
  return {
    id: text(row, 'id'),
    organizationId: text(row, 'organization_id'),
    checkoutId: text(row, 'checkout_id'),
    invoiceNumber: text(row, 'invoice_number'),
    gstin: textOrNull(row, 'gstin'),
    placeOfSupply: text(row, 'place_of_supply'),
    taxablePaise: num(row, 'taxable_paise'),
    cgstPaise: num(row, 'cgst_paise'),
    sgstPaise: num(row, 'sgst_paise'),
    igstPaise: num(row, 'igst_paise'),
    totalPaise: num(row, 'total_paise'),
    sacCode: text(row, 'sac_code'),
    createdAt: when(row, 'created_at'),
  };
}

function stamp(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

async function insertUserTx(tx: Sql, user: UserRecord): Promise<unknown> {
  return tx`
    insert into users (
      id, organization_id, email, full_name, role, password_hash, pepper_version,
      totp_secret_enc, totp_secret_iv, mfa_enabled, is_active, deleted_at, last_login_at,
      created_at, updated_at
    ) values (
      ${user.id}, ${user.organizationId}, ${user.email}, ${user.fullName}, ${user.role}::org_role,
      ${user.passwordHash}, ${user.pepperVersion}, ${user.totpSecretEnc}, ${user.totpSecretIv},
      ${user.mfaEnabled}, ${user.isActive}, ${stamp(user.deletedAt)}, ${stamp(user.lastLoginAt)},
      ${stamp(user.createdAt)}, ${stamp(user.updatedAt)}
    )
  `;
}

async function insertAuditTx(tx: Sql, row: AuditRecord): Promise<unknown> {
  return tx`
    insert into audit_logs (
      id, organization_id, actor_user_id, request_id, action, target_type, target_id,
      ip_address, metadata, created_at
    ) values (
      ${row.id}, ${row.organizationId}, ${row.actorUserId}, ${row.requestId}, ${row.action},
      ${row.targetType}, ${row.targetId}, ${row.ipAddress}, ${JSON.stringify(row.metadata)}::jsonb, ${stamp(row.createdAt)}
    )
  `;
}

export async function createPostgresStore(url: string): Promise<PostgresStore> {
  if (!url)
    throw new Error('APP_DATABASE_URL or DATABASE_URL is required when CONTROL_STORE=postgres');
  const sql = postgres(url, { max: 10 });
  const db = drizzle(sql, { schema: { subscriptionPlans } });
  return new PostgresStore(sql, db);
}
