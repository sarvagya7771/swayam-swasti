import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';

/**
 * Landing route for the Google OAuth redirect. Supabase parses the session from
 * the URL fragment; we simply refresh the profile and continue into the app.
 */
export default function AuthCallback() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) navigate('/', { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [refresh, navigate]);

  return <Loading label="Signing you in…" />;
}
