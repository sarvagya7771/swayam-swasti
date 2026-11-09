import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Field, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend, isDemoBackend } from '../lib/backend';
import { validateEmail } from '../lib/validation';

export default function Login() {
  const { profile, refresh } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const demo = isDemoBackend();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (profile) {
    navigate('/profile', { replace: true });
  }

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;
    if (!password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await getBackend().signInWithEmail({ email: email.trim(), password });
      await refresh();
      notify('Welcome back.', 'success');
      navigate('/profile', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not sign in.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      await getBackend().signInWithGoogle();
      if (demo) {
        await refresh();
        navigate('/profile', { replace: true });
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Google sign-in is unavailable.', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card card-pad-lg">
        <div className="auth-head">
          <span className="brand-mark">
            <Icon name="lotus" size={26} />
          </span>
          <h1 className="h1">Welcome back</h1>
          <p className="small muted">Sign in to see your sessions, updates and reflections.</p>
        </div>

        {demo && (
          <div className="notice notice-brand">
            <Icon name="sparkle" size={16} />
            <span>
              <strong>Demo mode.</strong> Sign in with the account you created here, or use Google (simulated). No data
              leaves this browser.
            </span>
          </div>
        )}

        <button className="google-btn" type="button" onClick={handleGoogle} disabled={busy}>
          <Icon name="google" size={18} />
          Continue with Google
        </button>

        <div className="divider"><span className="tiny muted">or use email</span></div>

        <form className="stack gap-12" onSubmit={handleEmail} noValidate>
          <Field label="Email" htmlFor="email" error={errors.email}>
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

          <Field label="Password" htmlFor="password" error={errors.password}>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="small muted center">
          New here?{' '}
          <Link className="grad-text" to="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
