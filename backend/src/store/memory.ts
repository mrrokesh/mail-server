import crypto from 'node:crypto';
import { PLAN_TIERS, type PlanTier } from '@mrrokesh/shared';
import { PLAN_CATALOG } from '../billing/entitlements';
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
  PasskeyRecord,
  PlanRecord,
  RefreshRecord,
  ResetRecord,
  SendReservation,
  SendReservationResult,
  SignupWrite,
  SubscriptionRecord,
  UserPatch,
  UserRecord,
} from './types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assignDefined<T extends object>(row: T, patch: Partial<T>): void {
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) row[key] = value;
  }
}

function underLimit(current: number, add: number, max: number): boolean {
  if (max < 0) return true;
  return current + add <= max;
}

export class MemoryStore implements ControlStore {
  private readonly plans = new Map<string, PlanRecord>();
  private readonly orgs = new Map<string, OrgRecord>();
  private readonly subscriptions = new Map<string, SubscriptionRecord>();
  private readonly users = new Map<string, UserRecord>();
  private readonly refreshes = new Map<string, RefreshRecord>();
  private readonly resets = new Map<string, ResetRecord>();
  private readonly passkeys = new Map<string, PasskeyRecord>();
  private readonly domains = new Map<string, DomainRecord>();
  private readonly dkim = new Map<string, DkimRecord>();
  private readonly mailboxes = new Map<string, MailboxRecord>();
  private readonly aliases = new Map<string, AliasRecord>();
  private readonly delegations = new Map<string, DelegationRecord>();
  private readonly audits: AuditRecord[] = [];
  private readonly checkouts = new Map<string, CheckoutRecord>();
  private readonly invoices = new Map<string, InvoiceRecord>();
  private readonly appPasswords = new Map<string, AppPasswordRecord>();
  private readonly daily = new Map<
    string,
    { messages: number; recipients: number; external: number }
  >();
  private readonly minute = new Map<string, number>();

  constructor() {
    void this.seedPlans();
  }

  async seedPlans(): Promise<void> {
    for (const tier of PLAN_TIERS) {
      if ([...this.plans.values()].some((plan) => plan.tier === tier)) continue;
      const catalog = PLAN_CATALOG[tier];
      const plan: PlanRecord = {
        id: crypto.randomUUID(),
        tier,
        displayName: catalog.displayName,
        priceInrMonthlyPaise: catalog.priceInrMonthlyPaise,
        priceInrAnnualPaise: catalog.priceInrAnnualPaise,
        priceUsdMonthlyCents: 0,
        priceUsdAnnualCents: 0,
        storageGbPerSeat: catalog.entitlements.storageGbPerSeat,
        isStoragePooled: catalog.isStoragePooled,
        maxDomains: catalog.entitlements.maxDomains,
        maxAliasesPerBox: catalog.entitlements.maxAliasesPerBox,
        entitlements: catalog.entitlements,
        createdAt: new Date(),
      };
      this.plans.set(plan.id, plan);
    }
  }

  async listPlans(): Promise<PlanRecord[]> {
    return [...this.plans.values()].map((plan) => clone(plan));
  }

  async findPlanByTier(tier: PlanTier): Promise<PlanRecord | null> {
    const plan = [...this.plans.values()].find((item) => item.tier === tier);
    return plan ? clone(plan) : null;
  }

  async findPlanById(id: string): Promise<PlanRecord | null> {
    const plan = this.plans.get(id);
    return plan ? clone(plan) : null;
  }

  async signup(input: SignupWrite): Promise<'ok' | 'duplicate_slug' | 'duplicate_email'> {
    if (await this.findOrgBySlug(input.org.slug)) return 'duplicate_slug';
    if (await this.findUserByEmail(input.user.email)) return 'duplicate_email';
    this.orgs.set(input.org.id, clone(input.org));
    this.users.set(input.user.id, clone(input.user));
    this.subscriptions.set(input.subscription.organizationId, clone(input.subscription));
    this.audits.push(clone(input.audit));
    return 'ok';
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const user = [...this.users.values()].find((item) => item.email === email.toLowerCase());
    return user ? clone(user) : null;
  }

