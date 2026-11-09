import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Field, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend, isDemoBackend } from '../lib/backend';
import {
  hasErrors,
  validateEmail,
  validateFullName,
  validatePassword,
  type FieldErrors,
} from '../lib/validation';

export default function Signup() {
  const { profile, refresh } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const demo = isDemoBackend();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  if (profile) navigate('/', { replace: true });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = {
      ...validateFullName(fullName),
      ...validateEmail(email),
      ...validatePassword(password),
    };
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    try {
      const result = await getBackend().signUpWithEmail({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      if (result.needsEmailConfirmation) {
        notify('Check your inbox to confirm your email, then sign in.', 'success');
        navigate('/login', { replace: true });
        return;
      }

      await refresh();
      notify('Your account is ready. Welcome to Swayam Swasti.', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create your account.', 'error');
    } finally {
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
          <h1 className="h1">Create your account</h1>
          <p className="small muted">
            Keep your sessions, updates and reflections together in one private space.
          </p>
        </div>

        {demo && (
          <div className="notice notice-brand">
            <Icon name="sparkle" size={16} />
            <span>
              <strong>Demo mode.</strong> Accounts are stored only in this browser so you can try the full flow safely.
            </span>
          </div>
        )}

        <form className="stack gap-12" onSubmit={handleSubmit} noValidate>
          <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
            <input
              id="fullName"
              className="input"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>

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

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password}
            hint="At least 8 characters."
          >
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="small muted center">
          Already registered?{' '}
          <Link className="grad-text" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
