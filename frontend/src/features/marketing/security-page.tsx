import { Database, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/icon';
import { Badge } from '../../components/ui/primitives';
import { useDocumentTitle } from '../../lib/use-document-title';

const CONTROLS = [
  {
    icon: ShieldCheck,
    title: 'Domain authentication & transport',
    body: 'Outbound mail waits until Ownership TXT, MX, SPF, and 2048-bit RSA DKIM checks pass. DMARC, MTA-STS, and TLS-RPT are built into the same wizard.',
    link: '/docs/deliverability',
    label: 'Read deliverability guide',
  },
  {
    icon: EyeOff,
    title: 'Sandboxed HTML & tracker blocking',
    body: 'Every message body is sanitized and rendered inside a strict sandboxed iframe. Remote images remain blocked by default until you choose to load them.',
    link: '/docs/what-you-can-do',
    label: 'Review mail privacy',
  },
  {
    icon: KeyRound,
    title: 'Hardened identity & app passwords',
    body: 'Passwords use NFKC normalization, HMAC-SHA256 server pepper, and bcrypt cost 12. Third-party IMAP/SMTP apps use revocable per-device app passwords, plus TOTP MFA and Passkeys.',
    link: '/docs/client-setup',
    label: 'Read client setup',
  },
  {
    icon: Database,
    title: 'India residency & row-level isolation',
    body: 'PostgreSQL row-level security scopes every tenant query by session organization ID. Mail and metadata are hosted in India by default.',
    link: '/docs/roles-and-permissions',
    label: 'Read access roles',
  },
] as const;

export function SecurityPage() {
  useDocumentTitle('Security');

  return (
    <article className="section">
      <div className="container stack-8">
        <header className="stack">
          <Badge tone="brand">Security architecture</Badge>
          <h1 className="h1">Built for tenant isolation</h1>
          <p className="body-lg muted measure">
            Every control listed below is implemented in code and enforced on the API. We publish
            only verified capabilities and never claim unissued certifications.
          </p>
        </header>
        <div className="bento-grid">
          {CONTROLS.map((item) => (
            <section key={item.title} className="card stack-3">
              <span className="pillar-icon" aria-hidden="true">
                <Icon icon={item.icon} size={20} />
              </span>
              <h2 className="h3">{item.title}</h2>
              <p className="muted measure">{item.body}</p>
              <div>
                <Link className="btn btn-text" to={item.link}>
                  {item.label}
                </Link>
              </div>
            </section>
          ))}
        </div>
        <div className="card spread">
          <div className="stack-2">
            <h2 className="h3">Ready to test your domain?</h2>
            <p className="muted">
              Create a workspace, inspect your DNS checklist, and verify records live.
            </p>
          </div>
          <Link className="btn btn-primary btn-pill" to="/signup">
            Create workspace
          </Link>
        </div>
      </div>
    </article>
  );
}
