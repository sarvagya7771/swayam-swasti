import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loading } from './ui';

/**
 * Route guard. Access decisions mirror the database policies: the UI guard is
 * a convenience, while Row Level Security is the actual enforcement point.
 */
export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your session…" />;

  if (!profile) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (adminOnly && profile.role !== 'admin') {
    return (
      <EmptyState
        icon="shield"
        title="Administrator access only"
        message="This area is limited to the Swayam Swasti team. If you believe you should have access, ask the owner to grant your account the admin role."
      />
    );
  }

  return <>{children}</>;
}
