import { Calendar, HardDrive, Inbox, LayoutGrid, MessageSquare, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';
import { useSession } from '../../lib/session';

const RAIL = [
  { to: '/mail', label: 'Mail', icon: Inbox },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/drive', label: 'Drive', icon: HardDrive },
] as const;

const MORE = [
  { to: '/documents', label: 'Docs' },
  { to: '/meet', label: 'Meet' },
  { to: '/booking', label: 'Booking' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notes', label: 'Notes' },
  { to: '/ai', label: 'AI' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/billing', label: 'Billing' },
  { to: '/admin/domains', label: 'Admin' },
] as const;

export function WorkspaceShell() {
  const { user, signOut } = useSession();
  const location = useLocation();
  const admin = location.pathname.startsWith('/admin');

  return (
    <div className="workspace app-frame">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <nav className="rail" aria-label="Apps">
        {RAIL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}
          >
            <Icon icon={item.icon} />
          </NavLink>
        ))}
        <details className="rail-more">
          <summary className="rail-link" aria-label="More apps" title="More">
            <Icon icon={LayoutGrid} />
          </summary>
          <div className="rail-menu">
            {MORE.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </details>
      </nav>
      <header className="app-top">
        <p className="brand">{user?.organization ?? 'MR Rokesh'}</p>
        <div className="nav-tools">
          <ThemeToggle />
          <details className="account">
            <summary>{user?.name ?? 'Account'}</summary>
            <div className="account-menu">
              <p className="caption break">{user?.email}</p>
              <p className="caption muted">{user?.organization}</p>
              <button type="button" className="btn btn-quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      <div className="workspace-body">
        {admin ? (
          <nav className="subnav" aria-label="Admin">
            <NavLink to="/admin/domains">Domains</NavLink>
            <NavLink to="/admin/users">Users</NavLink>
            <NavLink to="/admin/compliance">Compliance</NavLink>
            <NavLink to="/admin/sso">SSO</NavLink>
            <NavLink to="/admin/enterprise">Enterprise</NavLink>
            <NavLink to="/admin/brand">Brand</NavLink>
          </nav>
        ) : null}
        <main id="content" className="operate">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
