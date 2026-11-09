import { Link } from 'react-router-dom';
import { BookingPill, EmptyState, Icon, Loading, SectionHead, StarRating } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend } from '../lib/backend';
import { formatDateTime, relativeTime } from '../lib/format';
import type { Booking, GuidanceArticle, Service, Testimonial } from '../lib/types';
import { useAsync } from '../lib/useAsync';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { profile } = useAuth();

  const services = useAsync<Service[]>(() => getBackend().listServices(), []);
  const guidance = useAsync<GuidanceArticle[]>(() => getBackend().listGuidance(), []);
  const testimonials = useAsync<Testimonial[]>(() => getBackend().listApprovedTestimonials(), []);
  const bookings = useAsync<Booking[]>(
    () => (profile ? getBackend().listBookings() : Promise.resolve([])),
    [profile?.id],
  );

  const nextBooking = (bookings.data ?? [])
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  const firstName = profile?.fullName.trim().split(/\s+/)[0] ?? '';

  return (
    <div className="stack gap-24">
      <section className="hero card card-pad-lg">
        <div className="hero-orb" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow">
            <Icon name="sparkle" size={14} /> Swayam Swasti Spirituality
          </p>
          <h1 className="display">
            {profile
              ? `${greeting()}, ${firstName || 'welcome back'}`
              : 'Guidance for the questions that stay with you'}
          </h1>
          <p className="lead">
            {profile
              ? 'Your sessions, reflections and updates — all in one quiet place.'
              : 'Book a consultation, read gentle guidance, and share your experience with a community that listens.'}
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" to="/services">
              Explore services <Icon name="arrow" size={16} />
            </Link>
            {!profile && (
              <Link className="btn btn-outline" to="/signup">
                Create your account
              </Link>
            )}
            {profile && (
              <Link className="btn btn-outline" to="/bookings">
                My bookings
              </Link>
            )}
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">
                {profile ? bookings.data?.length ?? 0 : services.data?.length ?? 0}
              </span>
              <span className="stat-label">{profile ? 'Your sessions' : 'Services offered'}</span>
            </div>
            <div className="stat">
              <span className="stat-value">{testimonials.data?.length ?? 0}</span>
              <span className="stat-label">Published reflections</span>
            </div>
            <div className="stat">
              <span className="stat-value">{guidance.data?.length ?? 0}</span>
              <span className="stat-label">Guidance notes</span>
            </div>
          </div>
        </div>
      </section>

      {profile && (
        <section className="card">
          <SectionHead
            eyebrow="Next up"
            title="Your next session"
            action={
              <Link className="btn btn-ghost btn-sm" to="/bookings">
                All bookings <Icon name="arrow" size={14} />
              </Link>
            }
          />
          {bookings.loading ? (
            <Loading label="Loading your bookings…" />
          ) : nextBooking ? (
            <div className="session-card">
              <div className="stack gap-4">
                <strong>{nextBooking.serviceName}</strong>
                <span className="small muted">{formatDateTime(nextBooking.scheduledAt)}</span>
                {nextBooking.reference && (
                  <span className="tiny muted">Reference {nextBooking.reference}</span>
                )}
              </div>
              <BookingPill status={nextBooking.status} />
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="No upcoming session"
              message="When the team confirms a booking, it will appear here with its date and status."
              action={
                <Link className="btn btn-outline btn-sm" to="/services">
                  View services
                </Link>
              }
            />
          )}
        </section>
      )}

      <section className="stack gap-12">
        <SectionHead
          eyebrow="Sessions"
          title="How we can walk together"
          action={
            <Link className="btn btn-ghost btn-sm" to="/services">
              All services <Icon name="arrow" size={14} />
            </Link>
          }
        />
        {services.loading ? (
          <Loading label="Loading services…" />
        ) : (services.data ?? []).length === 0 ? (
          <div className="card">
            <EmptyState
              icon="sparkle"
              title="Services are being prepared"
              message="The team has not published service details yet. Please check back soon."
            />
          </div>
        ) : (
          <div className="grid grid-3">
            {(services.data ?? []).slice(0, 3).map((service) => (
              <article className="card service-card" key={service.id}>
                <div className="service-icon">
                  <Icon name="sparkle" size={20} />
                </div>
                <h3 className="h3">{service.title}</h3>
                <p className="small muted">{service.summary || service.description}</p>
                <div className="row-wrap between mt-8">
                  <span className="badge badge-neutral">{service.duration}</span>
                  {service.priceLabel && <span className="tiny muted">{service.priceLabel}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stack gap-12">
        <SectionHead
          eyebrow="Guidance"
          title="Gentle reading for today"
          action={
            <Link className="btn btn-ghost btn-sm" to="/guidance">
              All guidance <Icon name="arrow" size={14} />
            </Link>
          }
        />
        {guidance.loading ? (
          <Loading label="Loading guidance…" />
        ) : (guidance.data ?? []).length === 0 ? (
          <div className="card">
            <EmptyState
              icon="book"
              title="No guidance published yet"
              message="Articles published by the team will appear here."
            />
          </div>
        ) : (
          <div className="grid grid-3">
            {(guidance.data ?? []).slice(0, 3).map((article) => (
              <Link className="card article-card" key={article.id} to={`/guidance/${article.slug}`}>
                <span className="eyebrow">{article.category}</span>
                <h3 className="h3">{article.title}</h3>
                <p className="small muted">{article.excerpt}</p>
                <span className="tiny muted mt-8">Read the note</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="stack gap-12">
        <SectionHead
          eyebrow="Community"
          title="Words from seekers"
          action={
            <Link className="btn btn-ghost btn-sm" to="/testimonials">
              Read all <Icon name="arrow" size={14} />
            </Link>
          }
        />
        {testimonials.loading ? (
          <Loading label="Loading reflections…" />
        ) : (testimonials.data ?? []).length === 0 ? (
          <div className="card">
            <EmptyState
              icon="heart"
              title="No reflections published yet"
              message="Approved testimonials appear here once the team has reviewed them."
              action={
                <Link className="btn btn-outline btn-sm" to="/testimonials">
                  Share yours
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-2">
            {(testimonials.data ?? []).slice(0, 2).map((item) => (
              <blockquote className="quote review-card" key={item.id}>
                <span className="quote-mark" aria-hidden="true">
                  &ldquo;
                </span>
                <p className="quote-body">{item.content}</p>
                <footer className="quote-foot">
                  <StarRating value={item.rating} size={13} />
                  <span className="tiny muted">
                    {item.authorName} · {relativeTime(item.createdAt)}
                  </span>
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>

      <section className="cta-band">
        <div>
          <h2 className="h2">Not sure which session fits?</h2>
          <p className="small muted">
            Reach out and the team will guide you to the right consultation.
          </p>
        </div>
        <Link className="btn btn-primary" to="/services">
          See services <Icon name="arrow" size={16} />
        </Link>
      </section>
    </div>
  );
}
