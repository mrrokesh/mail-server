import { Mail, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';
import { useDataSource } from '../../lib/data-source';
import { useSession } from '../../lib/session';

const LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
  { to: '/docs', label: 'Docs' },
];

export function MarketingShell() {
  const [open, setOpen] = useState(false);
  const source = useDataSource();
  const { user } = useSession();

  return (
    <div className="marketing">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <Icon icon={Mail} />
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
        </nav>
        <div className="nav-tools">
          <ThemeToggle />
          {user ? (
            <Link className="btn btn-text" to="/mail">
              Open mail
            </Link>
          ) : (
            <Link className="btn btn-text" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </header>
      {source === 'preview' ? (
        <p className="preview-banner caption">
          The API did not answer, so this screen is using saved sample data.
        </p>
      ) : null}
      <main id="content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-row">
          <p className="muted">MR Rokesh Mail</p>
          <nav className="footer-links" aria-label="Footer">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
