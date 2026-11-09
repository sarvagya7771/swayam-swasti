import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import type { Backend } from './backend';
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

/**
 * Supabase backend.
 *
 * Uses only the public anon key. Every table is protected by Row Level
 * Security (see `supabase/schema.sql`), so the browser can never read another
 * customer's rows or approve its own testimonial. Admin capability is decided
 * by the `profiles.role` column and enforced inside Postgres, not in this file.
 */

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
}

interface BookingRow {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  service_name: string | null;
  scheduled_at: string | null;
  status: string | null;
  reference: string | null;
}

interface TestimonialRow {
  id: string;
  user_id: string | null;
  author_name: string | null;
  rating: number | null;
  content: string | null;
  status: string | null;
  admin_note: string | null;
  created_at: string | null;
}

interface NotificationRow {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  read_at: string | null;
  created_at: string | null;
}

interface ServiceRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  duration: string | null;
  price_label: string | null;
  highlights: string[] | null;
}

interface GuidanceRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  read_minutes: number | null;
}

const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
const TESTIMONIAL_STATUSES: TestimonialStatus[] = ['pending', 'approved', 'rejected'];

const toBookingStatus = (value: string | null): BookingStatus =>
  BOOKING_STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : 'pending';

const toTestimonialStatus = (value: string | null): TestimonialStatus =>
  TESTIMONIAL_STATUSES.includes(value as TestimonialStatus) ? (value as TestimonialStatus) : 'pending';

const toRole = (value: string | null): Role => (value === 'admin' ? 'admin' : 'customer');

