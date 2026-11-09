import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { isSupabaseConfigured } from '../lib/config';

/**
 * Landing page for Supabase auth redirects (Google OAuth, email confirmation
 * and password recovery). Supabase exchanges the code/token in the URL for a
 * session; we then forward the customer to where they were heading.
 */
export default function AuthCallback() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/profile';

  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const incomingError =
      params.get('error_description') || params.get('error') || hash.get('error_description');
    if (incomingError) {
      setError(decodeURIComponent(incomingError.replace(/\+/g, ' ')));
      return;
    }

    if (!isSupabaseConfigured) {
      setError('This app is not connected to a database yet.');
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const session = await getBackend().getSession();
        if (!active) return;
        if (session) {
          await refresh();
          if (!active) return;
          navigate(next, { replace: true });
          return;
        }
      } catch {
        /* fall through to retry */
      }
      if (!active) return;
      setAttempts((count) => {
        const nextCount = count + 1;
        if (nextCount >= 12) {
          setError('We could not complete the sign-in. Please try again.');
          return nextCount;
        }
        timer = setTimeout(check, 500);
        return nextCount;
      });
    };

    check();

    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-head">
            <p className="eyebrow">
              <Icon name="lock" size={14} /> Sign-in problem
            </p>
            <h1 className="h1">We could not finish signing you in</h1>
            <p className="small muted">{error}</p>
          </div>
          <Link className="btn btn-primary btn-block" to="/login">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card center">
        <Loading label={attempts > 4 ? 'Still checking your session…' : 'Completing sign-in…'} />
        <p className="tiny muted">You will be redirected in a moment.</p>
      </div>
    </div>
  );
}
