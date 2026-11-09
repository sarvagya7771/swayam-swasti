import { useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  Avatar,
  BookingPill,
  EmptyState,
  Field,
  Icon,
  Loading,
  SectionHead,
  StarRating,
  TestimonialPill,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { formatDate, formatDateTime } from '../lib/format';
import type {
  AdminCustomer,
  AdminNotification,
  Booking,
  BookingStatus,
  Role,
  Testimonial,
  TestimonialStatus,
} from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { hasErrors, TESTIMONIAL_MAX, TESTIMONIAL_MIN, validateTestimonial, type FieldErrors } from '../lib/validation';

type Tab = 'testimonials' | 'customers' | 'bookings' | 'notifications';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'testimonials', label: 'Testimonials', icon: 'heart' },
  { id: 'customers', label: 'Customers', icon: 'user' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
];

const TESTIMONIAL_FILTERS: { id: TestimonialStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];

interface TestimonialDraft {
  id: string | null;
  userId: string;
  authorName: string;
  rating: number;
  content: string;
  status: TestimonialStatus;
  adminNote: string;
}

const emptyDraft = (): TestimonialDraft => ({
  id: null,
  userId: '',
  authorName: '',
  rating: 5,
  content: '',
  status: 'approved',
  adminNote: '',
});

