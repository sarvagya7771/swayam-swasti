/**
 * Runtime configuration.
 *
 * Only the Supabase *anon* (publishable) key is used in the browser. Every
 * table is protected by Row Level Security, so this key grants nothing beyond
 * what a signed-in customer or administrator is allowed to read or write.
 * The `service_role` key must never be placed in this app.
 */

const env = import.meta.env;

const read = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const config = {
  supabaseUrl: read(env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(env.VITE_SUPABASE_ANON_KEY),
  /** Public URL of this app, used for OAuth and email-confirmation redirects. */
  siteUrl: read(env.VITE_SITE_URL) || browserOrigin,
  bookingSiteUrl: read(env.VITE_BOOKING_SITE_URL),
  adminDashboardUrl: read(env.VITE_ADMIN_DASHBOARD_URL),
  supportEmail: read(env.VITE_SUPPORT_EMAIL) || 'hello@swayamswasti.com',
  brandName: 'Swayam Swasti',
  brandTagline: 'Spirituality',
} as const;

/** True when both Supabase values look usable. */
export const isSupabaseConfigured =
  config.supabaseUrl.length > 0 &&
  config.supabaseAnonKey.length > 0 &&
  /^https?:\/\//i.test(config.supabaseUrl);

/**
 * Human-readable list of the settings still missing. Shown on the setup screen
 * instead of pretending the app has a working database.
 */
export const missingConfig: string[] = [
  ...(config.supabaseUrl ? [] : ['VITE_SUPABASE_URL']),
  ...(config.supabaseAnonKey ? [] : ['VITE_SUPABASE_ANON_KEY']),
];

/** Absolute URL Supabase should send users back to after OAuth / email links. */
export function redirectUrl(path = '/auth/callback'): string {
  const base = config.siteUrl.replace(/\/+$/, '');
  return `${base}${path}`;
}
