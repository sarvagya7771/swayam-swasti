import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BookingStatus, TestimonialStatus } from '../lib/types';

/* ------------------------------------------------------------------ icons */

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  book: 'M4 4h12a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3zM8 8h7M8 12h7',
  calendar: 'M4 6h16v15H4zM8 3v4M16 3v4M4 11h16',
  heart: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  shield: 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  chevron: 'M9 6l6 6-6 6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  lock: 'M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3',
  logout: 'M15 12H3M10 7l5 5-5 5M14 4h5v16h-5',
  check: 'M4 12.5l5 5L20 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  leaf: 'M20 4c0 9-6 14-12 14a6 6 0 0 1 0-12c3 0 5 1 7 3',
  edit: 'M4 20h4l10-10-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.sparkle} />
    </svg>
  );
}

/* ------------------------------------------------------------------ brand */

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M16 4c3 4 3 8 0 12-3-4-3-8 0-12z"
            fill="url(#bm)"
            opacity="0.95"
          />
          <path d="M16 16c4-2 8-1 10 3-4 2-8 1-10-3z" fill="url(#bm)" opacity="0.75" />
          <path d="M16 16c-4-2-8-1-10 3 4 2 8 1 10-3z" fill="url(#bm)" opacity="0.75" />
          <path d="M16 18c2 3 2 6 0 9-2-3-2-6 0-9z" fill="url(#bm)" opacity="0.6" />
          <defs>
            <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#f9a8d4" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="brand-text">
        <span className="brand-name">Swayam Swasti</span>
        {!compact && <span className="brand-sub">Spirituality</span>}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ stars */

export function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const interactive = typeof onChange === 'function';
  return (
    <div className="stars" role={interactive ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        if (!interactive) {
          return (
            <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
                fill={active ? 'url(#starFill)' : 'none'}
                stroke={active ? 'none' : 'currentColor'}
                strokeWidth="1.4"
                opacity={active ? 1 : 0.35}
              />
              <defs>
                <linearGradient id="starFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f0abfc" />
                </linearGradient>
              </defs>
            </svg>
          );
        }
        return (
          <button
            key={star}
            type="button"
            className="icon-btn"
            style={{ padding: 2, lineHeight: 0 }}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange?.(star)}
          >
            <svg width={size + 8} height={size + 8} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"
                fill={active ? '#fcd34d' : 'none'}
                stroke={active ? '#fcd34d' : 'currentColor'}
                strokeWidth="1.4"
                opacity={active ? 1 : 0.4}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ pills */

const BOOKING_TONE: Record<BookingStatus, string> = {
  pending: 'badge-warn',
  confirmed: 'badge-success',
  completed: 'badge-brand',
  cancelled: 'badge-danger',
  rescheduled: 'badge-gold',
};

export function BookingPill({ status }: { status: BookingStatus }) {
  return <span className={`badge ${BOOKING_TONE[status]}`}>{status}</span>;
}

const TESTIMONIAL_TONE: Record<TestimonialStatus, string> = {
  pending: 'badge-warn',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export function TestimonialPill({ status }: { status: TestimonialStatus }) {
  return <span className={`badge ${TESTIMONIAL_TONE[status]}`}>{status}</span>;
}

/* ------------------------------------------------------------------ misc */

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials || 'S'}
    </span>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="spinner" />
      <span className="muted small">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon = 'sparkle',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="h3">{title}</h3>
      <p className="muted small">{message}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="h2">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function LinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="btn btn-ghost btn-sm" to={to}>
      {children}
      <Icon name="chevron" size={14} />
    </Link>
  );
}
