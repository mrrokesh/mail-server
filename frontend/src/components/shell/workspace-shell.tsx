import { PLAN_TIER_LABEL } from '@mrrokesh/shared';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  CheckSquare,
  CreditCard,
  FileText,
  Globe,
  HardDrive,
  Inbox,
  LayoutGrid,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  StickyNote,
  Users,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { Icon } from '../ui/icon';
import { Avatar, Badge, CommandPalette } from '../ui/primitives';
import { ThemeToggle } from '../ui/theme-toggle';

const RAIL = [
  { to: '/mail', label: 'Mail', icon: Inbox },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/drive', label: 'Drive', icon: HardDrive },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
] as const;

const ADMIN_RAIL = [
  { to: '/admin/domains', label: 'Domains & Admin', icon: Globe },
  { to: '/billing', label: 'Billing', icon: CreditCard },
] as const;

const MORE = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/documents', label: 'Docs', icon: FileText },
  { to: '/meet', label: 'Meet', icon: Video },
  { to: '/booking', label: 'Booking', icon: CalendarClock },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/ai', label: 'AI Studio', icon: Sparkles },
  { to: '/privacy', label: 'Privacy', icon: Lock },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/compliance', label: 'Compliance', icon: Shield },
  { to: '/admin/partner', label: 'Partner', icon: Globe },
  { to: '/operator', label: 'Operator', icon: Lock },
  { to: '/docs', label: 'Help & Docs', icon: BookOpen },
] as const;

export function WorkspaceShell() {
  const { user, signOut } = useSession();
  const location = useLocation();
  const admin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/operator');
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCmdOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="workspace app-frame">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <nav className="rail" aria-label="Workspace apps">
        <Link className="rail-brand" to="/mail" title="MR Rokesh Mail" aria-label="MR Rokesh Mail">
          <Icon icon={Mail} size={20} />
        </Link>
        {RAIL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}
          >
            <Icon icon={item.icon} size={20} />
          </NavLink>
        ))}
        <div className="rail-divider" aria-hidden="true" />
        {ADMIN_RAIL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) => `rail-link${isActive ? ' is-active' : ''}`}
          >
            <Icon icon={item.icon} size={20} />
          </NavLink>
        ))}
        <details className="rail-more">
          <summary className="rail-link" aria-label="All apps" title="All apps">
            <Icon icon={LayoutGrid} size={20} />
          </summary>
          <div className="rail-menu">
            {MORE.map((item) => (
              <NavLink key={item.to} to={item.to}>
                <Icon icon={item.icon} size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </details>
      </nav>
      <header className="app-top">
        <div className="app-top-left">
          <span className="strong truncate">{user?.organization ?? 'MR Rokesh'}</span>
          {user ? <Badge tone="brand">{PLAN_TIER_LABEL[user.plan]}</Badge> : null}
        </div>
        <div className="nav-tools">
          <button
            type="button"
            className="cmdk-trigger"
            onClick={() => setCmdOpen(true)}
            aria-label="Open command palette"
          >
            <span className="cluster-2">
              <Icon icon={Search} size={15} />
              <span className="cmdk-trigger-label">Jump to mail, domains, users...</span>
            </span>
            <kbd className="kbd">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <details className="account">
            <summary aria-label="Account menu">
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <span className="caption strong truncate account-name">
                {user?.name ?? 'Account'}
              </span>
            </summary>
            <div className="account-menu">
              <div className="cluster">
                <Avatar name={user?.name ?? 'User'} />
                <div className="stack-2" style={{ minWidth: 0 }}>
                  <p className="caption strong truncate">{user?.name}</p>
                  <p className="caption muted break">{user?.email}</p>
                </div>
              </div>
              <div className="spread">
                <Badge>{user?.role ?? 'member'}</Badge>
                {user ? <Badge tone="brand">{PLAN_TIER_LABEL[user.plan]}</Badge> : null}
              </div>
              <Link className="btn btn-quiet btn-sm" to="/admin/domains">
                Domain &amp; DNS health
              </Link>
              <Link className="btn btn-quiet btn-sm" to="/docs">
                Help &amp; client setup
              </Link>
              <button type="button" className="btn btn-danger btn-sm" onClick={signOut}>
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      <div className="workspace-body">
        {admin ? (
          <nav className="subnav" aria-label="Admin console">
            <NavLink to="/admin/domains">Domains &amp; DNS</NavLink>
            <NavLink to="/admin/users">Users &amp; Roles</NavLink>
            <NavLink to="/admin/compliance">Compliance</NavLink>
            <NavLink to="/admin/sso">SSO &amp; SCIM</NavLink>
            <NavLink to="/admin/enterprise">Enterprise</NavLink>
            <NavLink to="/admin/brand">Brand</NavLink>
            <NavLink to="/admin/partner">Partner</NavLink>
            {user?.isOperator ? <NavLink to="/operator">Operator</NavLink> : null}
          </nav>
        ) : null}
        <main id="content" className="operate">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
