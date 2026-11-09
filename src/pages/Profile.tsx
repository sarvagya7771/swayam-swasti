import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Avatar, EmptyState, Field, Icon, Loading, SectionHead } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { formatDate } from '../lib/format';
import { validateFullName, validatePhone } from '../lib/validation';

export default function Profile() {
  const { profile, loading, refresh, signOut } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string | null; phone?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone);
  }, [profile]);

  if (loading) {
    return (
      <div className="card center" style={{ padding: 48 }}>
        <Loading label="Loading your profile…" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <EmptyState
          icon="lock"
          title="You are signed out"
          message="Sign in to view and update your profile."
          action={
            <Link className="btn btn-primary btn-sm" to="/login">
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = {
      fullName: validateFullName(fullName),
      phone: validatePhone(phone),
    };
    setErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.phone) return;

    setBusy(true);
    try {
      await getBackend().updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      await refresh();
      notify('Profile updated.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save your profile.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      notify('Signed out.', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not sign out.', 'error');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="stack gap-20">
      <header className="card card-pad-lg">
        <div className="profile-head">
          <Avatar name={profile.fullName || profile.email} size={64} />
          <div className="stack gap-4">
            <h1 className="h1">{profile.fullName || 'Your profile'}</h1>
            <p className="small muted">{profile.email}</p>
            <div className="row-wrap">
              <span className={`badge ${profile.role === 'admin' ? 'badge-brand' : 'badge-neutral'}`}>
                {profile.role === 'admin' ? 'Administrator' : 'Customer'}
              </span>
              <span className="badge badge-neutral">Member since {formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-2">
        <section className="card">
          <SectionHead eyebrow="Details" title="Edit your information" />
          <form className="stack gap-12" onSubmit={handleSave} noValidate>
            <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
              <input
                id="fullName"
                className="input"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>

            <Field
              label="Phone number"
              htmlFor="phone"
              error={errors.phone}
              hint="Used only so the team can reach you about your session."
            >
              <input
                id="phone"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>

            <Field label="Email address" htmlFor="email" hint="Contact support to change your email.">
              <input id="email" className="input" value={profile.email} readOnly disabled />
            </Field>

            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className="card">
          <SectionHead eyebrow="Account" title="Your activity" />
          <div className="rows">
            <Link className="list-item list-link" to="/bookings">
              <div className="list-item-main">
                <strong>Booking history</strong>
                <p className="tiny muted">Every session and its current status.</p>
              </div>
              <Icon name="arrow" size={16} />
            </Link>
            <Link className="list-item list-link" to="/notifications">
              <div className="list-item-main">
                <strong>Notifications</strong>
                <p className="tiny muted">Updates about your bookings and reflections.</p>
              </div>
              <Icon name="arrow" size={16} />
            </Link>
            <Link className="list-item list-link" to="/testimonials">
              <div className="list-item-main">
                <strong>Your testimonials</strong>
                <p className="tiny muted">Submit a reflection and track its review.</p>
              </div>
              <Icon name="arrow" size={16} />
            </Link>
            {profile.role === 'admin' && (
              <Link className="list-item list-link" to="/admin">
                <div className="list-item-main">
                  <strong>Admin dashboard</strong>
                  <p className="tiny muted">Review testimonials, customers and bookings.</p>
                </div>
                <Icon name="shield" size={16} />
              </Link>
            )}
          </div>

          <div className="divider" />

          <button className="btn btn-outline btn-block" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <p className="tiny muted center mt-8">
            Sessions are handled by Supabase Auth and expire automatically.
          </p>
        </section>
      </div>
    </div>
  );
}
