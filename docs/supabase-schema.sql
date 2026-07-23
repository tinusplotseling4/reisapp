-- Supabase schema for Camperreis door Noorwegen 2026.
-- Run this file in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  invited_email text,
  invite_token text unique,
  role text not null check (role in ('admin', 'leader', 'traveler', 'follower')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.stage_progress (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stage_index integer not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'done')),
  started_at timestamptz,
  stopped_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (trip_id, stage_index)
);

create table if not exists public.visited_pois (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stage_index integer not null,
  poi_index integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  visited_at timestamptz not null default now(),
  unique (trip_id, stage_index, poi_index, user_id)
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stage_index integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text,
  transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_media (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries(id) on delete cascade,
  kind text not null check (kind in ('photo', 'audio')),
  storage_path text not null,
  admin_only boolean not null default false,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.gps_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  accuracy_m integer,
  source text not null default 'browser',
  recorded_at timestamptz not null default now()
);

create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists stage_progress_trip_id_idx on public.stage_progress(trip_id);
create index if not exists visited_pois_trip_id_idx on public.visited_pois(trip_id);
create index if not exists diary_entries_trip_id_idx on public.diary_entries(trip_id);
create index if not exists diary_media_entry_id_idx on public.diary_media(diary_entry_id);
create index if not exists diary_media_taken_at_idx on public.diary_media(taken_at);
create index if not exists diary_comments_entry_id_idx on public.diary_comments(diary_entry_id, created_at);
create index if not exists gps_points_trip_recorded_idx on public.gps_points(trip_id, recorded_at);

create or replace function public.is_trip_member(check_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_members member
    where member.trip_id = check_trip_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.has_trip_role(check_trip_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_members member
    where member.trip_id = check_trip_id
      and member.user_id = auth.uid()
      and member.role = any(allowed_roles)
  );
$$;

create or replace function public.claim_trip_invite(invite text, new_display_name text default null)
returns table(trip_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_member public.trip_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om een uitnodiging te gebruiken.';
  end if;

  update public.trip_members
  set
    user_id = auth.uid(),
    display_name = coalesce(nullif(trim(new_display_name), ''), display_name),
    joined_at = coalesce(joined_at, now())
  where invite_token = invite
    and (user_id is null or user_id = auth.uid())
  returning * into claimed_member;

  if not found then
    raise exception 'Uitnodiging is niet geldig of al gebruikt.';
  end if;

  return query select claimed_member.trip_id, claimed_member.role;
end;
$$;

grant execute on function public.claim_trip_invite(text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.stage_progress enable row level security;
alter table public.visited_pois enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_media enable row level security;
alter table public.diary_comments enable row level security;
alter table public.gps_points enable row level security;

create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "members can read trips"
on public.trips for select
to authenticated
using (public.is_trip_member(id) or owner_id = auth.uid());

create policy "owners can update trips"
on public.trips for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "users can create owned trips"
on public.trips for insert
to authenticated
with check (owner_id = auth.uid());

create policy "members can read trip members"
on public.trip_members for select
to authenticated
using (public.is_trip_member(trip_id));

create policy "admins can manage trip members"
on public.trip_members for all
to authenticated
using (public.has_trip_role(trip_id, array['admin']))
with check (public.has_trip_role(trip_id, array['admin']));

create policy "trip owners can manage trip members"
on public.trip_members for all
to authenticated
using (
  exists (
    select 1
    from public.trips trip
    where trip.id = trip_id
      and trip.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips trip
    where trip.id = trip_id
      and trip.owner_id = auth.uid()
  )
);

create policy "members can read stage progress"
on public.stage_progress for select
to authenticated
using (public.is_trip_member(trip_id));

create policy "admin and leaders can manage stage progress"
on public.stage_progress for all
to authenticated
using (public.has_trip_role(trip_id, array['admin', 'leader']))
with check (public.has_trip_role(trip_id, array['admin', 'leader']));

create policy "members can read visited pois"
on public.visited_pois for select
to authenticated
using (public.is_trip_member(trip_id));

create policy "active travelers can add visited pois"
on public.visited_pois for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

create policy "active travelers can remove own visited pois"
on public.visited_pois for delete
to authenticated
using (
  user_id = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

create policy "members can read diary entries"
on public.diary_entries for select
to authenticated
using (public.is_trip_member(trip_id));

create policy "active travelers can create diary entries"
on public.diary_entries for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

create policy "authors and leaders can update diary entries"
on public.diary_entries for update
to authenticated
using (
  user_id = auth.uid()
  or public.has_trip_role(trip_id, array['admin', 'leader'])
)
with check (
  user_id = auth.uid()
  or public.has_trip_role(trip_id, array['admin', 'leader'])
);

create policy "members can read public diary media"
on public.diary_media for select
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.is_trip_member(entry.trip_id)
      and (
        admin_only = false
        or public.has_trip_role(entry.trip_id, array['admin', 'leader'])
      )
  )
);

create policy "active travelers can create diary media"
on public.diary_media for insert
to authenticated
with check (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.has_trip_role(entry.trip_id, array['admin', 'leader', 'traveler'])
  )
);

create policy "members can read diary comments"
on public.diary_comments for select
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.is_trip_member(entry.trip_id)
  )
);

create policy "members can create diary comments"
on public.diary_comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.is_trip_member(entry.trip_id)
  )
);

create policy "members can read gps points"
on public.gps_points for select
to authenticated
using (public.is_trip_member(trip_id));

create policy "active travelers can create own gps points"
on public.gps_points for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

-- Storage buckets to create in Supabase Storage:
-- 1. diary-photos
-- 2. diary-audio
--
-- Keep both buckets private. The app should upload with paths like:
-- {trip_id}/{stage_index}/{entry_id}/{filename}
--
-- Storage policies are added in the next implementation step, when the
-- frontend upload paths are fixed.
