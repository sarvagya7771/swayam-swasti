import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config, redirectUrl } from './config';
import type { Backend } from './backend';
import type {
  AdminCustomer,
  AdminNotification,
  AppNotification,
  Booking,
  BookingStatus,
  NotificationType,
  Profile,
  Role,
  Testimonial,
  TestimonialStatus,
} from './types';

/* ------------------------------------------------------------- row shapes -- */

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
  service_name: string | null;
  scheduled_at: string | null;
  status: string | null;
  reference: string | null;
  notes: string | null;
  profiles?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
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
  user_id: string | null;
  type: string | null;
  title: string | null;
  body: string | null;
  read: boolean | null;
  created_at: string | null;
  profiles?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
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

/* ------------------------------------------------------------------ utils -- */

const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
const TESTIMONIAL_STATUSES: TestimonialStatus[] = ['pending', 'approved', 'rejected'];
const NOTIFICATION_TYPES: NotificationType[] = ['booking', 'testimonial', 'system'];

const asBookingStatus = (value: string | null): BookingStatus =>
  BOOKING_STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : 'pending';

const asTestimonialStatus = (value: string | null): TestimonialStatus =>
  TESTIMONIAL_STATUSES.includes(value as TestimonialStatus) ? (value as TestimonialStatus) : 'pending';

const asNotificationType = (value: string | null): NotificationType =>
  NOTIFICATION_TYPES.includes(value as NotificationType) ? (value as NotificationType) : 'system';

const asRole = (value: string | null): Role => (value === 'admin' ? 'admin' : 'customer');

const embedded = (
  value: BookingRow['profiles'],
): { full_name: string | null; email: string | null } | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email ?? '',
  fullName: row.full_name ?? '',
  phone: row.phone ?? '',
  role: asRole(row.role),
  createdAt: row.created_at ?? new Date().toISOString(),
});

const toBooking = (row: BookingRow): Booking => {
  const customer = embedded(row.profiles);
  return {
    id: row.id,
    serviceName: row.service_name ?? 'Consultation',
    scheduledAt: row.scheduled_at ?? '',
    status: asBookingStatus(row.status),
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    customerName: customer?.full_name ?? undefined,
    customerEmail: customer?.email ?? undefined,
  };
};

const toTestimonial = (row: TestimonialRow): Testimonial => ({
  id: row.id,
  userId: row.user_id ?? '',
  authorName: row.author_name ?? 'A seeker',
  rating: row.rating ?? 5,
  content: row.content ?? '',
  status: asTestimonialStatus(row.status),
  adminNote: row.admin_note ?? undefined,
  createdAt: row.created_at ?? new Date().toISOString(),
});

const toNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  title: row.title ?? 'Update',
  body: row.body ?? '',
  type: asNotificationType(row.type),
  read: row.read ?? false,
  createdAt: row.created_at ?? new Date().toISOString(),
});

/* ---------------------------------------------------------------- backend -- */

