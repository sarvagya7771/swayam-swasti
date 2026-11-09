import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Field, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { isSupabaseConfigured } from '../lib/config';
import { validatePassword } from '../lib/validation';

/** Landing page for the Supabase password-recovery email link. */
export default function ResetPassword() {
  const { profile, refresh } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHasSession(false);
      return;
    }
    let active = true;
    getBackend()
      .getSession()
      .then((next) => {
        if (active) setHasSession(Boolean(next));
      })
      .catch(() => {
        if (active) setHasSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const passwordIssue = validatePassword(password);
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    if (password !== confirm) {
      setError('Both passwords must match.');
      return;
    }

    setBusy(true);
    try {
      await getBackend().updatePassword(password);
      await refresh();
      notify('Your password has been updated.', 'success');
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  }

  if (hasSession === false) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-head">
            <p className="eyebrow">
              <Icon name="lock" size={14} /> Link expired
            </p>
            <h1 className="h1">Open the reset link again</h1>
            <p className="small muted">
              This password reset link is missing or has expired. Request a new one from the sign-in
              page.
            </p>
          </div>
          <Link className="btn btn-primary btn-block" to="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <p className="eyebrow">
            <Icon name="lock" size={14} /> Account security
          </p>
          <h1 className="h1">Choose a new password</h1>
          {profile?.email && <p className="small muted">Signing in as {profile.email}</p>}
        </div>

        <form className="stack gap-12" onSubmit={handleSubmit} noValidate>
          <Field label="New password" htmlFor="password" hint="At least 8 characters.">
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field label="Confirm new password" htmlFor="confirm">
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || hasSession === null}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
