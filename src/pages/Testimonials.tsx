import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
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
import { formatDate, relativeTime } from '../lib/format';
import type { Testimonial } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { hasErrors, TESTIMONIAL_MAX, TESTIMONIAL_MIN, validateTestimonial, type FieldErrors } from '../lib/validation';

export default function Testimonials() {
  const { profile } = useAuth();
  const { notify } = useToast();

  const approved = useAsync<Testimonial[]>(() => getBackend().listApprovedTestimonials(), []);
  const mine = useAsync<Testimonial[]>(
    () => (profile ? getBackend().listMyTestimonials() : Promise.resolve([])),
    [profile?.id],
  );

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const pending = (mine.data ?? []).find((item) => item.status === 'pending');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateTestimonial({ rating, content });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await getBackend().submitTestimonial({ rating, content });
      setContent('');
      setRating(5);
      notify('Thank you — your testimonial is with our team for review.', 'success');
      approved.reload();
      mine.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not submit your testimonial.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack gap-20">
      <header>
        <p className="eyebrow">
          <Icon name="heart" size={14} /> Community
        </p>
        <h1 className="h1">Words from seekers</h1>
        <p className="lead">
          Every reflection below was written by a customer and approved by the Swayam Swasti team before publication.
        </p>
      </header>

      <div className="grid grid-2">
        <section className="card">
          <SectionHead eyebrow="Share" title="Write a testimonial" />
          {!profile ? (
            <EmptyState
              icon="lock"
              title="Sign in to share your experience"
              message="Testimonials are tied to your account so we can review them before publishing."
              action={
                <div className="row-wrap center">
                  <Link className="btn btn-primary btn-sm" to="/login">
                    Sign in
                  </Link>
                  <Link className="btn btn-ghost btn-sm" to="/signup">
                    Create account
                  </Link>
                </div>
              }
            />
          ) : pending ? (
            <div className="notice notice-brand">
              <Icon name="clock" size={16} />
              <span>
                Your testimonial from {formatDate(pending.createdAt)} is <strong>awaiting review</strong>. It will appear
                publicly once approved.
              </span>
            </div>
          ) : (
            <form className="stack gap-12" onSubmit={handleSubmit} noValidate>
              <Field label="Your rating" htmlFor="rating" error={errors.rating}>
                <StarRating value={rating} onChange={setRating} size={22} />
              </Field>

              <Field
                label="Your experience"
                htmlFor="content"
                error={errors.content}
                hint={`${content.trim().length}/${TESTIMONIAL_MAX} characters — at least ${TESTIMONIAL_MIN}.`}
              >
                <textarea
                  id="content"
                  className="textarea"
                  rows={5}
                  maxLength={TESTIMONIAL_MAX}
                  value={content}
                  placeholder="What changed for you after your session?"
                  onChange={(event) => setContent(event.target.value)}
                />
              </Field>

              <p className="tiny muted">
                Only your first name is shown publicly. Your email is never published.
              </p>

              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
          )}

          {profile && (mine.data ?? []).length > 0 && (
            <>
              <div className="divider" />
              <h3 className="h3">Your submissions</h3>
              <div className="rows">
                {(mine.data ?? []).map((item) => (
                  <div className="list-item" key={item.id}>
                    <div className="list-item-main">
                      <div className="list-item-top">
                        <strong>{formatDate(item.createdAt)}</strong>
                        <TestimonialPill status={item.status} />
                      </div>
                      <p className="small muted">{item.content}</p>
                      {item.adminNote && <p className="tiny muted">Note from the team: {item.adminNote}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card">
          <SectionHead eyebrow="Published" title="Approved reflections" />
          {approved.loading ? (
            <Loading label="Loading reflections…" />
          ) : (approved.data ?? []).length === 0 ? (
            <EmptyState
              icon="heart"
              title="Nothing published yet"
              message="Approved testimonials will appear here. Be the first to share your experience."
            />
          ) : (
            <div className="stack gap-12">
              {(approved.data ?? []).map((item) => (
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
      </div>
    </div>
  );
}
