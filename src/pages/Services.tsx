import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Icon, Loading } from '../components/ui';
import { getBackend } from '../lib/backend';
import { config } from '../lib/config';
import type { Service } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function Services() {
  const services = useAsync<Service[]>(() => getBackend().listServices(), []);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="stack gap-20">
      <header>
        <p className="eyebrow">
          <Icon name="sparkle" size={14} /> Offerings
        </p>
        <h1 className="h1">Spiritual services</h1>
        <p className="lead">
          Each session is unhurried and personal. Fees, availability and time slots are confirmed on the Swayam Swasti
          booking site — this app keeps your history and updates.
        </p>
      </header>

      {services.loading ? (
        <Loading label="Loading services…" />
      ) : services.error ? (
        <EmptyState icon="x" title="Services unavailable" message={services.error} />
      ) : (
        <div className="stack gap-12">
          {(services.data ?? []).map((service) => {
            const open = openId === service.id;
            return (
              <article className="card service-card" key={service.id}>
                <div className="between">
                  <div className="row gap-12">
                    <span className="service-icon">
                      <Icon name="leaf" size={18} />
                    </span>
                    <div>
                      <h2 className="h3">{service.title}</h2>
                      <p className="tiny muted nowrap">
                        <Icon name="clock" size={12} /> {service.duration} · {service.priceLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : service.id)}
                  >
                    {open ? 'Less' : 'Details'}
                    <Icon name="chevron" size={14} />
                  </button>
                </div>

                <p className="small muted">{service.summary}</p>

                {open && (
                  <div className="stack gap-12">
                    <div className="divider" />
                    <p className="small">{service.description}</p>
                    <ul className="highlight-list">
                      {service.highlights.map((highlight) => (
                        <li key={highlight}>
                          <Icon name="check" size={14} /> {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className="cta-band card card-pad-lg">
        <div>
          <h2 className="h2">Ready to book a session?</h2>
          <p className="small muted">
            Booking and payment are handled on the existing Swayam Swasti booking site. Your sessions then appear in
            this app under <strong>Bookings</strong>.
          </p>
        </div>
        <div className="row-wrap">
          {config.bookingSiteUrl ? (
            <a className="btn btn-primary" href={config.bookingSiteUrl} target="_blank" rel="noreferrer">
              Go to booking site <Icon name="arrow" size={16} />
            </a>
          ) : (
            <Link className="btn btn-primary" to="/signup">
              Create your account <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
