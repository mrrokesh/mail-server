import { Mail } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';
import { useDataSource } from '../../lib/data-source';
import { useSession } from '../../lib/session';

export function WorkspaceShell() {
  const { user, signOut } = useSession();
  const source = useDataSource();
  const location = useLocation();
  const admin = location.pathname.startsWith('/admin');

  return (
    <div className="workspace">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/mail">
          <Icon icon={Mail} />
          <span>MR Rokesh</span>
        </Link>
        <nav className="workspace-links" aria-label="Workspace">
          <NavLink
            to="/mail"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Mail
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Chat
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Calendar
          </NavLink>
          <NavLink
            to="/contacts"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Contacts
          </NavLink>
          <NavLink
            to="/drive"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Drive
          </NavLink>
          <NavLink
            to="/documents"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Docs
          </NavLink>
          <NavLink
            to="/meet"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Meet
          </NavLink>
          <NavLink
            to="/booking"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Booking
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Tasks
          </NavLink>
          <NavLink
            to="/notes"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Notes
          </NavLink>
          <NavLink to="/ai" className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
            AI
          </NavLink>
          <NavLink
            to="/privacy"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Privacy
          </NavLink>
          <NavLink
            to="/campaigns"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Campaigns
          </NavLink>
          <NavLink to="/admin/domains" className={() => `nav-link${admin ? ' is-active' : ''}`}>
            Admin
          </NavLink>
        </nav>
        <div className="nav-tools">
          <ThemeToggle />
          <details className="account">
            <summary>{user?.name ?? 'Account'}</summary>
            <div className="account-menu">
              <p className="caption break">{user?.email}</p>
              <p className="caption muted">
                {user?.preview ? 'Preview session' : user?.organization}
              </p>
              <button type="button" className="btn btn-quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      {source === 'preview' ? (
        <p className="preview-banner caption">
          Sample data is showing because the API did not answer.
        </p>
      ) : null}
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