export default function Admin() {
  const { profile } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState<Tab>('testimonials');
  const [filter, setFilter] = useState<TestimonialStatus | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const testimonials = useAsync<Testimonial[]>(
    () => getBackend().adminListTestimonials(filter),
    [filter],
  );
  const customers = useAsync<AdminCustomer[]>(() => getBackend().adminListCustomers(), []);
  const bookings = useAsync<Booking[]>(() => getBackend().adminListBookings(), []);
  const notifications = useAsync<AdminNotification[]>(() => getBackend().adminListNotifications(100), []);

  const pendingCount = useMemo(
    () => (testimonials.data ?? []).filter((item) => item.status === 'pending').length,
    [testimonials.data],
  );

  /* ------------------------------------------------------ testimonial form */

  const [draft, setDraft] = useState<TestimonialDraft | null>(null);
  const [draftErrors, setDraftErrors] = useState<FieldErrors>({});
  const [draftBusy, setDraftBusy] = useState(false);

  function openCreate() {
    setDraft(emptyDraft());
    setDraftErrors({});
  }

  function openEdit(item: Testimonial) {
    setDraft({
      id: item.id,
      userId: '',
      authorName: item.authorName,
      rating: item.rating,
      content: item.content,
      status: item.status,
      adminNote: item.adminNote ?? '',
    });
    setDraftErrors({});
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;

    const errors = validateTestimonial({ rating: draft.rating, content: draft.content });
    if (!draft.authorName.trim()) errors.authorName = 'A display name is required.';
    setDraftErrors(errors);
    if (hasErrors(errors)) return;

    setDraftBusy(true);
    try {
      if (draft.id) {
        await getBackend().adminUpdateTestimonial({
          id: draft.id,
          authorName: draft.authorName.trim(),
          rating: draft.rating,
          content: draft.content.trim(),
          status: draft.status,
          adminNote: draft.adminNote.trim() || undefined,
        });
        notify('Testimonial updated.', 'success');
      } else {
        await getBackend().adminCreateTestimonial({
          userId: draft.userId || null,
          authorName: draft.authorName.trim(),
          rating: draft.rating,
          content: draft.content.trim(),
          status: draft.status,
          adminNote: draft.adminNote.trim() || undefined,
        });
        notify('Testimonial created.', 'success');
      }
      setDraft(null);
      testimonials.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save the testimonial.', 'error');
    } finally {
      setDraftBusy(false);
    }
  }

  async function review(item: Testimonial, status: 'approved' | 'rejected') {
    let note = '';
    if (status === 'rejected') {
      const answer = window.prompt(
        'Optional: add a short note explaining the decision (visible to the customer).',
        item.adminNote ?? '',
      );
      if (answer === null) return;
      note = answer;
    }

    setBusyId(item.id);
    try {
      await getBackend().adminReviewTestimonial({ id: item.id, status, note: note.trim() });
      notify(status === 'approved' ? 'Testimonial approved and published.' : 'Testimonial rejected.', 'success');
      testimonials.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update the testimonial.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function removeTestimonial(item: Testimonial) {
    if (!window.confirm('Delete this testimonial permanently? This cannot be undone.')) return;
    setBusyId(item.id);
    try {
      await getBackend().adminDeleteTestimonial(item.id);
      notify('Testimonial deleted.', 'success');
      testimonials.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete the testimonial.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* --------------------------------------------------------- customer form */

  const [customerDraft, setCustomerDraft] = useState<{
    id: string;
    fullName: string;
    phone: string;
    role: Role;
    email: string;
  } | null>(null);
  const [customerBusy, setCustomerBusy] = useState(false);

  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault();
    if (!customerDraft) return;
    if (!customerDraft.fullName.trim()) {
      notify('A name is required.', 'error');
      return;
    }

    setCustomerBusy(true);
    try {
      await getBackend().adminUpdateCustomer({
        id: customerDraft.id,
        fullName: customerDraft.fullName.trim(),
        phone: customerDraft.phone.trim(),
        role: customerDraft.role,
      });
      notify('Customer updated.', 'success');
      setCustomerDraft(null);
      customers.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update the customer.', 'error');
    } finally {
      setCustomerBusy(false);
    }
  }

  /* ---------------------------------------------------------- booking form */

  const [bookingDraft, setBookingDraft] = useState<{
    id: string;
    status: BookingStatus;
    scheduledAt: string;
  } | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  async function saveBooking(event: React.FormEvent) {
    event.preventDefault();
    if (!bookingDraft) return;

    setBookingBusy(true);
    try {
      await getBackend().adminUpdateBooking({
        id: bookingDraft.id,
        status: bookingDraft.status,
        scheduledAt: bookingDraft.scheduledAt
          ? new Date(bookingDraft.scheduledAt).toISOString()
          : undefined,
      });
      notify('Booking updated and the customer notified.', 'success');
      setBookingDraft(null);
      bookings.reload();
      notifications.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update the booking.', 'error');
    } finally {
      setBookingBusy(false);
    }
  }

  async function removeBooking(item: Booking) {
    if (!window.confirm('Delete this booking permanently?')) return;
    setBusyId(item.id);
    try {
      await getBackend().adminDeleteBooking(item.id);
      notify('Booking deleted.', 'success');
      bookings.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete the booking.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* ----------------------------------------------------- notification form */

  const [notificationDraft, setNotificationDraft] = useState<{
    userId: string;
    title: string;
    body: string;
  } | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);

  async function sendNotification(event: React.FormEvent) {
    event.preventDefault();
    if (!notificationDraft) return;
    if (!notificationDraft.userId) {
      notify('Choose a recipient.', 'error');
      return;
    }
    if (!notificationDraft.title.trim() || !notificationDraft.body.trim()) {
      notify('A title and message are required.', 'error');
      return;
    }

    setNotificationBusy(true);
    try {
      await getBackend().adminSendNotification({
        userId: notificationDraft.userId,
        title: notificationDraft.title.trim(),
        body: notificationDraft.body.trim(),
      });
      notify('Notification sent.', 'success');
      setNotificationDraft(null);
      notifications.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send the notification.', 'error');
    } finally {
      setNotificationBusy(false);
    }
  }

  async function removeNotification(item: AdminNotification) {
    if (!window.confirm('Delete this notification from the customer’s inbox?')) return;
    setBusyId(item.id);
    try {
      await getBackend().adminDeleteNotification(item.id);
      notify('Notification deleted.', 'success');
      notifications.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete the notification.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* ------------------------------------------------------------------ view */

  return (
    <div className="stack gap-20">
      <header className="card card-pad-lg admin-head">
        <div>
          <p className="eyebrow">
            <Icon name="shield" size={14} /> Administrator
          </p>
          <h1 className="h1">Admin dashboard</h1>
          <p className="small muted">
            Signed in as {profile?.email}. Every action here is authorised by database row-level
            security.
          </p>
        </div>
        <div className="admin-head-stats">
          <div className="stat">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending reviews</span>
          </div>
          <div className="stat">
            <span className="stat-value">{customers.data?.length ?? 0}</span>
            <span className="stat-label">Customers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{bookings.data?.length ?? 0}</span>
            <span className="stat-label">Bookings</span>
          </div>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'testimonials' && (
        <section className="card">
          <SectionHead
            eyebrow="Moderation"
            title="Testimonials"
            action={
              <button className="btn btn-primary btn-sm" type="button" onClick={openCreate}>
                <Icon name="plus" size={15} /> Add testimonial
              </button>
            }
          />

          <div className="chip-row" role="group" aria-label="Filter testimonials">
            {TESTIMONIAL_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip ${filter === item.id ? 'chip-active' : ''}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {testimonials.loading ? (
            <Loading label="Loading testimonials…" />
          ) : testimonials.error ? (
            <p className="field-error" role="alert">{testimonials.error}</p>
          ) : (testimonials.data ?? []).length === 0 ? (
            <EmptyState
              icon="heart"
              title="Nothing here yet"
              message={
                filter === 'pending'
                  ? 'No testimonials are waiting for review.'
                  : 'No testimonials match this filter.'
              }
            />
          ) : (
            <div className="rows">
              {(testimonials.data ?? []).map((item) => (
                <article className="list-item admin-row" key={item.id}>
                  <div className="list-item-main">
                    <div className="list-item-top">
                      <strong>{item.authorName}</strong>
                      <TestimonialPill status={item.status} />
                    </div>
                    <StarRating value={item.rating} size={13} />
                    <p className="small muted">{item.content}</p>
                    <p className="tiny muted">
                      Submitted {formatDate(item.createdAt)}
                      {item.adminNote ? ` · Note: ${item.adminNote}` : ''}
                    </p>
                  </div>

                  <div className="admin-row-actions">
                    {item.status !== 'approved' && (
                      <button
                        className="btn btn-success btn-sm"
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => review(item, 'approved')}
                      >
                        <Icon name="check" size={14} /> Approve
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => review(item, 'rejected')}
                      >
                        <Icon name="x" size={14} /> Reject
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => openEdit(item)}>
                      <Icon name="edit" size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => removeTestimonial(item)}
                    >
                      <Icon name="trash" size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'customers' && (
        <section className="card">
          <SectionHead eyebrow="People" title="Customers" />
          {customers.loading ? (
            <Loading label="Loading customers…" />
          ) : customers.error ? (
            <p className="field-error" role="alert">{customers.error}</p>
          ) : (customers.data ?? []).length === 0 ? (
            <EmptyState icon="user" title="No customers yet" message="New sign-ups will appear here." />
          ) : (
            <div className="rows">
              {(customers.data ?? []).map((customer) => (
                <article className="list-item admin-row" key={customer.id}>
                  <div className="row gap-12">
                    <Avatar name={customer.fullName || customer.email} size={40} />
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{customer.fullName || 'Unnamed customer'}</strong>
                        <span className={`badge ${customer.role === 'admin' ? 'badge-brand' : 'badge-neutral'}`}>
                          {customer.role}
                        </span>
                      </div>
                      <p className="tiny muted">{customer.email}</p>
                      <p className="tiny muted">
                        {customer.phone || 'No phone'} · {customer.bookingCount} booking
                        {customer.bookingCount === 1 ? '' : 's'} · {customer.testimonialCount} testimonial
                        {customer.testimonialCount === 1 ? '' : 's'} · joined {formatDate(customer.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() =>
                        setCustomerDraft({
                          id: customer.id,
                          fullName: customer.fullName,
                          phone: customer.phone,
                          role: customer.role,
                          email: customer.email,
                        })
                      }
                    >
                      <Icon name="edit" size={14} /> Manage
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() =>
                        setNotificationDraft({ userId: customer.id, title: '', body: '' })
                      }
                    >
                      <Icon name="bell" size={14} /> Message
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'bookings' && (
        <section className="card">
          <SectionHead eyebrow="Sessions" title="Bookings" />
          {bookings.loading ? (
            <Loading label="Loading bookings…" />
          ) : bookings.error ? (
            <p className="field-error" role="alert">{bookings.error}</p>
          ) : (bookings.data ?? []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No bookings yet"
              message="Bookings created in your booking system will appear here once they share this database."
            />
          ) : (
            <div className="rows">
              {(bookings.data ?? []).map((booking) => (
                <article className="list-item admin-row" key={booking.id}>
                  <div className="list-item-main">
                    <div className="list-item-top">
                      <strong>{booking.serviceName}</strong>
                      <BookingPill status={booking.status} />
                    </div>
                    <p className="small muted">{formatDateTime(booking.scheduledAt)}</p>
                    <p className="tiny muted">
                      {booking.customerName || booking.customerEmail || 'Customer'}
                      {booking.reference ? ` · Ref ${booking.reference}` : ''}
                      {booking.notes ? ` · ${booking.notes}` : ''}
                    </p>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() =>
                        setBookingDraft({
                          id: booking.id,
                          status: booking.status,
                          scheduledAt: booking.scheduledAt.slice(0, 16),
                        })
                      }
                    >
                      <Icon name="edit" size={14} /> Update
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      disabled={busyId === booking.id}
                      onClick={() => removeBooking(booking)}
                    >
                      <Icon name="trash" size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'notifications' && (
        <section className="card">
          <SectionHead
            eyebrow="Outreach"
            title="Notifications"
            action={
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={() => setNotificationDraft({ userId: '', title: '', body: '' })}
              >
                <Icon name="plus" size={15} /> Send notification
              </button>
            }
          />
          {notifications.loading ? (
            <Loading label="Loading notifications…" />
          ) : notifications.error ? (
            <p className="field-error" role="alert">{notifications.error}</p>
          ) : (notifications.data ?? []).length === 0 ? (
            <EmptyState
              icon="bell"
              title="No notifications sent"
              message="Booking updates are created automatically. You can also send a message to any customer."
            />
          ) : (
            <div className="rows">
              {(notifications.data ?? []).map((item) => (
                <article className="list-item admin-row" key={item.id}>
                  <div className="list-item-main">
                    <div className="list-item-top">
                      <strong>{item.title}</strong>
                      <span className="badge badge-neutral">{item.type}</span>
                    </div>
                    <p className="small muted">{item.body}</p>
                    <p className="tiny muted">
                      To {item.recipientName || item.recipientEmail} · {formatDateTime(item.createdAt)}
                      {item.read ? ' · read' : ' · unread'}
                    </p>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => removeNotification(item)}
                    >
                      <Icon name="trash" size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------ modals */}

      <Modal
        open={draft !== null}
        title={draft?.id ? 'Edit testimonial' : 'Add testimonial'}
        description="Only approved testimonials appear on the public site."
        onClose={() => setDraft(null)}
      >
        {draft && (
          <form className="stack gap-12" onSubmit={saveDraft} noValidate>
            <Field label="Display name" htmlFor="authorName" error={draftErrors.authorName}>
              <input
                id="authorName"
                className="input"
                value={draft.authorName}
                onChange={(event) => setDraft({ ...draft, authorName: event.target.value })}
              />
            </Field>

            <Field label="Rating" htmlFor="rating">
              <StarRating
                value={draft.rating}
                onChange={(value) => setDraft({ ...draft, rating: value })}
                size={22}
              />
            </Field>

            <Field
              label="Testimonial"
              htmlFor="content"
              error={draftErrors.content}
              hint={`${draft.content.trim().length}/${TESTIMONIAL_MAX} — at least ${TESTIMONIAL_MIN}.`}
            >
              <textarea
                id="content"
                className="textarea"
                rows={5}
                maxLength={TESTIMONIAL_MAX}
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
              />
            </Field>

            <div className="grid grid-2">
              <Field label="Status" htmlFor="status">
                <select
                  id="status"
                  className="input"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as TestimonialStatus })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>

              <Field label="Internal note (optional)" htmlFor="adminNote">
                <input
                  id="adminNote"
                  className="input"
                  value={draft.adminNote}
                  onChange={(event) => setDraft({ ...draft, adminNote: event.target.value })}
                />
              </Field>
            </div>

            <div className="row-wrap">
              <button className="btn btn-primary" type="submit" disabled={draftBusy}>
                {draftBusy ? 'Saving…' : draft.id ? 'Save changes' : 'Create testimonial'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={customerDraft !== null}
        title="Manage customer"
        description={customerDraft?.email}
        onClose={() => setCustomerDraft(null)}
      >
        {customerDraft && (
          <form className="stack gap-12" onSubmit={saveCustomer} noValidate>
            <Field label="Full name" htmlFor="custName">
              <input
                id="custName"
                className="input"
                value={customerDraft.fullName}
                onChange={(event) => setCustomerDraft({ ...customerDraft, fullName: event.target.value })}
              />
            </Field>
            <Field label="Phone" htmlFor="custPhone">
              <input
                id="custPhone"
                className="input"
                type="tel"
                inputMode="tel"
                value={customerDraft.phone}
                onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })}
              />
            </Field>
            <Field
              label="Role"
              htmlFor="custRole"
              hint="Admins can moderate testimonials and manage customers."
            >
              <select
                id="custRole"
                className="input"
                value={customerDraft.role}
                onChange={(event) =>
                  setCustomerDraft({ ...customerDraft, role: event.target.value as Role })
                }
              >
                <option value="customer">Customer</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>
            <div className="row-wrap">
              <button className="btn btn-primary" type="submit" disabled={customerBusy}>
                {customerBusy ? 'Saving…' : 'Save customer'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setCustomerDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={bookingDraft !== null}
        title="Update booking"
        description="Saving a status change notifies the customer automatically."
        onClose={() => setBookingDraft(null)}
      >
        {bookingDraft && (
          <form className="stack gap-12" onSubmit={saveBooking} noValidate>
            <Field label="Status" htmlFor="bookingStatus">
              <select
                id="bookingStatus"
                className="input"
                value={bookingDraft.status}
                onChange={(event) =>
                  setBookingDraft({ ...bookingDraft, status: event.target.value as BookingStatus })
                }
              >
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Session date and time" htmlFor="bookingDate">
              <input
                id="bookingDate"
                className="input"
                type="datetime-local"
                value={bookingDraft.scheduledAt}
                onChange={(event) => setBookingDraft({ ...bookingDraft, scheduledAt: event.target.value })}
              />
            </Field>
            <div className="row-wrap">
              <button className="btn btn-primary" type="submit" disabled={bookingBusy}>
                {bookingBusy ? 'Saving…' : 'Save booking'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setBookingDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={notificationDraft !== null}
        title="Send notification"
        description="The customer sees this in their in-app inbox."
        onClose={() => setNotificationDraft(null)}
      >
        {notificationDraft && (
          <form className="stack gap-12" onSubmit={sendNotification} noValidate>
            <Field label="Recipient" htmlFor="recipient">
              <select
                id="recipient"
                className="input"
                value={notificationDraft.userId}
                onChange={(event) =>
                  setNotificationDraft({ ...notificationDraft, userId: event.target.value })
                }
              >
                <option value="">Choose a customer…</option>
                {(customers.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName || customer.email} — {customer.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" htmlFor="notifTitle">
              <input
                id="notifTitle"
                className="input"
                maxLength={120}
                value={notificationDraft.title}
                onChange={(event) =>
                  setNotificationDraft({ ...notificationDraft, title: event.target.value })
                }
              />
            </Field>
            <Field label="Message" htmlFor="notifBody">
              <textarea
                id="notifBody"
                className="textarea"
                rows={4}
                maxLength={600}
                value={notificationDraft.body}
                onChange={(event) =>
                  setNotificationDraft({ ...notificationDraft, body: event.target.value })
                }
              />
            </Field>
            <div className="row-wrap">
              <button className="btn btn-primary" type="submit" disabled={notificationBusy}>
                {notificationBusy ? 'Sending…' : 'Send notification'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setNotificationDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
