import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote } from '../../components/ui/field';
import { ApiProblem, readLive, writeLive } from '../../lib/api';
import { useSession } from '../../lib/session';
import { useDocumentTitle } from '../../lib/use-document-title';
import type { ErrorCode } from '@mrrokesh/shared';

const gstSchema = z.object({
  taxablePaise: z.number(),
  cgstPaise: z.number(),
  sgstPaise: z.number(),
  igstPaise: z.number(),
  totalPaise: z.number(),
});

const checkoutSchema = z.object({
  keyId: z.string().nullable(),
  orderId: z.string().nullable(),
  checkoutId: z.string(),
  amountPaise: z.number(),
  currency: z.string(),
  tier: z.string(),
  cycle: z.string(),
  seats: z.number(),
  gstin: z.string().nullable(),
  placeOfSupply: z.string(),
  supplierName: z.string(),
  supplierStateCode: z.string(),
  sacCode: z.string(),
  gst: gstSchema,
  checkoutMode: z.enum(['razorpay', 'test-webhook', 'unavailable']),
  note: z.string(),
});

const storedInvoiceSchema = z.object({
  checkoutId: z.string(),
  invoiceNumber: z.string(),
  gstin: z.string().nullable(),
  placeOfSupply: z.string(),
  taxablePaise: z.number(),
  cgstPaise: z.number(),
  sgstPaise: z.number(),
  igstPaise: z.number(),
  totalPaise: z.number(),
  sacCode: z.string(),
  createdAt: z.string(),
});

const activatedSchema = z.object({
  received: z.literal(true),
  status: z.string(),
  invoice: storedInvoiceSchema.nullable(),
});

type Checkout = z.infer<typeof checkoutSchema>;
type StoredInvoice = z.infer<typeof storedInvoiceSchema>;

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayCheckout;

function rupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function razorpayCtor(): RazorpayCtor | null {
  const host = window as Window & { Razorpay?: RazorpayCtor };
  return host.Razorpay ?? null;
}

function loadRazorpay(): Promise<RazorpayCtor> {
  const existing = razorpayCtor();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const ctor = razorpayCtor();
      if (ctor) resolve(ctor);
      else reject(new Error('Razorpay Checkout did not load.'));
    };
    script.onerror = () => reject(new Error('Razorpay Checkout did not load.'));
    document.body.appendChild(script);
  });
}

function InvoiceCard({ invoice, issued }: { invoice: Checkout; issued: StoredInvoice | null }) {
  return (
    <article className="invoice" aria-label="GST invoice">
      <h2 className="h3">{issued ? `Tax invoice ${issued.invoiceNumber}` : 'GST invoice'}</h2>
      <p>{invoice.supplierName}</p>
      <p className="caption">Supplier state {invoice.supplierStateCode}</p>
      <p className="caption">Place of supply {invoice.placeOfSupply}</p>
      <p className="caption">GSTIN {invoice.gstin ?? 'Not supplied'}</p>
      <p className="caption">SAC {invoice.sacCode}</p>
      <p className="caption">
        {invoice.tier} · {invoice.seats} seats · {invoice.cycle}
      </p>
      <p className="invoice-row">
        <span>Taxable value</span>
        <span>{rupees(invoice.gst.taxablePaise)}</span>
      </p>
      <p className="invoice-row">
        <span>CGST</span>
        <span>{rupees(invoice.gst.cgstPaise)}</span>
      </p>
      <p className="invoice-row">
        <span>SGST</span>
        <span>{rupees(invoice.gst.sgstPaise)}</span>
      </p>
      <p className="invoice-row">
        <span>IGST</span>
        <span>{rupees(invoice.gst.igstPaise)}</span>
      </p>
      <p className="invoice-row">
        <span>Total</span>
        <strong>{rupees(invoice.gst.totalPaise)}</strong>
      </p>
      <p className="muted">{invoice.note}</p>
      {issued ? <p className="status-ready">Subscription marked paid.</p> : null}
    </article>
  );
}

