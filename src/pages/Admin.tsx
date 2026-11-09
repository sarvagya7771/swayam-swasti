import { useState } from 'react';
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
import { getBackend } from '../lib/backend';
import { formatDate, formatDateTime } from '../lib/format';
import type { AdminCustomer, Booking, Testimonial, TestimonialStatus } from '../lib/types';
import { useAsync } from '../lib/useAsync';

type Tab = 'pending' | 'all' | 'customers' | 'bookings' | 'notify';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All reviews' },
  { id: 'customers', label: 'Customers' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'notify', label: 'Send update' },
];

export default function Admin() {
  const backend = getBackend();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reviews = useAsync<Testimonial[]>(
    () => backend.adminListTestimonials(tab === 'all' ? 'all' : 'pending'),
    [tab],
  );
  const customers = useAsync<AdminCustomer[]>(
    () => (tab === 'customers' ? backend.adminListCustomers() : Promise.resolve([])),
    [tab],
  );
  const bookings = useAsync<Booking[]>(
    () => (tab === 'bookings' ? backend.adminListBookings() : Promise.resolve([])),
    [tab],
  );

  const [targetUser, setTargetUser] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function review(id: string, status: Extract<TestimonialStatus, 'approved' | 'rejected'>) {
    setBusyId(id);
    try {
      await backend.adminReviewTestimonial({ id, status, note });
      setNote('');
      reviews.reload();
      notify(status === 'approved' ? 'Testimonial published.' : 'Testimonial rejected.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update the testimonial.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function sendUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!targetUser) {
      notify('Choose a customer first.', 'error');
      return;
    }
    if (!title.trim() || !body.trim()) {
      notify('A title and message are required.', 'error');
      return;
    }
    try {
      await backend.adminSendNotification({ userId: targetUser, title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      notify('Notification sent.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send the notification.', 'error');
    }
  }

  return (
    <div className="stack gap-20">
      <header>
        <p className="eyebrow">
          <Icon name="shield" size={14} /> Restricted
        </p>
        <h1 className="h1">Admin console</h1>
        <p className="lead">
          Review customer submissions and manage accounts. Access is enforced by database policies, not just this
          screen.
        </p>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`chip ${tab === item.id ? 'chip-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(tab === 'pending' || tab === 'all') && (
        <section className="card">
          <SectionHead
            eyebrow="Moderation"
            title={tab === 'pending' ? 'Awaiting your review' : 'All testimonials'}
          />
          {reviews.loading ? (
            <Loading label="Loading testimonials…" />
          ) : (reviews.data ?? []).length === 0 ? (
            <EmptyState
              icon="check"
              title={tab === 'pending' ? 'Nothing waiting for review' : 'No testimonials yet'}
              message="Customer submissions appear here before they are published."
            />
          ) : (
            <div className="rows">
              {(reviews.data ?? []).map((item) => (
                <div className="list-item" key={item.id}>
                  <div className="list-item-main">
                    <div className="list-item-top">
                      <strong>{item.authorName || 'Customer'}</strong>
                      <TestimonialPill status={item.status} />
                    </div>
                    <StarRating value={item.rating} size={13} />
                    <p className="small">{item.content}</p>
                    <p className="tiny muted">Submitted {formatDate(item.createdAt)}</p>

                    {item.status === 'pending' && (
                      <>
                        <input
                          className="input mt-8"
                          placeholder="Optional note to the customer"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                        />
                        <div className="review-actions mt-8">
                          <button
                            className="btn btn-success btn-sm"
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => review(item.id, 'approved')}
                          >
                            <Icon name="check" size={14} /> Approve &amp; publish
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => review(item.id, 'rejected')}
                          >
                            <Icon name="x" size={14} /> Reject
                          </button>
                        </div>
                      </>
                    )}
                    {item.adminNote && <p className="tiny muted">Your note: {item.adminNote}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'customers' && (
        <section className="card">
          <SectionHead eyebrow="Accounts" title="Registered customers" />
          {customers.loading ? (
            <Loading label="Loading customers…" />
          ) : (customers.data ?? []).length === 0 ? (
            <EmptyState icon="user" title="No customers yet" message="New registrations will be listed here." />
          ) : (
            <div className="rows">
              {(customers.data ?? []).map((customer) => (
                <div className="list-item" key={customer.id}>
                  <div className="row gap-12">
                    <Avatar name={customer.fullName || customer.email} size={40} />
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{customer.fullName || 'Unnamed customer'}</strong>
                        <span className="badge badge-brand">{customer.bookingCount} bookings</span>
                      </div>
                      <p className="small muted">{customer.email}</p>
                      <p className="tiny muted">
                        Joined {formatDate(customer.createdAt)}
                        {customer.phone ? ` · ${customer.phone}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'bookings' && (
        <section className="card">
          <SectionHead eyebrow="Schedule" title="All bookings" />
          {bookings.loading ? (
            <Loading label="Loading bookings…" />
          ) : (bookings.data ?? []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No bookings yet"
              message="Bookings created by your existing booking site appear here once connected."
            />
          ) : (
            <div className="rows">
              {(bookings.data ?? []).map((booking) => (
                <div className="list-item" key={booking.id}>
                  <div className="list-item-main">
                    <div className="list-item-top">
                      <strong>{booking.serviceName}</strong>
                      <BookingPill status={booking.status} />
                    </div>
                    <p className="small muted">{formatDateTime(booking.scheduledAt)}</p>
                    {booking.reference && <p className="tiny muted">Reference {booking.reference}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'notify' && (
        <section className="card">
          <SectionHead eyebrow="Messaging" title="Send a booking update" />
          {customers.loading ? (
            <Loading label="Loading customers…" />
          ) : (
            <form className="stack gap-12" onSubmit={sendUpdate}>
              <Field label="Customer" htmlFor="targetUser">
                <select
                  id="targetUser"
                  className="select"
                  value={targetUser}
                  onChange={(event) => setTargetUser(event.target.value)}
                >
                  <option value="">Choose a customer…</option>
                  {(customers.data ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName || customer.email}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Title" htmlFor="title">
                <input id="title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>

              <Field label="Message" htmlFor="body">
                <textarea
                  id="body"
                  className="textarea"
                  rows={4}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>

              <button className="btn btn-primary" type="submit">
                <Icon name="bell" size={16} /> Send notification
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
