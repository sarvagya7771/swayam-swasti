import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Icon, Loading } from './ui';

/**
 * Route guard.
 *
 * `adminOnly` is a convenience for the UI only — it hides the dashboard from
 * customers. The real enforcement is in Postgres: every admin table operation
 * is checked against `profiles.role = 'admin'` by row-level security, so a
 * customer who forges a request still gets nothing back.
 */
export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card center" style={{ padding: 48 }}>
        <Loading label="Checking your session…" />
      </div>
    );
  }

  if (!profile) {
    const next = encodeURIComponent(location.pathname);
    return (
      <div className="card">
        <EmptyState
          icon="lock"
          title="Please sign in"
          message="This page is private. Sign in to continue."
          action={
            <div className="row-wrap center">
              <Link className="btn btn-primary btn-sm" to={`/login?next=${next}`}>
                Sign in
              </Link>
              <Link className="btn btn-ghost btn-sm" to={`/signup?next=${next}`}>
                Create account
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (adminOnly && profile.role !== 'admin') {
    return (
      <div className="card">
        <EmptyState
          icon="shield"
          title="Administrators only"
          message="Your account does not have administrator access. If you believe this is a mistake, ask the site owner to grant your profile the admin role."
          action={
            <Link className="btn btn-outline btn-sm" to="/">
              <Icon name="home" size={15} /> Back to home
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
