import { isSupabaseConfigured } from './config';
import { createSupabaseBackend } from './supabaseBackend';
import type {
  AdminCustomer,
  AdminNotification,
  AppNotification,
  Booking,
  BookingStatus,
  GuidanceArticle,
  Profile,
  Role,
  Service,
  Testimonial,
  TestimonialStatus,
} from './types';

/**
 * Everything the UI needs from the database.
 *
 * There is exactly one implementation: `supabaseBackend`, backed by a real
 * Supabase project. There is no browser-local store, so nothing the app shows
 * can be mistaken for real data that was never saved.
 */
export interface Backend {
  getSession(): Promise<Profile | null>;
  onAuthStateChange(callback: (profile: Profile | null) => void): () => void;

  signUpWithEmail(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ needsEmailConfirmation: boolean }>;
  signInWithEmail(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(input?: { next?: string }): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;

  updateProfile(input: { fullName: string; phone: string }): Promise<Profile>;

  listBookings(): Promise<Booking[]>;
  listApprovedTestimonials(): Promise<Testimonial[]>;
  listMyTestimonials(): Promise<Testimonial[]>;
  submitTestimonial(input: { rating: number; content: string }): Promise<Testimonial>;

  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  listServices(): Promise<Service[]>;
  listGuidance(): Promise<GuidanceArticle[]>;
  getGuidanceArticle(slug: string): Promise<GuidanceArticle | null>;

  /* ------------------------------------------------------------- admin --- */

  adminListTestimonials(status: TestimonialStatus | 'all'): Promise<Testimonial[]>;
  adminCreateTestimonial(input: {
    userId: string | null;
    authorName: string;
    rating: number;
    content: string;
    status: TestimonialStatus;
    adminNote?: string;
  }): Promise<void>;
  adminUpdateTestimonial(input: {
    id: string;
    authorName: string;
    rating: number;
    content: string;
    status: TestimonialStatus;
    adminNote?: string;
  }): Promise<void>;
  adminReviewTestimonial(input: {
    id: string;
    status: Extract<TestimonialStatus, 'approved' | 'rejected'>;
    note: string;
  }): Promise<void>;
  adminDeleteTestimonial(id: string): Promise<void>;

  adminListCustomers(): Promise<AdminCustomer[]>;
  adminUpdateCustomer(input: {
    id: string;
    fullName: string;
    phone: string;
    role: Role;
  }): Promise<void>;

  adminListBookings(): Promise<Booking[]>;
  adminUpdateBooking(input: {
    id: string;
    status: BookingStatus;
    scheduledAt?: string;
  }): Promise<void>;
  adminDeleteBooking(id: string): Promise<void>;

  adminListNotifications(limit?: number): Promise<AdminNotification[]>;
  adminSendNotification(input: { userId: string; title: string; body: string }): Promise<void>;
  adminDeleteNotification(id: string): Promise<void>;
}

let cached: Backend | null = null;

/**
 * Returns the Supabase-backed client. Throws a clear, actionable error when the
 * project has not been configured yet — the UI shows a setup screen before any
 * page calls this, so the error is a safety net rather than a normal path.
 */
export function getBackend(): Backend {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the app.',
    );
  }
  if (!cached) cached = createSupabaseBackend();
  return cached;
}
