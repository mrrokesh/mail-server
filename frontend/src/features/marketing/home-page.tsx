import {
  Calendar,
  CheckCircle2,
  Globe,
  HardDrive,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { useDocumentTitle } from '../../lib/use-document-title';
import { MailCapture } from './mail-capture';

const PILLARS = [
  {
    icon: Globe,
    title: 'Guided DNS & deliverability',
    body: 'Publish ownership TXT, MX, SPF, 2048-bit DKIM, DMARC, and MTA-STS with live verification and exact remediation codes.',
  },
  {
    icon: Mail,
    title: 'Three-pane JMAP webmail',
    body: 'Keyboard-first inbox, snooze, templates, visual Sieve rules, undo send, and sandboxed HTML rendering.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-tenant isolation',
    body: 'PostgreSQL row-level security, bcrypt + HMAC-SHA256 pepper auth, TOTP MFA, passkeys, and per-device app passwords.',
  },
  {
    icon: Calendar,
    title: 'Calendar, contacts, and Drive',
    body: 'Shared calendars, room booking, India holiday feeds, organization GAL directory, and expiring Drive share links.',
  },
] as const;

const SUITE_ITEMS = [
  {
    icon: Users,
    title: 'Unified admin console',
    body: 'Manage users, roles, shared mailboxes, aliases, SSO/SCIM, retention, and legal holds from one console.',
    to: '/docs/roles-and-permissions',
    cta: 'Explore admin roles',
  },
  {
    icon: HardDrive,
    title: 'Files, docs, and meetings',
    body: 'Store team files, collaborate on documents via WOPI, host LiveKit meetings, and share public booking pages.',
    to: '/docs/what-you-can-do',
    cta: 'See full suite',
  },
  {
    icon: Lock,
    title: 'Privacy & compliance',
    body: 'Remote images blocked by default, zero-access key hooks, eDiscovery cases, journaling, and audit logs.',
    to: '/security',
    cta: 'Read security model',
  },
  {
    icon: Sparkles,
    title: 'Transparent rupee pricing',
    body: 'Starter at ₹69, Business at ₹149, Business Plus at ₹349 per user/month including 18% GST and tax invoices.',
    to: '/pricing',
    cta: 'Compare plans',
  },
] as const;

export function HomePage() {
  useDocumentTitle('MR Rokesh Mail');

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container stack-8">
          <div className="hero-header">
            <Badge tone="brand">Hosted in India · GST included</Badge>
            <h1 className="display">Business mail on your domain</h1>
            <p className="body-lg muted measure">
              Custom-domain email, calendar, contacts, Drive, and enterprise compliance built around
              open mail standards and clear rupee pricing.
            </p>
            <div className="cluster">
              <Link className="btn btn-primary btn-pill" to="/signup">
                Create workspace
              </Link>
              <Link className="btn btn-quiet btn-pill" to="/pricing">
                Compare plans
              </Link>
              <Link className="btn btn-text" to="/docs">
                Read documentation
              </Link>
            </div>
          </div>
          <MailCapture />
        </div>
      </section>

      <section className="section reveal">
        <div className="container feature-split">
          <div className="stack-6">
            <h2 className="h2">Engineered for inbox placement</h2>
            <p className="body-lg muted measure">
              Connect your domain in minutes. The DNS wizard generates every authentication record,
              tracks live propagation, and blocks unverified outbound sending so your domain stays
              off blocklists.
            </p>
            <ul className="plan-list">
              <li>
                <Icon icon={CheckCircle2} size={18} />
                <span>2048-bit RSA DKIM keys with scheduled selector rotation</span>
              </li>
              <li>
                <Icon icon={CheckCircle2} size={18} />
                <span>Guided DMARC progression from monitoring to enforcement</span>
              </li>
              <li>
                <Icon icon={CheckCircle2} size={18} />
                <span>Automatic Thunderbird Autoconfig and MTA-STS policy hosting</span>
              </li>
            </ul>
            <div>
              <Link className="btn btn-quiet" to="/docs/dns-setup">
                Read DNS setup guide
              </Link>
            </div>
          </div>
          <div className="pillar-list">
            {PILLARS.map((item) => (
              <div key={item.title} className="pillar-item">
                <span className="pillar-icon" aria-hidden="true">
                  <Icon icon={item.icon} size={18} />
                </span>
                <div className="stack-2">
                  <h3 className="strong">{item.title}</h3>
                  <p className="caption muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section reveal">
        <div className="container stack-8">
          <div className="stack-3">
            <h2 className="h2">One workspace, zero portal sprawl</h2>
            <p className="body-lg muted measure">
              Every mailbox, calendar, contact directory, file share, and compliance policy lives
              under one consistent interface in light and dark mode.
            </p>
          </div>
          <div className="bento-grid">
            {SUITE_ITEMS.map((item) => (
              <article key={item.title} className="card stack-3">
                <span className="pillar-icon" aria-hidden="true">
                  <Icon icon={item.icon} size={20} />
                </span>
                <h3 className="h3">{item.title}</h3>
                <p className="muted measure">{item.body}</p>
                <div>
                  <Link className="btn btn-text" to={item.to}>
                    {item.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section reveal">
        <div className="container card stack-6">
          <div className="spread">
            <div className="stack-3">
              <h2 className="h2">Start free or trial Business</h2>
              <p className="muted measure">
                Begin with up to 5 users on Free, or launch a 30-day Business trial with shared
                mailboxes, ActiveSync, and 50 GB seats.
              </p>
            </div>
            <div className="cluster">
              <Link className="btn btn-primary btn-pill" to="/signup?plan=business">
                Start 30-day trial
              </Link>
              <Link className="btn btn-quiet btn-pill" to="/pricing">
                View rupee pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
