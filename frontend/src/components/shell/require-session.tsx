import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../lib/session';

export function RequireSession() {
  const { user } = useSession();
  const location = useLocation();
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
