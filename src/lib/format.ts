import type { BookingStatus, NotificationType, TestimonialStatus } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export function initials(fullName: string, email: string): string {
  const name = fullName.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + second).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase() || 'SS';
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

export const bookingStatusTone: Record<BookingStatus, 'neutral' | 'success' | 'warn' | 'danger' | 'brand'> = {
  pending: 'warn',
  confirmed: 'success',
  completed: 'brand',
  cancelled: 'danger',
  rescheduled: 'neutral',
};

export const testimonialStatusLabel: Record<TestimonialStatus, string> = {
  pending: 'Pending review',
  approved: 'Published',
  rejected: 'Not published',
};

export const testimonialStatusTone: Record<TestimonialStatus, 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
};

export const notificationLabel: Record<NotificationType, string> = {
  booking: 'Booking',
  testimonial: 'Testimonial',
  system: 'Update',
};
