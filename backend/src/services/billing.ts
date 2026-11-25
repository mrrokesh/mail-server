import crypto from 'node:crypto';
import type { PlanTier } from '@mrrokesh/shared';
import { SAC_CODE, seatCap } from '../billing/entitlements';
import { assertGstin, assertPlaceOfSupply, splitGst } from '../billing/gst';
import { verifyRazorpaySignature } from '../billing/razorpay';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { BillingCycle } from '../store/types';
import { ipPool } from '../billing/entitlements';
import { presentInvoice, presentPlan, writeAudit, type TenantContext } from './access';
import type { AuthMeta } from './auth';

const SELF_SERVE: PlanTier[] = ['starter', 'business', 'business_plus'];

export async function createCheckout(
  deps: AppDeps,
  tenant: TenantContext,
  input: {
    tier: PlanTier;
    cycle: BillingCycle;
    seats: number;
    placeOfSupply: string;
    gstin?: string;
  },
  meta: AuthMeta,
) {
  if (!SELF_SERVE.includes(input.tier)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'tier', message: 'Choose Starter, Business, or Business Plus.' }],
    });
  }
  const plan = await deps.store.findPlanByTier(input.tier);
  if (!plan) throw new ApiError('API-SRV-500');
  const placeOfSupply = assertPlaceOfSupply(input.placeOfSupply);
  const gstin = input.gstin ? assertGstin(input.gstin, placeOfSupply) : null;
  const cap = plan.entitlements.maxUsers;
  if (input.seats < 1 || (cap > 0 && input.seats > cap)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'seats', message: 'Seat count is outside this plan.' }],
    });
  }
  const unit = input.cycle === 'annual' ? plan.priceInrAnnualPaise : plan.priceInrMonthlyPaise;
  const amountPaise = unit * input.seats;
  const gst = splitGst(amountPaise, deps.config.supplierStateCode, placeOfSupply);
  const checkout = {
    id: crypto.randomUUID(),
    organizationId: tenant.org.id,
    tier: input.tier,
    cycle: input.cycle,
    seats: input.seats,
    amountPaise,
    gstin,
    placeOfSupply,
    status: 'created' as const,
    createdAt: deps.now(),
  };
  await deps.store.insertCheckout(checkout);
  await writeAudit(deps.store, {
    at: deps.now(),
    organizationId: tenant.org.id,
    actorUserId: tenant.user.id,
    requestId: meta.requestId,
    action: 'billing.checkout_created',
    targetType: 'checkout',
    targetId: checkout.id,
    ipAddress: meta.ip,
    metadata: { tier: input.tier, seats: input.seats },
  });
  return {
    provider: 'razorpay' as const,
    keyId: deps.config.razorpayKeyId,
    checkoutId: checkout.id,
    amountPaise,
    currency: 'INR' as const,
    tier: input.tier,
    cycle: input.cycle,
    seats: input.seats,
    gst,
    note: 'Stub checkout. A signed payment.captured webhook activates the plan.',
  };
}

export async function applyRazorpayWebhook(
  deps: AppDeps,
  rawBody: string,
  signature: string | undefined,
): Promise<{ received: true }> {
  if (
    !signature ||
    !deps.config.razorpayWebhookSecret ||
    !verifyRazorpaySignature(deps.config.razorpayWebhookSecret, rawBody, signature)
  ) {
    throw new ApiError('API-BILL-001');
  }
  let event: { event?: string; checkoutId?: string; paymentId?: string };
  try {
    event = JSON.parse(rawBody) as { event?: string; checkoutId?: string; paymentId?: string };
  } catch {
    throw new ApiError('API-VAL-001');
  }
  if (!event.checkoutId || !event.event) throw new ApiError('API-VAL-001');
  const checkout = await deps.store.findCheckout(event.checkoutId);
  if (!checkout) throw new ApiError('API-RES-404');
  const now = deps.now();
  if (event.event === 'payment.captured') {
    if (checkout.status === 'paid') return { received: true };
    const plan = await deps.store.findPlanByTier(checkout.tier);
    if (!plan) throw new ApiError('API-SRV-500');
    const periodEnd = new Date(now.getTime());
    if (checkout.cycle === 'annual') periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
    else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    await deps.store.updateSubscription(checkout.organizationId, {
      planId: plan.id,
      status: 'active',
      cycle: checkout.cycle,
      seatLimit: checkout.seats,
      paidAt: now,
      gatewayCustomerId: event.paymentId ?? checkout.id,
      gatewaySubId: checkout.id,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
    await deps.store.updateOrg(checkout.organizationId, {
      gstin: checkout.gstin,
      placeOfSupply: checkout.placeOfSupply,
    });
    await deps.store.updateCheckout(checkout.organizationId, checkout.id, { status: 'paid' });
    const gst = splitGst(
      checkout.amountPaise,
      deps.config.supplierStateCode,
      checkout.placeOfSupply,
    );
    const count = await deps.store.countInvoices(checkout.organizationId);
    await deps.store.insertInvoice({
      id: crypto.randomUUID(),
      organizationId: checkout.organizationId,
      checkoutId: checkout.id,
      invoiceNumber: `MRM-${now.getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`,
      gstin: checkout.gstin,
      placeOfSupply: checkout.placeOfSupply,
      taxablePaise: gst.taxablePaise,
      cgstPaise: gst.cgstPaise,
      sgstPaise: gst.sgstPaise,
      igstPaise: gst.igstPaise,
      totalPaise: gst.totalPaise,
      sacCode: SAC_CODE,
      createdAt: now,
    });
    await writeAudit(deps.store, {
      at: now,
      organizationId: checkout.organizationId,
      actorUserId: null,
      requestId: crypto.randomUUID(),
      action: 'billing.paid',
      targetType: 'checkout',
      targetId: checkout.id,
      ipAddress: null,
      metadata: { tier: checkout.tier },
    });
    return { received: true };
  }
  if (event.event === 'payment.failed') {
    await deps.store.updateCheckout(checkout.organizationId, checkout.id, { status: 'failed' });
    await deps.store.updateSubscription(checkout.organizationId, { status: 'past_due' });
    return { received: true };
  }
  if (event.event === 'subscription.halted') {
    await deps.store.updateSubscription(checkout.organizationId, { status: 'read_only' });
    return { received: true };
  }
  if (event.event === 'subscription.cancelled') {
    await deps.store.updateSubscription(checkout.organizationId, { status: 'canceled' });
    return { received: true };
  }
  throw new ApiError('API-VAL-001', { fields: [{ path: 'event', message: 'Unsupported event.' }] });
}

export async function usageSummary(deps: AppDeps, tenant: TenantContext) {
  return {
    tier: tenant.plan.tier,
    status: tenant.subscription.status,
    seats: {
      used: await deps.store.countActiveUsers(tenant.org.id),
      limit: seatCap(tenant.limits, tenant.subscription.seatLimit),
    },
    domains: {
      used: await deps.store.countDomains(tenant.org.id),
      limit: tenant.limits.maxDomains,
    },
    ipPool: ipPool(tenant.plan.tier, tenant.subscription.paidAt),
  };
}

export async function invoiceList(deps: AppDeps, tenant: TenantContext) {
  const rows = await deps.store.listInvoices(tenant.org.id);
  return rows.map(presentInvoice);
}

export async function planCatalog(deps: AppDeps) {
  const plans = await deps.store.listPlans();
  return plans.map(presentPlan);
}
