import crypto from 'node:crypto';
import type { PlanTier } from '@mrrokesh/shared';
import { SAC_CODE, seatCap } from '../billing/entitlements';
import { assertGstin, assertPlaceOfSupply, splitGst } from '../billing/gst';
import { razorpaySignature, verifyRazorpaySignature } from '../billing/razorpay';
import { ApiError } from '../errors';
import type { AppDeps } from '../app-deps';
import type { BillingCycle } from '../store/types';
import { ipPool } from '../billing/entitlements';
import { presentInvoice, presentPlan, writeAudit, type TenantContext } from './access';
import type { AuthMeta } from './auth';

const SELF_SERVE: PlanTier[] = ['starter', 'business', 'business_plus'];

export function razorpayCheckoutReady(config: {
  razorpayKeyId: string;
  razorpayKeySecret: string;
}): boolean {
  const keyId = config.razorpayKeyId.trim();
  const keySecret = config.razorpayKeySecret.trim();
  if (keyId.length < 20 || keySecret.length < 24) return false;
  if (keyId.includes('CHANGE_ME') || keySecret.includes('CHANGE_ME')) return false;
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) return false;
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function parseBillingEvent(raw: string): { event: string; checkoutId: string; paymentId?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError('API-VAL-001');
  }
  const body = asRecord(parsed);
  if (!body || typeof body.event !== 'string' || body.event.length === 0) {
    throw new ApiError('API-VAL-001');
  }
  if (typeof body.checkoutId === 'string' && body.checkoutId.length > 0) {
    return {
      event: body.event,
      checkoutId: body.checkoutId,
      ...(typeof body.paymentId === 'string' ? { paymentId: body.paymentId } : {}),
    };
  }
  const payload = asRecord(body.payload);
  const payment = asRecord(asRecord(payload?.payment)?.entity);
  const order = asRecord(asRecord(payload?.order)?.entity);
  const notes = asRecord(payment?.notes) ?? asRecord(order?.notes);
  const fromNotes = typeof notes?.checkoutId === 'string' ? notes.checkoutId : '';
  const fromReceipt =
    (typeof order?.receipt === 'string' && order.receipt) ||
    (typeof payment?.receipt === 'string' && payment.receipt) ||
    '';
  const checkoutId = fromNotes || fromReceipt;
  if (!checkoutId) throw new ApiError('API-VAL-001');
  const paymentId = typeof payment?.id === 'string' ? payment.id : undefined;
  return {
    event: body.event,
    checkoutId,
    ...(paymentId ? { paymentId } : {}),
  };
}

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
  const live = razorpayCheckoutReady(deps.config);
  let orderId: string | null = null;
  let orderError: string | null = null;
  if (live) {
    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${deps.config.razorpayKeyId}:${deps.config.razorpayKeySecret}`).toString('base64')}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: checkout.id,
          notes: { checkoutId: checkout.id },
        }),
      });
      if (!response.ok) {
        orderError = 'Razorpay did not create an order. The invoice is still recorded.';
      } else {
        const order = (await response.json()) as { id?: string };
        orderId = typeof order.id === 'string' ? order.id : null;
        if (!orderId)
          orderError = 'Razorpay did not create an order. The invoice is still recorded.';
      }
    } catch {
      orderError = 'Razorpay did not create an order. The invoice is still recorded.';
    }
  }
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
  const checkoutMode = orderId
    ? ('razorpay' as const)
    : !razorpayCheckoutReady(deps.config) && deps.config.nodeEnv !== 'production'
      ? ('test-webhook' as const)
      : ('unavailable' as const);
  return {
    provider: 'razorpay' as const,
    keyId: orderId ? deps.config.razorpayKeyId : null,
    orderId,
    checkoutId: checkout.id,
    amountPaise,
    currency: 'INR' as const,
    tier: input.tier,
    cycle: input.cycle,
    seats: input.seats,
    gstin,
    placeOfSupply,
    supplierName: 'MR Rokesh Mail',
    supplierStateCode: deps.config.supplierStateCode,
    sacCode: SAC_CODE,
    gst,
    checkoutMode,
    note: orderId
      ? 'Pay with Razorpay. The webhook activates the plan and issues this GST invoice.'
      : checkoutMode === 'test-webhook'
        ? 'Razorpay keys are not set. This GST invoice is recorded. Mark it paid with the local webhook path.'
        : (orderError ??
          'Razorpay keys are not set, so Checkout stays closed. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.'),
  };
}

export async function activateTestCheckout(
  deps: AppDeps,
  tenant: TenantContext,
  checkoutId: string,
) {
  if (deps.config.nodeEnv === 'production' || razorpayCheckoutReady(deps.config)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'checkoutId', message: 'Use Razorpay Checkout while live keys are set.' }],
    });
  }
  const checkout = await deps.store.findCheckout(checkoutId);
  if (!checkout || checkout.organizationId !== tenant.org.id) throw new ApiError('API-RES-404');
  const raw = JSON.stringify({
    event: 'payment.captured',
    checkoutId: checkout.id,
    paymentId: `test_${checkout.id.replace(/-/g, '').slice(0, 14)}`,
  });
  const secret = deps.config.razorpayWebhookSecret.trim();
  if (secret) {
    await applyRazorpayWebhook(deps, raw, razorpaySignature(secret, raw));
  } else {
    await applyRazorpayWebhook(deps, raw, undefined, { placeholder: true });
  }
  const invoices = await invoiceList(deps, tenant);
  const issued = invoices.find((invoice) => invoice.checkoutId === checkout.id) ?? null;
  return { received: true as const, status: 'active' as const, invoice: issued };
}

export async function applyRazorpayWebhook(
  deps: AppDeps,
  rawBody: string,
  signature: string | undefined,
  options?: { placeholder?: boolean },
): Promise<{ received: true }> {
  const secret = deps.config.razorpayWebhookSecret.trim();
  const localPlaceholder = options?.placeholder === true && !razorpayCheckoutReady(deps.config);
  if (localPlaceholder && !secret) {
    // Keys and the webhook secret are still placeholders. The signed public webhook
    // stays closed; only the authenticated local path reaches this branch.
  } else if (!signature || !secret || !verifyRazorpaySignature(secret, rawBody, signature)) {
    throw new ApiError('API-BILL-001');
  }
  const event = parseBillingEvent(rawBody);
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
