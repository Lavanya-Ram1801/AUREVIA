import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/admin' : role === 'INSTRUCTOR' ? '/instructor' : '/dashboard');

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