export function createSupabaseBackend(): Backend {
  const client: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  async function loadProfile(user: User | null): Promise<Profile | null> {
    if (!user) return null;

    const { data, error } = await client
      .from('profiles')
      .select('id,email,full_name,phone,role,created_at')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (error) throw new Error(error.message);

    if (data) return toProfile(data);

    // Safety net: if the `on_auth_user_created` trigger is not installed yet,
    // create the caller's own profile row (role is forced to customer by RLS).
    const { data: created, error: insertError } = await client
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? '',
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          '',
      })
      .select('id,email,full_name,phone,role,created_at')
      .single<ProfileRow>();

    if (insertError) {
      throw new Error(
        `Could not load your profile (${insertError.message}). Run supabase/schema.sql in your Supabase project.`,
      );
    }
    return toProfile(created);
  }

  async function requireAdmin(): Promise<Profile> {
    const { data } = await client.auth.getSession();
    const profile = await loadProfile(data.session?.user ?? null);
    if (!profile || profile.role !== 'admin') {
      throw new Error('Administrator access is required for this action.');
    }
    return profile;
  }

  return {
    async getSession(): Promise<Profile | null> {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      return loadProfile(data.session?.user ?? null);
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          callback(null);
          return;
        }
        if (!session?.user) return;
        void loadProfile(session.user)
          .then((profile) => callback(profile))
          .catch(() => callback(null));
      });
      return () => data.subscription.unsubscribe();
    },

    async signUpWithEmail({ email, password, fullName }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: redirectUrl('/auth/callback'),
        },
      });
      if (error) throw new Error(error.message);
      return { needsEmailConfirmation: !data.session };
    },

    async signInWithEmail({ email, password }) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },

    async signInWithGoogle({ next } = {}) {
      const target = new URL(redirectUrl('/auth/callback'));
      if (next) target.searchParams.set('next', next);
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: target.toString(),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        throw new Error(
          `${error.message} — make sure the Google provider is enabled in Supabase → Authentication → Providers.`,
        );
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl('/reset-password'),
      });
      if (error) throw new Error(error.message);
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },

    async updateProfile({ fullName, phone }) {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('Please sign in again to continue.');

      const { data, error } = await client
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', userId)
        .select('id,email,full_name,phone,role,created_at')
        .single<ProfileRow>();
      if (error) throw new Error(error.message);
      return toProfile(data);
    },

    async listBookings() {
      const { data, error } = await client
        .from('bookings')
        .select('id,user_id,service_name,scheduled_at,status,reference,notes')
        .order('scheduled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as BookingRow[]).map(toBooking);
    },

    async listApprovedTestimonials() {
      const { data, error } = await client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
    },

    async listMyTestimonials() {
      const { data, error } = await client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
    },

    async submitTestimonial({ rating, content }) {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('Please sign in to share a testimonial.');

      const { data, error } = await client
        .from('testimonials')
        .insert({ user_id: userId, rating, content })
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .single<TestimonialRow>();
      if (error) throw new Error(error.message);
      return toTestimonial(data);
    },

    async listNotifications() {
      const { data, error } = await client
        .from('notifications')
        .select('id,user_id,type,title,body,read,created_at')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw new Error(error.message);
      return ((data ?? []) as NotificationRow[]).map(toNotification);
    },

    async markNotificationRead(id) {
      const { error } = await client.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async markAllNotificationsRead() {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const { error } = await client
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw new Error(error.message);
    },

    async listServices() {
      const { data, error } = await client
        .from('services')
        .select('id,slug,title,summary,description,duration,price_label,highlights')
        .eq('published', true)
        .order('position', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ServiceRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary ?? '',
        description: row.description ?? '',
        duration: row.duration ?? '',
        priceLabel: row.price_label ?? '',
        highlights: row.highlights ?? [],
      }));
    },

    async listGuidance() {
      const { data, error } = await client
        .from('guidance_articles')
        .select('id,slug,title,excerpt,body,category,read_minutes')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as GuidanceRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? '',
        body: row.body ?? '',
        category: row.category ?? 'Guidance',
        readMinutes: row.read_minutes ?? 4,
      }));
    },

    async getGuidanceArticle(slug) {
      const { data, error } = await client
        .from('guidance_articles')
        .select('id,slug,title,excerpt,body,category,read_minutes')
        .eq('slug', slug)
        .eq('published', true)
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

    /* ----------------------------------------------------------- admin --- */

    async adminListTestimonials(status) {
      await requireAdmin();
      let query = client
        .from('testimonials')
        .select('id,user_id,author_name,rating,content,status,admin_note,created_at')
        .order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
    },

    async adminCreateTestimonial({ userId, authorName, rating, content, status, adminNote }) {
      const admin = await requireAdmin();
      const { error } = await client.from('testimonials').insert({
        user_id: userId,
        author_name: authorName.trim(),
        rating,
        content: content.trim(),
        status,
        admin_note: adminNote?.trim() || null,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    },

    async adminUpdateTestimonial({ id, authorName, rating, content, status, adminNote }) {
      await requireAdmin();
      const { error } = await client
        .from('testimonials')
        .update({
          author_name: authorName.trim(),
          rating,
          content: content.trim(),
          status,
          admin_note: adminNote?.trim() || null,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminReviewTestimonial({ id, status, note }) {
      const admin = await requireAdmin();
      const { error } = await client
        .from('testimonials')
        .update({
          status,
          admin_note: note.trim() || null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminDeleteTestimonial(id) {
      await requireAdmin();
      const { error } = await client.from('testimonials').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminListCustomers() {
      await requireAdmin();
      const [profilesResult, bookingsResult, testimonialsResult] = await Promise.all([
        client.from('profiles').select('id,email,full_name,phone,role,created_at').order('created_at', {
          ascending: false,
        }),
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

      return ((profilesResult.data ?? []) as ProfileRow[]).map<AdminCustomer>((row) => ({
        id: row.id,
        email: row.email ?? '',
        fullName: row.full_name ?? '',
        phone: row.phone ?? '',
        role: asRole(row.role),
        createdAt: row.created_at ?? new Date().toISOString(),
        bookingCount: bookingCounts.get(row.id) ?? 0,
        testimonialCount: testimonialCounts.get(row.id) ?? 0,
      }));
    },

    async adminUpdateCustomer({ id, fullName, phone, role }) {
      await requireAdmin();
      const { error } = await client
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim(), role })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminListBookings() {
      await requireAdmin();
      const { data, error } = await client
        .from('bookings')
        .select(
          'id,user_id,service_name,scheduled_at,status,reference,notes,profiles(full_name,email)',
        )
        .order('scheduled_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as BookingRow[]).map(toBooking);
    },

    async adminUpdateBooking({ id, status, scheduledAt }) {
      await requireAdmin();
      const patch: Record<string, unknown> = { status };
      if (scheduledAt) patch.scheduled_at = scheduledAt;
      const { error } = await client.from('bookings').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminDeleteBooking(id) {
      await requireAdmin();
      const { error } = await client.from('bookings').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    async adminListNotifications(limit = 50) {
      await requireAdmin();
      const { data, error } = await client
        .from('notifications')
        .select('id,user_id,type,title,body,read,created_at,profiles(full_name,email)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);

      return ((data ?? []) as NotificationRow[]).map<AdminNotification>((row) => {
        const customer = embedded(row.profiles);
        return {
          ...toNotification(row),
          userId: row.user_id ?? '',
          recipientName: customer?.full_name ?? '',
          recipientEmail: customer?.email ?? '',
        };
      });
    },

    async adminSendNotification({ userId, title, body }) {
      await requireAdmin();
      const { error } = await client.from('notifications').insert({
        user_id: userId,
        title: title.trim(),
        body: body.trim(),
        type: 'system',
      });
      if (error) throw new Error(error.message);
    },

    async adminDeleteNotification(id) {
      await requireAdmin();
      const { error } = await client.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
  };
}
