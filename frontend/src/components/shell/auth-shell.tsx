import { Mail } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useLoginBrand } from '../../features/auth/use-brand';
import { Icon } from '../ui/icon';
import { ThemeToggle } from '../ui/theme-toggle';

export function AuthShell() {
  const brand = useLoginBrand();
  return (
    <div>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/">
          {brand.logoUrl ? (
            <img className="brand-logo" src={brand.logoUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <Icon icon={Mail} />
          )}
          <span>{brand.productName}</span>
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
