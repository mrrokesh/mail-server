import { Mail } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useLoginBrand } from '../../features/auth/use-brand';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';

export function AuthShell() {
  const brand = useLoginBrand();
  return (
    <div className="auth-shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            {brand.logoUrl ? (
              <img className="brand-logo" src={brand.logoUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="brand-mark" aria-hidden="true">
                <Icon icon={Mail} size={18} />
              </span>
            )}
            <span>{brand.productName}</span>
          </Link>
          <div className="nav-tools">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="content" className="auth-main">
        <div className="auth-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