  async findUser(organizationId: string, userId: string): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user || user.organizationId !== organizationId) return null;
    return clone(user);
  }

  async listUsers(organizationId: string): Promise<UserRecord[]> {
    return [...this.users.values()]
      .filter((user) => user.organizationId === organizationId && user.deletedAt === null)
      .map((user) => clone(user));
  }

  async insertUser(user: UserRecord): Promise<'ok' | 'duplicate_email'> {
    if (await this.findUserByEmail(user.email)) return 'duplicate_email';
    this.users.set(user.id, clone(user));
    return 'ok';
  }

  async updateUser(
    organizationId: string,
    userId: string,
    patch: UserPatch,
  ): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user || user.organizationId !== organizationId) return null;
    assignDefined(user, patch);
    user.updatedAt = new Date();
    return clone(user);
  }

  async countActiveUsers(organizationId: string): Promise<number> {
    return [...this.users.values()].filter(
      (user) => user.organizationId === organizationId && user.isActive && user.deletedAt === null,
    ).length;
  }

  async findOrgBySlug(slug: string): Promise<OrgRecord | null> {
    const org = [...this.orgs.values()].find((item) => item.slug === slug.toLowerCase());
    return org ? clone(org) : null;
  }

  async findOrg(organizationId: string): Promise<OrgRecord | null> {
    const org = this.orgs.get(organizationId);
    return org ? clone(org) : null;
  }

  async updateOrg(organizationId: string, patch: Partial<OrgRecord>): Promise<OrgRecord | null> {
    const org = this.orgs.get(organizationId);
    if (!org) return null;
    assignDefined(org, patch);
    org.updatedAt = new Date();
    return clone(org);
  }

  async findSubscription(organizationId: string): Promise<SubscriptionRecord | null> {
    const row = this.subscriptions.get(organizationId);
    return row ? clone(row) : null;
  }

  async updateSubscription(
    organizationId: string,
    patch: Partial<SubscriptionRecord>,
  ): Promise<SubscriptionRecord | null> {
    const row = this.subscriptions.get(organizationId);
    if (!row) return null;
    assignDefined(row, patch);
    row.updatedAt = new Date();
    return clone(row);
  }

  async insertRefresh(row: RefreshRecord): Promise<void> {
    this.refreshes.set(row.id, clone(row));
  }

  async findRefreshByHash(tokenHash: string): Promise<RefreshRecord | null> {
    const row = [...this.refreshes.values()].find((item) => item.tokenHash === tokenHash);
    return row ? clone(row) : null;
  }

  async revokeRefresh(organizationId: string, id: string, at: Date): Promise<void> {
    const row = this.refreshes.get(id);
    if (!row || row.organizationId !== organizationId) return;
    row.revokedAt = at;
  }

  async revokeRefreshFamily(organizationId: string, familyId: string, at: Date): Promise<void> {
    for (const row of this.refreshes.values()) {
      if (row.organizationId === organizationId && row.familyId === familyId && !row.revokedAt) {
        row.revokedAt = at;
      }
    }
  }

  async revokeAllRefreshForUser(organizationId: string, userId: string, at: Date): Promise<void> {
    for (const row of this.refreshes.values()) {
      if (row.organizationId === organizationId && row.userId === userId && !row.revokedAt) {
        row.revokedAt = at;
      }
    }
  }

  async listRefreshForUser(organizationId: string, userId: string): Promise<RefreshRecord[]> {
    return [...this.refreshes.values()]
      .filter(
        (row) =>
          row.organizationId === organizationId && row.userId === userId && row.revokedAt === null,
      )
      .map((row) => clone(row));
  }

  async insertReset(row: ResetRecord): Promise<void> {
    this.resets.set(row.id, clone(row));
  }

  async findResetByHash(tokenHash: string): Promise<ResetRecord | null> {
    const row = [...this.resets.values()].find((item) => item.tokenHash === tokenHash);
    return row ? clone(row) : null;
  }

  async markResetUsed(organizationId: string, id: string, at: Date): Promise<void> {
    const row = this.resets.get(id);
    if (!row || row.organizationId !== organizationId) return;
    row.usedAt = at;
  }

  async insertPasskey(row: PasskeyRecord): Promise<'ok' | 'duplicate'> {
    if ([...this.passkeys.values()].some((item) => item.credentialId === row.credentialId)) {
      return 'duplicate';
    }
    this.passkeys.set(row.id, clone(row));
    return 'ok';
  }

  async listPasskeys(organizationId: string, userId: string): Promise<PasskeyRecord[]> {
    return [...this.passkeys.values()]
      .filter((row) => row.organizationId === organizationId && row.userId === userId)
      .map((row) => clone(row));
  }

  async findPasskey(credentialId: string): Promise<PasskeyRecord | null> {
    const row = [...this.passkeys.values()].find((item) => item.credentialId === credentialId);
    return row ? clone(row) : null;
  }

  async updatePasskeyCounter(organizationId: string, id: string, signCount: number): Promise<void> {
    const row = this.passkeys.get(id);
    if (!row || row.organizationId !== organizationId) return;
    row.signCount = signCount;
  }

  async findDomainByName(name: string): Promise<DomainRecord | null> {
    const row = [...this.domains.values()].find((item) => item.domainName === name.toLowerCase());
    return row ? clone(row) : null;
  }

  async insertDomain(domain: DomainRecord, dkim: DkimRecord): Promise<'ok' | 'duplicate'> {
    if (await this.findDomainByName(domain.domainName)) return 'duplicate';
    this.domains.set(domain.id, clone(domain));
    this.dkim.set(dkim.id, clone(dkim));
    return 'ok';
  }

  async listDomains(organizationId: string): Promise<DomainRecord[]> {
    return [...this.domains.values()]
      .filter((row) => row.organizationId === organizationId)
      .map((row) => clone(row));
  }

  async findDomain(organizationId: string, id: string): Promise<DomainRecord | null> {
    const row = this.domains.get(id);
    if (!row || row.organizationId !== organizationId) return null;
    return clone(row);
  }

  async updateDomain(
    organizationId: string,
    id: string,
    patch: Partial<DomainRecord>,
  ): Promise<DomainRecord | null> {
    const row = this.domains.get(id);
    if (!row || row.organizationId !== organizationId) return null;
    assignDefined(row, patch);
    return clone(row);
  }

  async countDomains(organizationId: string): Promise<number> {
    return [...this.domains.values()].filter((row) => row.organizationId === organizationId).length;
  }

  async listDkim(organizationId: string, domainId: string): Promise<DkimRecord[]> {
    return [...this.dkim.values()]
      .filter((row) => row.organizationId === organizationId && row.domainId === domainId)
      .map((row) => clone(row));
  }

  async insertMailbox(row: MailboxRecord): Promise<'ok' | 'duplicate'> {
    if (await this.findMailboxByAddress(row.address)) return 'duplicate';
    this.mailboxes.set(row.id, clone(row));
    return 'ok';
  }

  async listMailboxes(organizationId: string): Promise<MailboxRecord[]> {
    return [...this.mailboxes.values()]
      .filter((row) => row.organizationId === organizationId)
      .map((row) => clone(row));
  }

  async findMailbox(organizationId: string, id: string): Promise<MailboxRecord | null> {
    const row = this.mailboxes.get(id);
    if (!row || row.organizationId !== organizationId) return null;
    return clone(row);
  }

  async findMailboxByAddress(address: string): Promise<MailboxRecord | null> {
    const row = [...this.mailboxes.values()].find((item) => item.address === address.toLowerCase());
    return row ? clone(row) : null;
  }

  async countMailboxesByKind(organizationId: string, kind: MailboxKind): Promise<number> {
    return [...this.mailboxes.values()].filter(
      (row) => row.organizationId === organizationId && row.kind === kind,
    ).length;
  }

  async insertAlias(row: AliasRecord): Promise<'ok' | 'duplicate'> {
    const taken = [...this.aliases.values()].some(
      (item) => item.aliasAddress === row.aliasAddress.toLowerCase(),
    );
    if (taken || (await this.findMailboxByAddress(row.aliasAddress))) return 'duplicate';
    this.aliases.set(row.id, clone(row));
    return 'ok';
  }

  async listAliases(organizationId: string, mailboxId: string): Promise<AliasRecord[]> {
    return [...this.aliases.values()]
      .filter((row) => row.organizationId === organizationId && row.mailboxId === mailboxId)
      .map((row) => clone(row));
  }

  async listAliasesForOrg(organizationId: string): Promise<AliasRecord[]> {
    return [...this.aliases.values()]
      .filter((row) => row.organizationId === organizationId)
      .map((row) => clone(row));
  }

  async deleteAlias(organizationId: string, mailboxId: string, aliasId: string): Promise<boolean> {
    const row = this.aliases.get(aliasId);
    if (!row || row.organizationId !== organizationId || row.mailboxId !== mailboxId) return false;
    this.aliases.delete(aliasId);
    return true;
  }

  async countAliases(organizationId: string, mailboxId: string): Promise<number> {
    return [...this.aliases.values()].filter(
      (row) => row.organizationId === organizationId && row.mailboxId === mailboxId && row.isActive,
    ).length;
  }

  async insertDelegation(row: DelegationRecord): Promise<'ok' | 'duplicate'> {
    const exists = [...this.delegations.values()].some(
      (item) => item.mailboxId === row.mailboxId && item.delegateUserId === row.delegateUserId,
    );
    if (exists) return 'duplicate';
    this.delegations.set(row.id, clone(row));
    return 'ok';
  }

  async listDelegationsForUser(
    organizationId: string,
    userId: string,
  ): Promise<DelegationRecord[]> {
    return [...this.delegations.values()]
      .filter((row) => row.organizationId === organizationId && row.delegateUserId === userId)
      .map((row) => clone(row));
  }

  async insertAudit(row: AuditRecord): Promise<void> {
    this.audits.push(clone(row));
  }

  async listAudit(organizationId: string, since: Date): Promise<AuditRecord[]> {
    return this.audits
      .filter((row) => row.organizationId === organizationId && row.createdAt >= since)
      .map((row) => clone(row))
      .reverse();
  }

  async reserveSend(input: SendReservation): Promise<SendReservationResult> {
    const dayKey = `${input.organizationId}|${input.userId}|${input.day}`;
    const minuteKey = `${input.organizationId}|${input.userId}|${input.minute}`;
    const current = this.daily.get(dayKey) ?? { messages: 0, recipients: 0, external: 0 };
    const minuteCount = this.minute.get(minuteKey) ?? 0;
    let tenantExternal = 0;
    for (const [key, value] of this.daily) {
      const [org, , day] = key.split('|');
      if (org === input.organizationId && day === input.day) tenantExternal += value.external;
    }
    if (!underLimit(minuteCount, input.addMessages, input.maxPerMinute)) {
      return { ok: false, reason: 'minute' };
    }
    if (!underLimit(current.messages, input.addMessages, input.maxMessagesPerDay)) {
      return { ok: false, reason: 'messages' };
    }
    if (!underLimit(current.recipients, input.addRecipients, input.maxRecipientsPerDay)) {
      return { ok: false, reason: 'recipients' };
    }
    if (!underLimit(tenantExternal, input.addExternal, input.maxExternalPerDay)) {
      return { ok: false, reason: 'external' };
    }
    const next = {
      messages: current.messages + input.addMessages,
      recipients: current.recipients + input.addRecipients,
      external: current.external + input.addExternal,
    };
    this.daily.set(dayKey, next);
    this.minute.set(minuteKey, minuteCount + input.addMessages);
    return {
      ok: true,
      usage: { ...next, minute: minuteCount + input.addMessages },
    };
  }

  async insertCheckout(row: CheckoutRecord): Promise<void> {
    this.checkouts.set(row.id, clone(row));
  }

  async findCheckout(id: string): Promise<CheckoutRecord | null> {
    const row = this.checkouts.get(id);
    return row ? clone(row) : null;
  }

  async updateCheckout(
    organizationId: string,
    id: string,
    patch: Partial<CheckoutRecord>,
  ): Promise<CheckoutRecord | null> {
    const row = this.checkouts.get(id);
    if (!row || row.organizationId !== organizationId) return null;
    assignDefined(row, patch);
    return clone(row);
  }

  async insertInvoice(row: InvoiceRecord): Promise<void> {
    this.invoices.set(row.id, clone(row));
  }

  async listInvoices(organizationId: string): Promise<InvoiceRecord[]> {
    return [...this.invoices.values()]
      .filter((row) => row.organizationId === organizationId)
      .map((row) => clone(row));
  }

  async countInvoices(organizationId: string): Promise<number> {
    return [...this.invoices.values()].filter((row) => row.organizationId === organizationId)
      .length;
  }

  async insertAppPassword(row: AppPasswordRecord): Promise<void> {
    this.appPasswords.set(row.id, clone(row));
  }

  async listAppPasswords(organizationId: string, mailboxId: string): Promise<AppPasswordRecord[]> {
    return [...this.appPasswords.values()]
      .filter((row) => row.organizationId === organizationId && row.mailboxId === mailboxId)
      .map((row) => clone(row));
  }

  async revokeAppPassword(
    organizationId: string,
    mailboxId: string,
    id: string,
    at: Date,
  ): Promise<boolean> {
    const row = this.appPasswords.get(id);
    if (!row || row.organizationId !== organizationId || row.mailboxId !== mailboxId) return false;
    row.revokedAt = at;
    return true;
  }
}
