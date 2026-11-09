import { Link } from 'react-router-dom';
import { BookingPill, EmptyState, Icon, Loading } from '../components/ui';
import { getBackend } from '../lib/backend';
import { config } from '../lib/config';
import { bookingStatusLabel, formatDateTime } from '../lib/format';
import type { Booking } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Bookings() {
  const bookings = useAsync<Booking[]>(() => getBackend().listBookings(), []);

  const items = bookings.data ?? [];
  const upcoming = items.filter((item) => item.status === 'confirmed' || item.status === 'pending' || item.status === 'rescheduled');
  const past = items.filter((item) => !upcoming.includes(item));

  return (
    <div className="stack gap-20">
      <header className="between">
        <div>
          <p className="eyebrow">
            <Icon name="calendar" size={14} /> Your sessions
          </p>
          <h1 className="h1">Booking history</h1>
        </div>
        {config.bookingSiteUrl && (
          <a className="btn btn-outline btn-sm" href={config.bookingSiteUrl} target="_blank" rel="noreferrer">
            Book a session
          </a>
        )}
      </header>

      {bookings.loading ? (
        <Loading label="Loading your bookings…" />
      ) : bookings.error ? (
        <EmptyState icon="x" title="Could not load bookings" message={bookings.error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No bookings yet"
          message="Sessions booked with your account email appear here automatically, together with any updates from our team."
          action={
            <div className="row-wrap center">
              {config.bookingSiteUrl ? (
                <a className="btn btn-primary btn-sm" href={config.bookingSiteUrl} target="_blank" rel="noreferrer">
                  Open booking site
                </a>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/services">
                  View services
                </Link>
              )}
              <Link className="btn btn-ghost btn-sm" to="/notifications">
                View updates
              </Link>
            </div>
          }
        />
      ) : (
        <div className="stack gap-20">
          <section className="card">
            <h2 className="h3 mb-12">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="small muted">No upcoming sessions. Your past sessions are listed below.</p>
            ) : (
              <div className="rows">
                {upcoming.map((booking) => (
                  <div className="list-item" key={booking.id}>
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{booking.serviceName}</strong>
                        <BookingPill status={booking.status} />
                      </div>
                      <p className="small muted">{formatDateTime(booking.scheduledAt)}</p>
                      <p className="tiny muted">
                        {bookingStatusLabel[booking.status]}
                        {booking.reference ? ` · Reference ${booking.reference}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="card">
              <h2 className="h3 mb-12">Past sessions</h2>
              <div className="rows">
                {past.map((booking) => (
                  <div className="list-item" key={booking.id}>
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{booking.serviceName}</strong>
                        <BookingPill status={booking.status} />
                      </div>
                      <p className="small muted">{formatDateTime(booking.scheduledAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
