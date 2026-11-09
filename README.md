# Swayam Swasti Spirituality — Customer App

A mobile-first customer app for Swayam Swasti Spirituality: premium purple/pink design,
Google and email sign-in, profile and booking history, booking notifications, testimonial
submission with admin approval, and spiritual guidance content.

> This app is **separate** from your existing Booking website and Admin Dashboard.
> Nothing in those projects is modified. They connect to this app only through a shared
> Supabase project — see [Connecting your existing apps](#connecting-your-existing-apps).

---

## 1. Run it locally

```bash
npm install
npm run dev          # http://127.0.0.1:3000
```

### Demo mode (no account, no credentials)

With no `.env` file the app runs in **local demo mode**: every screen works, data is stored
only in your browser's `localStorage`, and nothing is sent anywhere. The header shows a
**Demo** badge and the home page explains the mode.

Demo mode exists so you can click through the whole product before creating any accounts.
It is clearly labelled and is **not** fake customer data — it starts empty.

You can switch the demo account between customer and admin from the banner at the top of
the app, which lets you walk the full testimonial approval flow:

1. Register a demo account → submit a testimonial on **Community**.
2. Switch to **Admin** in the demo banner → open **Admin** → approve the testimonial.
3. Switch back to **Customer** → the testimonial is now published.

## 2. Connect a real backend (Supabase — free tier)

1. Create a free project at [supabase.com](https://supabase.com) (no card required).
2. Open **SQL Editor** and run `supabase/schema.sql`. This creates every table,
   enables Row Level Security, and installs the triggers that
   create profiles, notify customers when a booking changes, and force new
   testimonials to `pending`.
3. Optionally run `supabase/seed.sql` for starter service and guidance copy
   (owner copy — replace it with your own).
4. Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

5. Enable **Google** sign-in in Authentication → Providers, and add your app URL
   (and `http://127.0.0.1:3000`) to Authentication → URL Configuration.
6. Restart the dev server. The Demo badge disappears and all data now lives in Supabase.

**Only the `anon` (public) key belongs in this app.** Row Level Security is what protects
the data. The `service_role` key bypasses every policy and must never be shipped to a
browser.

### Make yourself an admin

Register normally, then run once in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

The **Admin** tab appears for that account only.

## 3. Connecting your existing apps

You said not to modify your Booking website or Admin Dashboard, so nothing here requires
it. When you are ready, connect them with these patterns.

### Shared identity

Both apps use the **same Supabase project**, so `auth.users.id` is the same person
everywhere. The customer app reads the profile row that Supabase creates automatically.

### Booking website → customer app (recommended: server-side)

Your booking site should write bookings **server-side** using the `service_role` key
(kept only on your server, never in a browser bundle), or from an Edge Function:

```ts
// server-side only — booking website
await supabaseAdmin.from('bookings').insert({
  user_id: customerProfileId,      // resolved from the customer's email
  service_name: 'Vedic astrology reading',
  scheduled_at: '2026-03-14T10:00:00Z',
  status: 'confirmed',
  reference: 'SS-2026-0142',
});
```

The `bookings_notify` trigger then inserts a row into `notifications` automatically, and
the customer sees *“Booking confirmed”* in the app. Status changes (`confirmed`,
`cancelled`, `rescheduled`, `completed`) notify the customer the same way — no extra code.

**Finding the customer by email** (server-side):

```sql
select id from public.profiles where lower(email) = lower($1);
```

If they have not signed up yet, invite them by email; their profile is created on first
sign-in and you can back-fill `bookings.user_id` then.

### Admin Dashboard → customer app

- Read submissions with the dashboard's **own** authenticated admin session and RLS, or
  server-side with `service_role`.
- Approving a testimonial is one update:

```ts
await supabaseAdmin
  .from('testimonials')
  .update({ status: 'approved' })
  .eq('id', testimonialId);
```

The `testimonials_guard` trigger stamps `reviewed_by` and `reviewed_at`, and the
testimonial becomes publicly readable. Set `status: 'rejected'` with an optional
`admin_note` to decline.

- Never let the dashboard write `author_name` or `status` on a customer's behalf outside
  an authenticated admin session — the trigger rejects it otherwise.

### What stays private

| Data | Customer | Public | Admin |
| --- | --- | --- | --- |
| Own profile | read / update (not `role`) | – | read all |
| Bookings | own only | – | read / write |
| Testimonials | own submissions | approved only | read / approve / delete |
| Notifications | own only | – | read |

## 4. Deploy

The app is a static build served on port **3000** (`npm run build` → `dist`).
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables at build
time, then add your deployed URL to Supabase → Authentication → URL Configuration →
Redirect URLs (`https://your-app-url/auth/callback`).

> Without those variables the deployed site runs in demo mode, which is safe to preview
> but stores data per-browser.

## 5. Project structure

```
src/
  components/    Layout, bottom navigation, UI primitives, toasts, route guards
  context/       AuthContext (session + profile)
  lib/           backend interface, Supabase + demo implementations, validation, format
  pages/         Home, Services, Guidance, Testimonials, Bookings, Notifications,
                 Profile, Login, Signup, AuthCallback, Admin, NotFound
  styles/        global.css — the purple/pink design system
supabase/        schema.sql (tables, RLS, triggers), seed.sql (starter copy)
```

## 6. Source export

The complete source is in this repository — clone it, or use GitHub's
**Code → Download ZIP**. No build step is required to read it, and `npm install &&
npm run build` reproduces the deployed bundle exactly.

## Notes on scope

- No paid APIs, no subscriptions, no paid credits. Supabase's free tier and Google
  OAuth are sufficient.
- No fake customer data is bundled. Demo mode starts empty and is labelled as a demo.
- Automated checks: `npm run typecheck`, `npm run build`, `npm test`.