export function BillingPage() {
  useDocumentTitle('Billing');
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [tier, setTier] = useState('business');
  const [cycle, setCycle] = useState('monthly');
  const [seats, setSeats] = useState('2');
  const [place, setPlace] = useState('33');
  const [gstin, setGstin] = useState('');
  const [code, setCode] = useState<ErrorCode | null>(null);
  const [payProblem, setPayProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [invoice, setInvoice] = useState<Checkout | null>(null);
  const invoices = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () =>
      readLive('/billing/invoices', (input) => {
        const parsed = z.array(storedInvoiceSchema).safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
  });
  const subscription = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () =>
      readLive('/billing/subscription', (input) => {
        const parsed = z
          .object({
            status: z.string(),
            plan: z.object({ displayName: z.string() }),
          })
          .safeParse(input);
        return parsed.success ? parsed.data : null;
      }),
  });

  const issued = invoices.data?.find((row) => row.checkoutId === invoice?.checkoutId) ?? null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setCode(null);
    setPayProblem(null);
    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setCode('API-VAL-001');
      return;
    }
    setPending(true);
    try {
      const created = await writeLive(
        '/billing/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            tier,
            cycle,
            seats: seatCount,
            placeOfSupply: place,
            ...(gstin.trim() ? { gstin: gstin.trim() } : {}),
          }),
        },
        (input) => {
          const parsed = checkoutSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      setInvoice(created.data);
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  async function openCheckout() {
    if (!invoice || invoice.checkoutMode !== 'razorpay' || !invoice.keyId || !invoice.orderId)
      return;
    setPayProblem(null);
    setPending(true);
    try {
      const Razorpay = await loadRazorpay();
      const checkout = new Razorpay({
        key: invoice.keyId,
        amount: invoice.amountPaise,
        currency: invoice.currency,
        name: invoice.supplierName,
        description: `${invoice.tier} · ${invoice.seats} seats`,
        order_id: invoice.orderId,
        prefill: user?.email ? { email: user.email } : undefined,
        handler: () => {
          void queryClient.invalidateQueries({ queryKey: ['billing'] });
          setPayProblem('Payment submitted. The tax invoice appears when the webhook arrives.');
        },
      });
      checkout.open();
    } catch (error) {
      setPayProblem(error instanceof Error ? error.message : 'Razorpay Checkout did not open.');
    } finally {
      setPending(false);
    }
  }

  async function activateTest() {
    if (!invoice || invoice.checkoutMode !== 'test-webhook') return;
    setCode(null);
    setPayProblem(null);
    setPending(true);
    try {
      await writeLive(
        `/billing/checkout/${invoice.checkoutId}/test-webhook`,
        { method: 'POST', body: JSON.stringify({}) },
        (input) => {
          const parsed = activatedSchema.safeParse(input);
          return parsed.success ? parsed.data : null;
        },
      );
      await queryClient.invalidateQueries({ queryKey: ['billing'] });
    } catch (error) {
      setCode(error instanceof ApiProblem ? error.code : 'API-SRV-500');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="billing-grid">
      <h1 className="h2">Billing</h1>
      <p className="muted">
        {subscription.data
          ? `${subscription.data.plan.displayName} is ${subscription.data.status}. Prices include 18% GST.`
          : 'Prices include 18% GST.'}
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <label className="stack">
          <span className="caption">Plan</span>
          <select className="input" value={tier} onChange={(event) => setTier(event.target.value)}>
            <option value="starter">Starter</option>
            <option value="business">Business</option>
            <option value="business_plus">Business Plus</option>
          </select>
        </label>
        <label className="stack">
          <span className="caption">Cycle</span>
          <select
            className="input"
            value={cycle}
            onChange={(event) => setCycle(event.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
        <label className="stack">
          <span className="caption">Seats</span>
          <input
            className="input"
            inputMode="numeric"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
        </label>
        <label className="stack">
          <span className="caption">Place of supply</span>
          <input
            className="input"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
          />
        </label>
        <label className="stack">
          <span className="caption">GSTIN</span>
          <input
            className="input"
            value={gstin}
            onChange={(event) => setGstin(event.target.value)}
            autoComplete="off"
          />
        </label>
        {code ? <ErrorNote code={code} /> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Create invoice
        </button>
      </form>
      {invoice ? (
        <div className="stack">
          <InvoiceCard invoice={invoice} issued={issued} />
          {invoice.checkoutMode === 'razorpay' ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void openCheckout()}
              disabled={pending}
            >
              Pay {rupees(invoice.amountPaise)}
            </button>
          ) : null}
          {(invoice.checkoutMode === 'test-webhook' || invoice.checkoutMode === 'unavailable') &&
          !invoice.orderId &&
          !issued ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void activateTest()}
              disabled={pending}
            >
              Mark paid with test webhook
            </button>
          ) : null}
          {payProblem ? <p className="muted">{payProblem}</p> : null}
        </div>
      ) : null}
      {invoices.data && invoices.data.length > 0 ? (
        <div className="stack">
          <h2 className="h3">Issued invoices</h2>
          {invoices.data.map((row) => (
            <p key={row.invoiceNumber} className="invoice-row">
              <span>{row.invoiceNumber}</span>
              <span>{rupees(row.totalPaise)}</span>
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
