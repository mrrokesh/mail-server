import { Mail, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';
import { useSession } from '../../lib/session';

const LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
  { to: '/docs', label: 'Docs' },
];

export function MarketingShell() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();

  return (
    <div className="marketing">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/" onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              <Icon icon={Mail} size={18} />
            </span>
            <span>MR Rokesh</span>
          </Link>
          <button
            type="button"
            className="icon-btn nav-toggle"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon icon={open ? X : Menu} />
          </button>
          <nav className="nav-links" data-open={open} aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {!user ? (
              <Link className="nav-link mobile-only" to="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            ) : null}
          </nav>
          <div className="nav-tools">
            <ThemeToggle />
            {user ? (
              <Link className="btn btn-primary btn-pill btn-sm" to="/mail">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className="btn btn-text desktop-only" to="/login">
                  Sign in
                </Link>
                <Link className="btn btn-primary btn-pill btn-sm" to="/signup">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="stack-3">
            <Link className="brand" to="/">
              <span className="brand-mark" aria-hidden="true">
                <Icon icon={Mail} size={18} />
              </span>
              <span>MR Rokesh Mail</span>
            </Link>
            <p className="caption muted measure">
              Custom-domain business email, calendar, contacts, drive, and compliance hosted in
              India with rupee pricing and 18% GST included.
            </p>
          </div>
          <div className="footer-col">
            <p className="caption strong">Product</p>
            <nav className="footer-links" aria-label="Product">
              <Link to="/pricing">Pricing &amp; plans</Link>
              <Link to="/security">Security architecture</Link>
              <Link to="/signup">Create workspace</Link>
              <Link to="/login">Sign in</Link>
            </nav>
          </div>
          <div className="footer-col">
            <p className="caption strong">Documentation</p>
            <nav className="footer-links" aria-label="Documentation">
              <Link to="/docs/getting-started">Getting started</Link>
              <Link to="/docs/dns-setup">DNS setup guide</Link>
              <Link to="/docs/client-setup">IMAP &amp; SMTP setup</Link>
              <Link to="/docs/limits">Plan limits</Link>
            </nav>
          </div>
          <div className="footer-col">
            <p className="caption strong">Reference</p>
            <nav className="footer-links" aria-label="Reference">
              <Link to="/docs/error-codes">Error codes</Link>
              <Link to="/docs/deliverability">Deliverability</Link>
              <Link to="/docs/roles-and-permissions">Roles &amp; permissions</Link>
              <Link to="/docs/whats-new">What&apos;s new</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
