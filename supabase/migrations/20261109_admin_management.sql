-- ============================================================================
-- Swayam Swasti Spirituality — admin management upgrade
--
-- Run this in the Supabase SQL editor **only if you already ran an earlier
-- version of supabase/schema.sql**. A fresh project just needs schema.sql.
--
-- It is safe to run more than once.
-- ============================================================================

-- 1. Testimonials authored inside the admin dashboard have no customer
--    account attached, so user_id must allow NULL.
alter table public.testimonials alter column user_id drop not null;

-- 2. Admin inserts keep the status and display name they choose; customer
--    submissions are still forced to 'pending' with a derived first name.
create or replace function public.guard_testimonial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if public.is_admin() then
      new.author_name := coalesce(nullif(trim(new.author_name), ''), 'Swayam Swasti client');
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      return new;
    end if;

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

-- 3. Policies: admins may insert testimonials and delete notifications.
drop policy if exists testimonials_insert_own on public.testimonials;
create policy testimonials_insert_own on public.testimonials
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_delete_admin on public.notifications;
create policy notifications_delete_admin on public.notifications
  for delete using (public.is_admin());
