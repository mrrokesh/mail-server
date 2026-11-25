import { Mail } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';

export function AuthShell() {
  return (
    <div>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/">
          <Icon icon={Mail} />
          <span>MR Rokesh</span>
        </Link>
        <div className="nav-tools">
          <ThemeToggle />
        </div>
      </header>
      <main id="content" className="auth-main">
        <Outlet />
      </main>
    </div>
  );
}
