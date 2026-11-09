# Swayam Swasti Spirituality — Customer App

A production customer app for **Swayam Swasti Spirituality**: real accounts (Google + email),
real database storage, booking history, an approved-testimonials community and a secure
admin dashboard.

> This is a **separate project** from your existing Booking website and Admin Dashboard.
> Neither of those is modified by this repository. All three can share one Supabase project.

Stack: React 18 + TypeScript + Vite, Supabase (Postgres + Auth + Row Level Security),
no paid APIs, no subscriptions.

---

## 1. What you must provide (exact credentials)

The app now refuses to run without a real database — there is **no demo mode and no
`localStorage` fallback**. If the two variables below are missing, the app shows a
setup screen instead of pretending to work.

### 1.1 Supabase values (2 values)

Supabase dashboard → your project → **Project Settings → API**:

| Variable | Where to find it | Example |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | “Project URL” | `https://abcdefghijkl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | “Project API keys → anon / public” | `eyJhbGciOiJIUzI1NiIs...` |

⚠️ Use the **anon / publishable** key only. Never put the `service_role` / secret key in
this app: every `VITE_` variable is bundled into public JavaScript.

Copy `.env.example` to `.env` and fill both values for local development. For hosting, add
the same two names in **Settings → Environment**.

### 1.2 Google Sign-In (free, ~10 minutes)

Google Sign-In needs an OAuth client **and** a matching Supabase provider entry. Both are free.

1. **Supabase → Authentication → Providers → Google**: enable it. It shows a
   **Callback URL** — copy it, it looks like
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. **Google Cloud Console** (https://console.cloud.google.com) → create a project (or reuse
   one) → **APIs & Services → OAuth consent screen**:
   - User type: **External**, publishing status may stay in *Testing* while you develop.
   - App name: `Swayam Swasti Spirituality`; add your support email.
   - Scopes: only `userinfo.email`, `userinfo.profile`, `openid`.
   - While in *Testing*, add each Google account that may sign in under **Test users**
     (max 100). Press **Publish app** when you go live.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorised JavaScript origins**:
     - `http://localhost:5173` (local dev)
     - your deployed origin, e.g. `https://your-app-url` (no trailing slash)
   - **Authorised redirect URIs**: paste the Supabase callback URL from step 1.
4. Copy the generated **Client ID** and **Client secret** into
   **Supabase → Authentication → Providers → Google**, then **Save**.

You do **not** need the Google client ID/secret in this repository — Supabase stores them and
performs the token exchange.

### 1.3 Redirect URLs (required for Google + email links)

**Supabase → Authentication → URL Configuration**:

- **Site URL**: your deployed app URL (or `http://localhost:5173` while developing).
- **Additional Redirect URLs**:
  - `http://localhost:5173/auth/callback`
  - `https://your-app-url/auth/callback`
  - `https://your-app-url/reset-password`

The app sends every OAuth/confirmation link to `/auth/callback` and password-recovery links
to `/reset-password`.

### 1.4 Email delivery

Supabase's built-in email sender is free but rate-limited (a few messages per hour) and best
for testing. For production volume, connect a free SMTP provider (e.g. Brevo/Resend free tier)
in **Authentication → Emails → SMTP Settings**. Until then, keep
**Authentication → Providers → Email → “Confirm email”** on and expect slow confirmation
emails; you can also disable confirmation while testing.

---

## 2. Database setup

