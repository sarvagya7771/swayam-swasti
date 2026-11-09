import { Link } from 'react-router-dom';
import { BookingPill, EmptyState, Icon, Loading, SectionHead, StarRating } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getBackend, isDemoBackend } from '../lib/backend';
import { config } from '../lib/config';
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
  const demo = isDemoBackend();

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
            {profile ? `${greeting()}, ${firstName || 'welcome back'}` : 'Guidance for the questions that stay with you'}
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
              <span className="stat-value">{profile ? (bookings.data?.length ?? 0) : services.data?.length ?? 0}</span>
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

      {demo && (
        <div className="notice notice-brand">
          <Icon name="sparkle" size={16} />
          <span>
            <strong>Demo mode.</strong> This build stores everything locally in your browser. Add your Supabase keys to
            connect real accounts, bookings and testimonials — see the README.
          </span>
        </div>
      )}

      {profile && (
        <section className="card">
          <SectionHead
            eyebrow="Next up"
            title="Your upcoming session"
            action={
              <Link className="btn btn-ghost btn-sm" to="/bookings">
                All bookings <Icon name="chevron" size={14} />
              </Link>
            }
          />
          {bookings.loading ? (
            <Loading label="Loading your bookings…" />
          ) : nextBooking ? (
            <div className="rows">
              <div className="list-item">
                <div className="list-item-main">
                  <div className="list-item-top">
                    <strong>{nextBooking.serviceName}</strong>
                    <BookingPill status={nextBooking.status} />
                  </div>
                  <p className="small muted">{formatDateTime(nextBooking.scheduledAt)}</p>
                  {nextBooking.reference && <p className="tiny muted">Reference {nextBooking.reference}</p>}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="No sessions booked yet"
              message="When you book through the Swayam Swasti booking site, your session appears here automatically."
              action={
                config.bookingSiteUrl ? (
                  <a className="btn btn-outline btn-sm" href={config.bookingSiteUrl} rel="noreferrer">
                    Open booking site
                  </a>
                ) : (
                  <Link className="btn btn-outline btn-sm" to="/services">
                    View services
                  </Link>
                )
              }
            />
          )}
        </section>
      )}

      <section>
        <SectionHead
          eyebrow="Offerings"
          title="Ways we can sit together"
          action={
            <Link className="btn btn-ghost btn-sm" to="/services">
              See all <Icon name="chevron" size={14} />
            </Link>
          }
        />
        {services.loading ? (
          <Loading label="Loading services…" />
        ) : (
          <div className="grid grid-3">
            {(services.data ?? []).slice(0, 3).map((service) => (
              <article className="card service-card" key={service.id}>
                <span className="service-icon">
                  <Icon name="sparkle" size={18} />
                </span>
                <h3 className="h3">{service.title}</h3>
                <p className="small muted">{service.summary}</p>
                <p className="tiny muted nowrap">
                  <Icon name="clock" size={12} /> {service.duration}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-2">
        <div className="card">
          <SectionHead eyebrow="Guidance" title="Read something quiet" />
          {guidance.loading ? (
            <Loading label="Loading guidance…" />
          ) : (
            <div className="rows">
              {(guidance.data ?? []).slice(0, 2).map((article) => (
                <Link className="row-link" to={`/guidance/${article.slug}`} key={article.id}>
                  <div className="list-item">
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{article.title}</strong>
                        <span className="badge badge-brand">{article.category}</span>
                      </div>
                      <p className="small muted">{article.excerpt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <SectionHead
            eyebrow="Community"
            title="Words from seekers"
            action={
              <Link className="btn btn-ghost btn-sm" to="/testimonials">
                All <Icon name="chevron" size={14} />
              </Link>
            }
          />
          {testimonials.loading ? (
            <Loading label="Loading reflections…" />
          ) : (testimonials.data ?? []).length === 0 ? (
            <EmptyState
              icon="heart"
              title="No published reflections yet"
              message="Testimonials appear here only after the Swayam Swasti team reviews and approves them."
            />
          ) : (
            <div className="stack gap-12">
              {(testimonials.data ?? []).slice(0, 2).map((item) => (
                <blockquote className="quote" key={item.id}>
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
        </div>
      </section>
    </div>
  );
}
