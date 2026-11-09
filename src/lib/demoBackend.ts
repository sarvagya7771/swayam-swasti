import type { Backend, DemoControls } from './backend';
import { GUIDANCE, SERVICES } from './starterContent';
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
import {
  displayAuthorName,
  hasErrors,
  validateEmail,
  validateFullName,
  validatePassword,
  validateTestimonial,
} from './validation';

/**
 * Browser-local demo backend.
 *
 * Used when no Supabase project is configured. Everything lives in
 * localStorage on this device: no network calls, no customer data leaves the
 * browser, and nothing here is presented as real customer data. It exists so
 * the full workflow (sign-up → submit testimonial → admin approval →
 * notification) can be demonstrated before the real backend is connected.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'swayam-swasti.demo.v1';

interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
}

interface StoredNotification extends AppNotification {
  userId: string;
}

interface StoredBooking extends Booking {
  userId: string;
}

interface DemoState {
  users: DemoUser[];
  sessionUserId: string | null;
  testimonials: Testimonial[];
  notifications: StoredNotification[];
  bookings: StoredBooking[];
}

interface DemoOptions {
  storage?: StorageLike;
  now?: () => number;
}

function emptyState(): DemoState {
  return { users: [], sessionUserId: null, testimonials: [], notifications: [], bookings: [] };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = new TextEncoder().encode(`${salt}::${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', input);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  // Extremely defensive fallback; demo data only.
  let hash = 5381;
  for (const byte of input) hash = ((hash << 5) + hash + byte) >>> 0;
  return hash.toString(16);
}

function randomSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).slice(2, 14);
}

export function createDemoBackend(options: DemoOptions = {}): Backend {
  const storage: StorageLike =
    options.storage ??
    (typeof window !== 'undefined'
      ? window.localStorage
      : { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  const clock = options.now ?? (() => Date.now());
  const listeners = new Set<(profile: Profile | null) => void>();

  const isoNow = (): string => new Date(clock()).toISOString();

  function read(): DemoState {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    try {
      const parsed = JSON.parse(raw) as Partial<DemoState>;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessionUserId: parsed.sessionUserId ?? null,
        testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      };
    } catch {
      return emptyState();
    }
  }

  function write(state: DemoState): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function emit(state: DemoState): void {
    const user = state.users.find((item) => item.id === state.sessionUserId) ?? null;
    const profile = user ? toProfile(user) : null;
    listeners.forEach((listener) => listener(profile));
  }

  function toProfile(user: DemoUser): Profile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  function currentUser(state: DemoState): DemoUser {
    const user = state.users.find((item) => item.id === state.sessionUserId);
    if (!user) throw new Error('Please sign in to continue.');
    return user;
  }

  function currentAdmin(state: DemoState): DemoUser {
    const user = currentUser(state);
    if (user.role !== 'admin') throw new Error('Administrator access required.');
    return user;
  }

  function pushNotification(
    state: DemoState,
    userId: string,
    input: { title: string; body: string; type: AppNotification['type'] },
  ): void {
    state.notifications.unshift({
      id: newId(),
      userId,
      title: input.title,
      body: input.body,
      type: input.type,
      read: false,
      createdAt: isoNow(),
    });
  }

  const demoControls: DemoControls = {
    async setRole(role: Role): Promise<Profile> {
      const state = read();
      const user = currentUser(state);
      user.role = role;
      write(state);
      emit(state);
      return toProfile(user);
    },
    async resetDemoData(): Promise<void> {
      storage.removeItem(STORAGE_KEY);
      listeners.forEach((listener) => listener(null));
    },
    async simulateBookingUpdate(input): Promise<void> {
      const state = read();
      currentAdmin(state);
      const target = state.users.find((user) => user.id === input.userId);
      if (!target) throw new Error('Customer not found.');

      const existing = state.bookings.find(
        (booking) => booking.userId === input.userId && booking.serviceName === input.serviceName,
      );

      if (existing) {
        existing.status = input.status;
      } else {
        state.bookings.unshift({
          id: newId(),
          userId: input.userId,
          serviceName: input.serviceName,
          scheduledAt: new Date(clock() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: input.status,
          reference: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        });
      }

      pushNotification(state, target.id, {
        title: `Booking ${input.status}`,
        body: `Your ${input.serviceName} session is now marked as ${input.status}.`,
        type: 'booking',
      });

      write(state);
      emit(state);
    },
  };

  const backend: Backend = {
    mode: 'demo',

    async getSession(): Promise<Profile | null> {
      const state = read();
      const user = state.users.find((item) => item.id === state.sessionUserId);
      return user ? toProfile(user) : null;
    },

    onAuthStateChange(callback: (profile: Profile | null) => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    async signUpWithEmail(input): Promise<{ needsEmailConfirmation: boolean }> {
      const emailError = validateEmail(input.email);
      if (emailError) throw new Error(emailError);
      const passwordError = validatePassword(input.password);
      if (passwordError) throw new Error(passwordError);
      const nameError = validateFullName(input.fullName);
      if (nameError) throw new Error(nameError);

      const state = read();
      const email = input.email.trim().toLowerCase();
      if (state.users.some((user) => user.email === email)) {
        throw new Error('An account already exists for this email. Try signing in instead.');
      }

      const salt = randomSalt();
      const user: DemoUser = {
        id: newId(),
        email,
        passwordHash: await hashPassword(input.password, salt),
        salt,
        fullName: input.fullName.trim(),
        phone: '',
        role: 'customer',
        createdAt: isoNow(),
      };

      state.users.push(user);
      state.sessionUserId = user.id;
      pushNotification(state, user.id, {
        title: 'Welcome to Swayam Swasti',
        body: 'Your account is ready. Bookings made with this email will appear here, and we will notify you whenever one is updated.',
        type: 'system',
      });
      write(state);
      emit(state);
      return { needsEmailConfirmation: false };
    },

    async signInWithEmail(input): Promise<void> {
      const state = read();
      const email = input.email.trim().toLowerCase();
      const user = state.users.find((item) => item.email === email);
      if (!user) throw new Error('Email or password is incorrect.');
      const hash = await hashPassword(input.password, user.salt);
      if (hash !== user.passwordHash) throw new Error('Email or password is incorrect.');
      state.sessionUserId = user.id;
      write(state);
      emit(state);
    },

    async signInWithGoogle(): Promise<void> {
      throw new Error(
        'Google sign-in needs a connected Supabase project. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it — see README.md.',
      );
    },

    async signOut(): Promise<void> {
      const state = read();
      state.sessionUserId = null;
      write(state);
      emit(state);
    },

    async updateProfile(input): Promise<Profile> {
      const nameError = validateFullName(input.fullName);
      if (nameError) throw new Error(nameError);
      const state = read();
      const user = currentUser(state);
      user.fullName = input.fullName.trim();
      user.phone = input.phone.trim();
      write(state);
      emit(state);
      return toProfile(user);
    },

    async listBookings(): Promise<Booking[]> {
      const state = read();
      const user = currentUser(state);
      return state.bookings
        .filter((booking) => booking.userId === user.id)
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    },

    async listApprovedTestimonials(): Promise<Testimonial[]> {
      const state = read();
      return state.testimonials
        .filter((testimonial) => testimonial.status === 'approved')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async listMyTestimonials(): Promise<Testimonial[]> {
      const state = read();
      const user = currentUser(state);
      return state.testimonials
        .filter((testimonial) => testimonial.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async submitTestimonial(input): Promise<Testimonial> {
      const errors = validateTestimonial(input);
      if (hasErrors(errors)) throw new Error(errors.content ?? errors.rating ?? 'Please check your testimonial.');

      const state = read();
      const user = currentUser(state);

      if (state.testimonials.some((item) => item.userId === user.id && item.status === 'pending')) {
        throw new Error('You already have a testimonial awaiting review. We will publish it shortly.');
      }

      const testimonial: Testimonial = {
        id: newId(),
        userId: user.id,
        authorName: displayAuthorName(user.fullName, user.email),
        rating: input.rating,
        content: input.content.trim(),
        status: 'pending',
        createdAt: isoNow(),
      };

      state.testimonials.unshift(testimonial);
      pushNotification(state, user.id, {
        title: 'Testimonial received',
        body: 'Thank you for sharing. Your words are with our team and will appear once approved.',
        type: 'testimonial',
      });
      write(state);
      emit(state);
      return testimonial;
    },

    async listNotifications(): Promise<AppNotification[]> {
      const state = read();
      const user = currentUser(state);
      return state.notifications
        .filter((notification) => notification.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ userId: _userId, ...rest }) => rest);
    },

    async markNotificationRead(id: string): Promise<void> {
      const state = read();
      const user = currentUser(state);
      const notification = state.notifications.find((item) => item.id === id && item.userId === user.id);
      if (!notification) return;
      notification.read = true;
      write(state);
    },

    async markAllNotificationsRead(): Promise<void> {
      const state = read();
      const user = currentUser(state);
      state.notifications.forEach((notification) => {
        if (notification.userId === user.id) notification.read = true;
      });
      write(state);
    },

    async listServices(): Promise<Service[]> {
      return SERVICES;
    },

    async listGuidance(): Promise<GuidanceArticle[]> {
      return GUIDANCE;
    },

    async getGuidanceArticle(slug: string): Promise<GuidanceArticle | null> {
      return GUIDANCE.find((article) => article.slug === slug) ?? null;
    },

    async adminListTestimonials(status: TestimonialStatus | 'all'): Promise<Testimonial[]> {
      const state = read();
      currentAdmin(state);
      return state.testimonials
        .filter((testimonial) => (status === 'all' ? true : testimonial.status === status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async adminReviewTestimonial(input): Promise<void> {
      const state = read();
      const admin = currentAdmin(state);
      const testimonial = state.testimonials.find((item) => item.id === input.id);
      if (!testimonial) throw new Error('Testimonial not found.');

      testimonial.status = input.status;
      testimonial.adminNote = input.note.trim();

      pushNotification(state, testimonial.userId, {
        title: input.status === 'approved' ? 'Your testimonial is published' : 'Update on your testimonial',
        body:
          input.status === 'approved'
            ? 'Thank you — your reflection is now visible to the Swayam Swasti community.'
            : input.note.trim() || 'Our team was not able to publish this testimonial. Please feel free to submit another.',
        type: 'testimonial',
      });

      write(state);
      emit(state);
      void admin;
    },

    async adminListCustomers(): Promise<AdminCustomer[]> {
      const state = read();
      currentAdmin(state);
      return state.users
        .map((user) => ({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          createdAt: user.createdAt,
          bookingCount: state.bookings.filter((booking) => booking.userId === user.id).length,
          testimonialCount: state.testimonials.filter((testimonial) => testimonial.userId === user.id).length,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async adminListBookings(): Promise<Booking[]> {
      const state = read();
      currentAdmin(state);
      return state.bookings
        .map((booking) => {
          const customer = state.users.find((user) => user.id === booking.userId);
          return {
            ...booking,
            customerName: customer?.fullName ?? '',
            customerEmail: customer?.email ?? '',
          };
        })
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    },

    async adminSendNotification(input): Promise<void> {
      const state = read();
      currentAdmin(state);
      const target = state.users.find((user) => user.id === input.userId);
      if (!target) throw new Error('Customer not found.');
      pushNotification(state, target.id, { title: input.title, body: input.body, type: 'system' });
      write(state);
    },

    demo: demoControls,
  };

  return backend;
}

/** Exposed for the unit tests. */
export const DEMO_STORAGE_KEY = STORAGE_KEY;

export type { BookingStatus };
