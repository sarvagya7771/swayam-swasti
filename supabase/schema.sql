-- ============================================================================
-- Swayam Swasti Spirituality — customer app schema
-- Run this once in the Supabase SQL editor of your project.
--
-- Security model
--   * Every table has Row Level Security ENABLED.
--   * Customers can read only their own profile, bookings, notifications and
--     testimonial submissions.
--   * Published testimonials (status = 'approved') are readable by everyone.
--   * Admin operations require profiles.role = 'admin', checked by a SECURITY
--     DEFINER helper so policies cannot be spoofed by a client.
--   * Customers can never set their own role or approve their own testimonial.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.testimonial_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('booking', 'testimonial', 'system');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- profiles ----
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text not null default '',
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- bookings ----
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  service_name  text not null,
  scheduled_at  timestamptz not null,
  status        public.booking_status not null default 'pending',
  reference     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bookings_user_id_idx on public.bookings (user_id, scheduled_at desc);

-- --------------------------------------------------------- testimonials ----
create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  author_name  text not null default '',
  rating       smallint not null check (rating between 1 and 5),
  content      text not null check (char_length(content) between 20 and 1200),
  status       public.testimonial_status not null default 'pending',
  admin_note   text,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists testimonials_status_idx on public.testimonials (status, created_at desc);
create index if not exists testimonials_user_idx on public.testimonials (user_id, created_at desc);

-- -------------------------------------------------------- notifications ----
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null default 'system',
  title       text not null,
  body        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ------------------------------------------------- public content tables ----
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text not null default '',
  description  text not null default '',
  duration     text not null default '',
  price_label  text not null default '',
  highlights   text[] not null default '{}',
  position     int not null default 0,
  published    boolean not null default true
);

create table if not exists public.guidance_articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  excerpt       text not null default '',
  body          text not null default '',
  category      text not null default 'Guidance',
  read_minutes  int not null default 4,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------ helpers ------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- Create a profile automatically for every new auth user (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------- booking update -> notify ----
create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body  text;
begin
  if tg_op = 'INSERT' then
    v_title := 'Booking received';
    v_body  := format('%s on %s. We will confirm shortly.',
                       new.service_name,
                       to_char(new.scheduled_at, 'DD Mon YYYY, HH24:MI'));
  elsif new.status is distinct from old.status then
    v_title := case new.status
                 when 'confirmed'   then 'Booking confirmed'
                 when 'cancelled'   then 'Booking cancelled'
                 when 'rescheduled' then 'Booking rescheduled'
                 when 'completed'   then 'Session completed'
                 else 'Booking updated'
               end;
    v_body  := format('%s — %s on %s.',
                       new.service_name,
                       initcap(replace(new.status::text, '_', ' ')),
                       to_char(new.scheduled_at, 'DD Mon YYYY, HH24:MI'));
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body)
  values (new.user_id, 'booking', v_title, v_body);

  return new;
end;
$$;

drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify
  after insert or update on public.bookings
  for each row execute function public.notify_booking_change();

-- ------------------------------------------- testimonial moderation rules --
create or replace function public.guard_testimonial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- A customer submission is always pending; the author name is derived
    -- server-side so clients cannot impersonate someone else.
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    select coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'A seeker')
      into new.author_name
      from public.profiles p
     where p.id = new.user_id;
    if new.author_name is null or new.author_name = '' then
      new.author_name := 'A seeker';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if public.is_admin() then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      return new;
    end if;

    -- Non-admins may only edit their own text and must return to pending.
    if new.user_id <> auth.uid() then
      raise exception 'Not permitted';
    end if;
    if new.status <> old.status or new.admin_note is distinct from old.admin_note then
      raise exception 'Only administrators can change review status';
    end if;
    new.status := 'pending';
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists testimonials_guard on public.testimonials;
create trigger testimonials_guard
  before insert or update on public.testimonials
  for each row execute function public.guard_testimonial();

-- ------------------------------------------------------------------ RLS ----
alter table public.profiles           enable row level security;
alter table public.bookings           enable row level security;
alter table public.testimonials       enable row level security;
alter table public.notifications      enable row level security;
alter table public.services           enable row level security;
alter table public.guidance_articles  enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Customers must not be able to escalate their own role.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.role is distinct from old.role then
    raise exception 'Only administrators can change roles';
  end if;
  if not public.is_admin() and new.email is distinct from old.email then
    raise exception 'Email is managed by authentication';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

-- bookings
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- testimonials
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists testimonials_insert_own on public.testimonials;
create policy testimonials_insert_own on public.testimonials
  for insert with check (user_id = auth.uid());

drop policy if exists testimonials_update_own on public.testimonials;
create policy testimonials_update_own on public.testimonials
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists testimonials_delete_admin on public.testimonials;
create policy testimonials_delete_admin on public.testimonials
  for delete using (public.is_admin());

-- notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin on public.notifications
  for insert with check (public.is_admin());

-- public content
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select using (published = true or public.is_admin());

drop policy if exists services_admin_write on public.services;
create policy services_admin_write on public.services
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists guidance_public_read on public.guidance_articles;
create policy guidance_public_read on public.guidance_articles
  for select using (published = true or public.is_admin());

drop policy if exists guidance_admin_write on public.guidance_articles;
create policy guidance_admin_write on public.guidance_articles
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Promote your own account to admin (run once, after you have registered):
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Never ship the service_role key to a browser app.
-- ============================================================================
