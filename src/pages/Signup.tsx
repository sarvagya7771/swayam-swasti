import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Field, Icon } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import {
  hasErrors,
  validateEmail,
  validateFullName,
  validatePassword,
  type FieldErrors,
} from '../lib/validation';

export default function Signup() {
  const { refresh } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/profile';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
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
        setConfirmSent(true);
        notify('Account created — confirm your email to finish signing in.', 'success');
        return;
      }

      await refresh();
      notify('Your account is ready. Welcome to Swayam Swasti.', 'success');
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setBusy(true);
    try {
      await getBackend().signInWithGoogle({ next });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Google sign-in is unavailable right now.');
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-head">
            <p className="eyebrow">
              <Icon name="mail" size={14} /> One more step
            </p>
            <h1 className="h1">Confirm your email</h1>
            <p className="small muted">
              We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account,
              then sign in.
            </p>
          </div>
          <Link className="btn btn-primary btn-block" to="/login">
            Go to sign in
          </Link>
          <p className="tiny muted center">
            Nothing arrived? Check spam, or ask the site owner to confirm the email settings in
            Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <p className="eyebrow">
            <Icon name="sparkle" size={14} /> Begin here
          </p>
          <h1 className="h1">Create your account</h1>
          <p className="small muted">
            Track your sessions, save guidance and share your experience when you are ready.
          </p>
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

          <Field label="Email address" htmlFor="email" error={errors.email}>
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

          {formError && (
            <p className="field-error" role="alert">
              {formError}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered?{' '}
          <Link className="grad-text" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
