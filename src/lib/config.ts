/**
 * Runtime configuration.
 *
 * Only the Supabase *anon* key is ever used in the browser — every table is
 * protected by Row Level Security, so this key grants nothing beyond what a
 * signed-in customer is allowed to read or write. The service_role key must
 * never be placed in this app.
 */

const env = import.meta.env;

const read = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const config = {
  supabaseUrl: read(env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(env.VITE_SUPABASE_ANON_KEY),
  bookingSiteUrl: read(env.VITE_BOOKING_SITE_URL),
  adminDashboardUrl: read(env.VITE_ADMIN_DASHBOARD_URL),
  supportEmail: read(env.VITE_SUPPORT_EMAIL),
  brandName: 'Swayam Swasti',
  brandTagline: 'Spirituality',
} as const;

/** True when both Supabase values look usable. */
export const isSupabaseConfigured =
  config.supabaseUrl.length > 0 &&
  config.supabaseAnonKey.length > 0 &&
  /^https?:\/\//i.test(config.supabaseUrl);

/** When Supabase is not connected the app runs entirely in the browser. */
export const isDemoMode = !isSupabaseConfigured;
