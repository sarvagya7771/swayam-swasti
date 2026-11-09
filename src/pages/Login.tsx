import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Field, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { validateEmail } from '../lib/validation';

export default function Login() {
  const { refresh } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const emailIssue = validateEmail(email);
    setEmailError(emailIssue);
    if (emailIssue) return;
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setBusy(true);
    try {
      await getBackend().signInWithEmail({ email: email.trim(), password });
      await refresh();
      notify('Welcome back.', 'success');
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await getBackend().signInWithGoogle({ next });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in is unavailable right now.');
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    const emailIssue = validateEmail(email);
    setEmailError(emailIssue);
    if (emailIssue) {
      setError('Enter your email address first, then tap “Forgot password”.');
      return;
    }

    setResetting(true);
    try {
      await getBackend().requestPasswordReset(email.trim());
      notify('Check your inbox for the password reset link.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <p className="eyebrow">
            <Icon name="sparkle" size={14} /> Welcome back
          </p>
          <h1 className="h1">Sign in to Swayam Swasti</h1>
          <p className="small muted">Your bookings, reflections and guidance in one quiet place.</p>
        </div>

        <button type="button" className="btn google-btn btn-block" onClick={handleGoogle} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
            />
            <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7z" />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="row gap-12">
          <hr className="divider" style={{ flex: 1 }} />
          <span className="tiny muted">or use email</span>
          <hr className="divider" style={{ flex: 1 }} />
        </div>

        <form className="stack gap-12" onSubmit={handleEmail} noValidate>
          <Field label="Email address" htmlFor="email" error={emailError}>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="between">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleForgotPassword} disabled={resetting}>
            {resetting ? 'Sending…' : 'Forgot password'}
          </button>
          <Link className="small" to="/signup">
            Create account
          </Link>
        </div>

        <p className="auth-switch">
          Protected by Supabase Auth. Your password is never stored by this app.
        </p>
      </div>
    </div>
  );
}