1. Create a free project at [supabase.com](https://supabase.com) (no card required).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   This creates every table, index, trigger, Row Level Security policy and the
   `is_admin()` helper. It is idempotent — safe to re-run.
3. If you previously ran an older version of the schema, also run
   `supabase/migrations/20261109_admin_management.sql` (adds admin-authored testimonials
   and admin notification deletion).
4. Optionally run `supabase/seed.sql` for the real service descriptions and guidance
   articles (service names, durations and prices — no customer data).
5. Start the app: `npm install && npm run dev`.

### Make yourself an admin (one time)

Register normally in the app, then run in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Sign out and back in; the **Admin** tab appears. Role changes are blocked for everyone
except existing admins by a database trigger, so a customer cannot promote themselves even
by calling the API directly.

### What is actually enforced (not just hidden)

| Rule | Enforced by |
| --- | --- |
| Customers see only their own profile, bookings, notifications | RLS `select` policies on `auth.uid()` |
| Only approved testimonials are public | RLS on `testimonials.status = 'approved'` |
| Customers cannot self-approve or set their own role | `guard_testimonial` / `guard_profile_role` triggers |
| Admin actions require `role = 'admin'` | `public.is_admin()` inside every write policy |
| Booking status changes notify the customer | `notify_booking_change` trigger → `notifications` |
| Admin panel access | UI guard + the RLS policies above (the UI guard alone is never trusted) |

---

## 3. Admin dashboard (`/admin`)

Available only to accounts with `role = 'admin'`.

- **Testimonials** — create, edit, approve, reject (with a note) and delete. Filter by
  pending / approved / rejected / all. Customer submissions always arrive as `pending` with
  a first-name-only display name derived server-side.
- **Customers** — search-free list with booking and testimonial counts; edit name, phone and
  role; message a customer directly.
- **Bookings** — update status (pending, confirmed, completed, cancelled, rescheduled) or
  reschedule; deleting removes the record.
- **Notifications** — send a message to any customer, review delivery/read state, delete.

Every write is a real `update`/`insert`/`delete` against Postgres, authorised by RLS.

---

## 4. Design system

Light, calm and premium: white surfaces, soft blush pink (`--blush-*`) and lavender
(`--lav-*`) accents, subtle gradients only on hero and primary buttons, generous spacing.
Motion is transform/opacity based (GPU-friendly, no animation library), with staggered card
reveals, animated route transitions, shimmer skeletons, spring-like button presses and a
respectful `prefers-reduced-motion: reduce` path that disables movement for users who ask
for it. All tokens live at the top of `src/styles/global.css`.

---

## 5. Connecting your existing apps (unchanged, optional)

Your Booking website and Admin Dashboard stay exactly as they are. If you later want them to
share data with this app, point them at the **same Supabase project** and use the service
role key **only on their server**, never in this browser app:

```js
// server-side only (booking site backend)
await supabaseAdmin.from('bookings').insert({
  user_id: customerId,
  service_name: 'Pendulum Guidance & Training',
  scheduled_at: '2026-12-01T10:00:00Z',
  status: 'pending',
  reference: 'SS-2026-1042',
});
```

The `notify_booking_change` trigger then creates the customer's in-app notification
automatically. Rows inserted with the service role are trusted, so validate input in your
own server code.

Shared identity: both apps use the same Supabase project, so `auth.users.id` is the same
person everywhere, and this app reads the profile row Supabase creates on first sign-in.

---

## 6. Project structure

```
src/
  lib/           config.ts (env), backend.ts (interface), supabaseBackend.ts (implementation),
                 types.ts, validation.ts, format.ts, starterContent.ts
  context/       AuthContext.tsx (session + profile + role)
  components/    Layout, RequireAuth, Modal, Toast, ui.tsx (icons, cards, pills, fields)
  pages/         Home, Services, Guidance, GuidanceArticle, Testimonials, Bookings,
                 Notifications, Profile, Login, Signup, AuthCallback, ResetPassword,
                 Setup, Admin, NotFound
  styles/        global.css (design tokens, animation layer)
supabase/        schema.sql, seed.sql, migrations/
server.mjs       production static server (SPA fallback, port 3000)
```

## 7. Checks

```bash
npm run build     # tsc --noEmit + vite build
npm test          # vitest unit tests (validation + privacy helpers)
```

## Notes on scope

- No paid APIs, subscriptions or credits. Supabase free tier + Google OAuth free tier.
- No fake customer data is bundled. The app starts empty and shows only rows that exist in
  your database.
- Source export: the repository is the full source — clone it, or download it from GitHub.