export function createSupabaseBackend(): Backend {
  const client: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  function toProfile(row: ProfileRow): Profile {
    return {
      id: row.id,
      email: row.email ?? '',
      fullName: row.full_name ?? '',
      phone: row.phone ?? '',
      role: toRole(row.role),
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  }

  async function loadProfile(userId: string, email: string): Promise<Profile> {
    // The signup trigger creates the profile row; allow a moment for it.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,full_name,phone,role,created_at')
        .eq('id', userId)
        .maybeSingle<ProfileRow>();

      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      if (data) return toProfile(data);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // No profile row (schema trigger not installed yet). Stay usable, but with
    // the least-privileged role so admin screens remain locked.
    return {
      id: userId,
      email,
      fullName: '',
      phone: '',
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
  }

  async function getSession(): Promise<Profile | null> {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return loadProfile(data.user.id, data.user.email ?? '');
  }

  async function requireProfile(): Promise<Profile> {
    const profile = await getSession();
    if (!profile) throw new Error('Please sign in to continue.');
    return profile;
  }

  async function requireAdmin(): Promise<Profile> {
    const profile = await requireProfile();
    if (profile.role !== 'admin') throw new Error('Administrator access required.');
    return profile;
  }

  const backend: Backend = {
    mode: 'supabase',

    getSession,

    onAuthStateChange(callback: (profile: Profile | null) => void): () => void {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          callback(null);
          return;
        }
        const user = session.user;
        void loadProfile(user.id, user.email ?? '').then(callback, () => callback(null));
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },

    async signUpWithEmail(input): Promise<{ needsEmailConfirmation: boolean }> {
      const { data, error } = await client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { full_name: input.fullName.trim() },
          emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        },
      });
      if (error) throw new Error(error.message);
      return { needsEmailConfirmation: !data.session };
    },

    async signInWithEmail(input): Promise<void> {
      const { error } = await client.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) throw new Error(error.message);
    },

    async signInWithGoogle(): Promise<void> {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw new Error(error.message);
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async updateProfile(input): Promise<Profile> {
      const profile = await requireProfile();
      const { data, error } = await client
        .from('profiles')
        .update({ full_name: input.fullName.trim(), phone: input.phone.trim() })
        .eq('id', profile.id)
        .select('id,email,full_name,phone,role,created_at')
        .single<ProfileRow>();
      if (error) throw new Error(error.message);
      return toProfile(data);
    },

    async listBookings(): Promise<Booking[]> {
      const profile = await requireProfile();
      const { data, error } = await client
        .from('bookings')
        .select('id,user_id,customer_name,customer_email,service_name,scheduled_at,status,reference')
        .eq('user_id', profile.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const booking = row as BookingRow;
        return {
          id: booking.id,
          serviceName: booking.service_name ?? 'Consultation',
          scheduledAt: booking.scheduled_at ?? '',
          status: toBookingStatus(booking.status),
          reference: booking.reference ?? undefined,
        };
      });
    },

    async listApprovedTestimonials(): Promise<Testimonial[]> {
      const { data, error } = await client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as TestimonialRow;
        return {
          id: item.id,
          userId: item.user_id ?? undefined,
          authorName: item.author_name ?? 'Swayam Swasti guest',
          rating: item.rating ?? 5,
          content: item.content ?? '',
          status: toTestimonialStatus(item.status),
          createdAt: item.created_at ?? new Date().toISOString(),
        };
      });
    },

    async listMyTestimonials(): Promise<Testimonial[]> {
      const profile = await requireProfile();
      const { data, error } = await client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as TestimonialRow;
        return {
          id: item.id,
          userId: item.user_id ?? undefined,
          authorName: item.author_name ?? 'You',
          rating: item.rating ?? 5,
          content: item.content ?? '',
          status: toTestimonialStatus(item.status),
          adminNote: item.admin_note ?? undefined,
          createdAt: item.created_at ?? new Date().toISOString(),
        };
      });
    },

    async submitTestimonial(input): Promise<Testimonial> {
      const profile = await requireProfile();
      const authorName = profile.fullName.trim() || profile.email.split('@')[0] || 'Swayam Swasti guest';
      const { data, error } = await client
        .from('testimonials')
        .insert({
          user_id: profile.id,
          author_name: authorName,
          rating: input.rating,
          content: input.content.trim(),
          status: 'pending',
        })
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .single<TestimonialRow>();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have a testimonial awaiting review. We will publish it shortly.');
        }
        throw new Error(error.message);
      }

      return {
        id: data.id,
        userId: data.user_id ?? profile.id,
        authorName: data.author_name ?? authorName,
        rating: data.rating ?? input.rating,
        content: data.content ?? input.content.trim(),
        status: toTestimonialStatus(data.status),
        createdAt: data.created_at ?? new Date().toISOString(),
      };
    },

    async listNotifications(): Promise<AppNotification[]> {
      const profile = await requireProfile();
      const { data, error } = await client
        .from('notifications')
        .select('id,title,body,type,read_at,created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as NotificationRow;
        return {
          id: item.id,
          title: item.title ?? 'Update',
          body: item.body ?? '',
          type: (item.type as AppNotification['type']) ?? 'system',
          read: Boolean(item.read_at),
          createdAt: item.created_at ?? new Date().toISOString(),
        };
      });
    },

    async markNotificationRead(id: string): Promise<void> {
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    async markAllNotificationsRead(): Promise<void> {
      const profile = await requireProfile();
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .is('read_at', null);
      if (error) throw new Error(error.message);
    },

    async listServices(): Promise<Service[]> {
      const { data, error } = await client
        .from('services')
        .select('id,slug,title,summary,description,duration,price_label,highlights')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as ServiceRow;
        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          summary: item.summary ?? '',
          description: item.description ?? '',
          duration: item.duration ?? '',
          priceLabel: item.price_label ?? '',
          highlights: item.highlights ?? [],
        };
      });
    },

    async listGuidance(): Promise<GuidanceArticle[]> {
      const { data, error } = await client
        .from('guidance_articles')
        .select('id,slug,title,excerpt,body,category,read_minutes')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as GuidanceRow;
        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          excerpt: item.excerpt ?? '',
          body: item.body ?? '',
          category: item.category ?? 'Guidance',
          readMinutes: item.read_minutes ?? 4,
        };
      });
    },

    async getGuidanceArticle(slug: string): Promise<GuidanceArticle | null> {
      const { data, error } = await client
        .from('guidance_articles')
        .select('id,slug,title,excerpt,body,category,read_minutes')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle<GuidanceRow>();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt ?? '',
        body: data.body ?? '',
        category: data.category ?? 'Guidance',
        readMinutes: data.read_minutes ?? 4,
      };
    },

    async adminListTestimonials(status: TestimonialStatus | 'all'): Promise<Testimonial[]> {
      await requireAdmin();
      let query = client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const item = row as TestimonialRow;
        return {
          id: item.id,
          userId: item.user_id ?? undefined,
          authorName: item.author_name ?? 'Swayam Swasti guest',
          rating: item.rating ?? 5,
          content: item.content ?? '',
          status: toTestimonialStatus(item.status),
          adminNote: item.admin_note ?? undefined,
          createdAt: item.created_at ?? new Date().toISOString(),
        };
      });
    },

    async adminReviewTestimonial(input): Promise<void> {
      const admin = await requireAdmin();
      const { error } = await client
        .from('testimonials')
        .update({
          status: input.status,
          admin_note: input.note.trim() || null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw new Error(error.message);
    },

    async adminListCustomers(): Promise<AdminCustomer[]> {
      await requireAdmin();
      const [profilesResult, bookingsResult, testimonialsResult] = await Promise.all([
        client
          .from('profiles')
          .select('id,email,full_name,phone,role,created_at')
          .order('created_at', { ascending: false }),
        client.from('bookings').select('user_id'),
        client.from('testimonials').select('user_id'),
      ]);

      if (profilesResult.error) throw new Error(profilesResult.error.message);
      if (bookingsResult.error) throw new Error(bookingsResult.error.message);
      if (testimonialsResult.error) throw new Error(testimonialsResult.error.message);

      const bookingCounts = new Map<string, number>();
      for (const row of bookingsResult.data ?? []) {
        const id = (row as { user_id: string | null }).user_id;
        if (id) bookingCounts.set(id, (bookingCounts.get(id) ?? 0) + 1);
      }
      const testimonialCounts = new Map<string, number>();
      for (const row of testimonialsResult.data ?? []) {
        const id = (row as { user_id: string | null }).user_id;
        if (id) testimonialCounts.set(id, (testimonialCounts.get(id) ?? 0) + 1);
      }

      return ((profilesResult.data ?? []) as ProfileRow[]).map((row) => ({
        id: row.id,
        email: row.email ?? '',
        fullName: row.full_name ?? '',
        phone: row.phone ?? '',
        createdAt: row.created_at ?? new Date().toISOString(),
        bookingCount: bookingCounts.get(row.id) ?? 0,
        testimonialCount: testimonialCounts.get(row.id) ?? 0,
      }));
    },

    async adminListBookings(): Promise<Booking[]> {
      await requireAdmin();
      const { data, error } = await client
        .from('bookings')
        .select('id,user_id,customer_name,customer_email,service_name,scheduled_at,status,reference')
        .order('scheduled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => {
        const booking = row as BookingRow;
        return {
          id: booking.id,
          serviceName: booking.service_name ?? 'Consultation',
          scheduledAt: booking.scheduled_at ?? '',
          status: toBookingStatus(booking.status),
          reference: booking.reference ?? undefined,
          customerName: booking.customer_name ?? '',
          customerEmail: booking.customer_email ?? '',
        };
      });
    },

    async adminSendNotification(input): Promise<void> {
      await requireAdmin();
      const { error } = await client.from('notifications').insert({
        user_id: input.userId,
        title: input.title,
        body: input.body,
        type: 'system',
      });
      if (error) throw new Error(error.message);
    },
  };

  return backend;
}
