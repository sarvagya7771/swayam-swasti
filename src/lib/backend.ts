import { isSupabaseConfigured } from './config';
import { createDemoBackend } from './demoBackend';
import { createSupabaseBackend } from './supabaseBackend';
import type {
  AdminCustomer,
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

/** Demo-only helpers. Absent when a real Supabase project is connected. */
export interface DemoControls {
  setRole(role: Role): Promise<Profile>;
  resetDemoData(): Promise<void>;
  simulateBookingUpdate(input: { userId: string; serviceName: string; status: BookingStatus }): Promise<void>;
}

/**
 * Everything the UI needs from a backend. Two implementations exist:
 *  - `supabaseBackend`  → real project, protected by Row Level Security
 *  - `demoBackend`      → browser-local store, used when no keys are configured
 */
export interface Backend {
  readonly mode: 'supabase' | 'demo';

  getSession(): Promise<Profile | null>;
  onAuthStateChange(callback: (profile: Profile | null) => void): () => void;

  signUpWithEmail(input: { email: string; password: string; fullName: string }): Promise<{ needsEmailConfirmation: boolean }>;
  signInWithEmail(input: { email: string; password: string }): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

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

  adminListTestimonials(status: TestimonialStatus | 'all'): Promise<Testimonial[]>;
  adminReviewTestimonial(input: { id: string; status: 'approved' | 'rejected'; note: string }): Promise<void>;
  adminListCustomers(): Promise<AdminCustomer[]>;
  adminListBookings(): Promise<Booking[]>;
  adminSendNotification(input: { userId: string; title: string; body: string }): Promise<void>;

  demo?: DemoControls;
}

let cached: Backend | null = null;

export function getBackend(): Backend {
  if (!cached) {
    cached = isSupabaseConfigured ? createSupabaseBackend() : createDemoBackend();
  }
  return cached;
}

export const isDemoBackend = (): boolean => getBackend().mode === 'demo';
