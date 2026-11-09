import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Avatar, Field, Icon, Loading, SectionHead } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend, isDemoBackend } from '../lib/backend';
import { formatDate } from '../lib/format';
import type { Booking } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { hasErrors, validateFullName, type FieldErrors } from '../lib/validation';

export default function Profile() {
  const { profile, refresh, signOut, applyProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const demo = isDemoBackend();
  const backend = getBackend();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const bookings = useAsync<Booking[]>(() => backend.listBookings(), [profile?.id]);
  const notifications = useAsync(() => backend.listNotifications(), [profile?.id]);

  if (!profile) return <Loading label="Loading your profile…" />;

  const completed = (bookings.data ?? []).filter((item) => item.status === 'completed').length;
  const unread = (notifications.data ?? []).filter((item) => !item.read).length;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const nameError = validateFullName(fullName);
    if (nameError) nextErrors.fullName = nameError;
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    try {
      const updated = await backend.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      applyProfile(updated);
      notify('Profile updated.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save your profile.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    notify('You have been signed out.', 'info');
    navigate('/', { replace: true });
  }

  async function handleDemoRole(role: 'customer' | 'admin') {
    if (!backend.demo) return;
    setBusy(true);
    try {
      const updated = await backend.demo.setRole(role);
      applyProfile(updated);
      await refresh();
      notify(role === 'admin' ? 'Demo role: admin console unlocked.' : 'Demo role: customer.', 'info');
    } finally {
      setBusy(false);
    }
  }

  async function handleSimulateBooking() {
    if (!backend.demo || !profile) return;
    setBusy(true);
    try {
      await backend.demo.simulateBookingUpdate({
        userId: profile.id,
        serviceName: 'Demo consultation',
        status: 'confirmed',
      });
      bookings.reload();
      notifications.reload();
      notify('Simulated booking update — see Notifications.', 'success');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!backend.demo) return;
    await backend.demo.resetDemoData();
    await refresh();
    notify('Demo data cleared.', 'info');
    navigate('/', { replace: true });
  }

  return (
    <div className="stack gap-20">
      <section className="card profile-head">
        <Avatar name={profile.fullName || profile.email} size={64} />
        <div className="list-item-main">
          <div className="row gap-8">
            <h1 className="h2">{profile.fullName || 'Swayam Swasti customer'}</h1>
            {profile.role === 'admin' && <span className="badge badge-gold">Admin</span>}
          </div>
          <p className="small muted profile-email">{profile.email}</p>
          <p className="tiny muted">Member since {formatDate(profile.createdAt)}</p>
        </div>
      </section>

      <div className="grid grid-3">
        <div className="card stat">
          <span className="stat-value">{bookings.data?.length ?? 0}</span>
          <span className="stat-label">Total sessions</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{unread}</span>
          <span className="stat-label">Unread updates</span>
        </div>
      </div>

      <section className="card">
        <SectionHead eyebrow="Details" title="Your information" />
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

          <Field label="Phone" htmlFor="phone" hint="Used only to reach you about your sessions.">
            <input
              id="phone"
              className="input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="emailReadonly" hint="Contact us if you need to change your email.">
            <input id="emailReadonly" className="input" value={profile.email} readOnly disabled />
          </Field>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="card">
        <SectionHead eyebrow="Shortcuts" title="Quick links" />
        <div className="rows">
          <Link className="row-link" to="/bookings">
            <div className="list-item">
              <div className="row gap-12">
                <Icon name="calendar" size={18} />
                <span>Booking history</span>
              </div>
              <Icon name="chevron" size={16} />
            </div>
          </Link>
          <Link className="row-link" to="/notifications">
            <div className="list-item">
              <div className="row gap-12">
                <Icon name="bell" size={18} />
                <span>Notifications</span>
              </div>
              <Icon name="chevron" size={16} />
            </div>
          </Link>
          <Link className="row-link" to="/testimonials">
            <div className="list-item">
              <div className="row gap-12">
                <Icon name="heart" size={18} />
                <span>Share a testimonial</span>
              </div>
              <Icon name="chevron" size={16} />
            </div>
          </Link>
          {profile.role === 'admin' && (
            <Link className="row-link" to="/admin">
              <div className="list-item">
                <div className="row gap-12">
                  <Icon name="shield" size={18} />
                  <span>Admin console</span>
                </div>
                <Icon name="chevron" size={16} />
              </div>
            </Link>
          )}
        </div>
      </section>

      {demo && backend.demo && (
        <section className="card">
          <SectionHead eyebrow="Demo only" title="Demo controls" />
          <p className="small muted mb-12">
            These controls exist only in demo mode so you can try the admin approval flow without a backend. They are
            absent when Supabase is connected.
          </p>
          <div className="row-wrap">
            <button className="btn btn-outline btn-sm" type="button" onClick={() => handleDemoRole('admin')} disabled={busy}>
              Switch to admin
            </button>
            <button className="btn btn-outline btn-sm" type="button" onClick={() => handleDemoRole('customer')} disabled={busy}>
              Switch to customer
            </button>
            <button className="btn btn-outline btn-sm" type="button" onClick={handleSimulateBooking} disabled={busy}>
              Simulate booking update
            </button>
            <button className="btn btn-danger btn-sm" type="button" onClick={handleReset} disabled={busy}>
              Reset demo data
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <SectionHead eyebrow="Account" title="Session" />
        <button className="btn btn-ghost" type="button" onClick={handleSignOut}>
          <Icon name="logout" size={16} /> Sign out
        </button>
      </section>
    </div>
  );
}
