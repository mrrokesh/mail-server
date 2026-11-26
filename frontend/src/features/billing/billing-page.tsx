import type { ErrorCode } from '@mrrokesh/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, Receipt } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ErrorNote, Field, SelectField } from '../../components/ui/field';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { ApiProblem, readLive, writeLive } from '../../lib/api';
import { useSession } from '../../lib/session';
import { useDocumentTitle } from '../../lib/use-document-title';

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

type RazorpayCheckout = { open: () => void };
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
      <div className="spread">
        <div className="cluster-2">
          <Icon icon={Receipt} size={18} />
          <h2 className="h3">{issued ? `Tax invoice ${issued.invoiceNumber}` : 'GST proforma'}</h2>
        </div>
        <Badge tone={issued ? 'success' : 'brand'}>{issued ? 'Paid' : 'Pending payment'}</Badge>
      </div>
      <div className="stack-2">
        <p className="strong">{invoice.supplierName}</p>
        <p className="caption muted">
          Supplier state {invoice.supplierStateCode} · Place of supply {invoice.placeOfSupply} · SAC{' '}
          {invoice.sacCode}
        </p>
        <p className="caption muted">
          Customer GSTIN: {invoice.gstin ?? 'Unregistered'} · {invoice.tier} · {invoice.seats} seats
          · {invoice.cycle}
        </p>
      </div>
      <div
        className="stack-2"
        style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}
      >
        <p className="invoice-row">
          <span className="muted">Taxable value</span>
          <span className="tabular">{rupees(invoice.gst.taxablePaise)}</span>
        </p>
        <p className="invoice-row">
          <span className="muted">CGST (9%)</span>
          <span className="tabular">{rupees(invoice.gst.cgstPaise)}</span>
        </p>
        <p className="invoice-row">
          <span className="muted">SGST (9%)</span>
          <span className="tabular">{rupees(invoice.gst.sgstPaise)}</span>
        </p>
        <p className="invoice-row">
          <span className="muted">IGST (18%)</span>
          <span className="tabular">{rupees(invoice.gst.igstPaise)}</span>
        </p>
        <p
          className="invoice-row"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}
        >
          <span className="strong">Total (incl. 18% GST)</span>
          <strong className="h3 tabular">{rupees(invoice.gst.totalPaise)}</strong>
        </p>
      </div>
      <p className="caption muted">{invoice.note}</p>
      {issued ? (
        <p className="caption status-ready cluster-2">
          <Icon icon={CheckCircle2} size={15} />
          <span>Subscription marked paid and active.</span>
        </p>
      ) : null}
    </article>
  );
}

export function BillingPage() {
  useDocumentTitle('Billing & GST Invoices');
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
            seatLimit: z.number(),
            plan: z.object({ displayName: z.string(), tier: z.string() }),
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
    <div className="page-wrap">
      <div className="spread">
        <div>
          <h1 className="h2">Billing &amp; GST</h1>
          <p className="caption muted">
            Manage plan seats, calculate CGST/SGST or IGST, and download tax invoices.
          </p>
        </div>
        {subscription.data ? (
          <Badge tone="brand">
            {subscription.data.plan.displayName} · {subscription.data.status}
          </Badge>
        ) : null}
      </div>

      <div className="two-col">
        <form className="card stack" onSubmit={onSubmit}>
          <div className="cluster-2">
            <Icon icon={CreditCard} size={18} />
            <h2 className="h3">Configure plan &amp; seats</h2>
          </div>
          <div className="two-col">
            <SelectField
              label="Plan"
              value={tier}
              onChange={(event) => setTier(event.target.value)}
            >
              <option value="starter">Starter (₹69/mo annual)</option>
              <option value="business">Business (₹149/mo annual)</option>
              <option value="business_plus">Business Plus (₹349/mo annual)</option>
            </SelectField>
            <SelectField
              label="Billing cycle"
              value={cycle}
              onChange={(event) => setCycle(event.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </SelectField>
          </div>
          <div className="two-col">
            <Field
              label="Seats"
              inputMode="numeric"
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            />
            <Field
              label="Place of supply (state code)"
              placeholder="33 for Tamil Nadu"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          </div>
          <Field
            label="Customer GSTIN (optional)"
            placeholder="33ABCDE1234F1Z5"
            value={gstin}
            onChange={(event) => setGstin(event.target.value)}
            autoComplete="off"
          />
          {code ? <ErrorNote code={code} /> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            Generate GST invoice
          </button>
        </form>

        <div className="stack">
          {invoice ? (
            <>
              <InvoiceCard invoice={invoice} issued={issued} />
              {invoice.checkoutMode === 'razorpay' ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void openCheckout()}
                  disabled={pending}
                >
                  Pay {rupees(invoice.amountPaise)} via Razorpay
                </button>
              ) : null}
              {(invoice.checkoutMode === 'test-webhook' ||
                invoice.checkoutMode === 'unavailable') &&
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
              {payProblem ? <p className="caption muted">{payProblem}</p> : null}
            </>
          ) : (
            <div className="card stack-2">
              <h2 className="h3">GST calculation preview</h2>
              <p className="caption muted">
                Select a plan, seat count, and state code on the left to preview taxable value,
                CGST+SGST (intra-state Tamil Nadu 33) or IGST (inter-state), and activate via
                Razorpay.
              </p>
            </div>
          )}
        </div>
      </div>

      {invoices.data && invoices.data.length > 0 ? (
        <div className="stack-3">
          <h2 className="h3">Issued tax invoices</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Place of supply</th>
                  <th>GSTIN</th>
                  <th>Taxable</th>
                  <th>Total incl. GST</th>
                </tr>
              </thead>
              <tbody>
                {invoices.data.map((row) => (
                  <tr key={row.invoiceNumber}>
                    <td className="strong mono">{row.invoiceNumber}</td>
                    <td className="tabular">{row.placeOfSupply}</td>
                    <td className="mono">{row.gstin ?? 'Unregistered'}</td>
                    <td className="tabular">{rupees(row.taxablePaise)}</td>
                    <td className="strong tabular">{rupees(row.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
