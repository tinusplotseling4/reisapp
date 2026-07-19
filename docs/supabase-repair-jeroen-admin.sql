-- Repair Jeroen's admin access for Rondreis Noorwegen 2026.
-- Run this in Supabase SQL Editor with role "postgres".

-- 1) Check which account and trip are being repaired.
select
  auth_user.id as jeroen_user_id,
  auth_user.email,
  trip.id as trip_id,
  trip.slug,
  trip.owner_id as current_owner_id
from auth.users auth_user
cross join public.trips trip
where lower(auth_user.email) = lower('jeroenblomsma1978@gmail.com')
  and trip.slug = 'noorwegen-2026';

-- 2) Make Jeroen the owner of this trip.
update public.trips trip
set owner_id = auth_user.id
from auth.users auth_user
where trip.slug = 'noorwegen-2026'
  and lower(auth_user.email) = lower('jeroenblomsma1978@gmail.com')
returning trip.id, trip.slug, trip.owner_id;

-- 3) Make Jeroen an active Administrator member of this trip.
insert into public.trip_members (
  trip_id,
  user_id,
  display_name,
  invited_email,
  role,
  joined_at
)
select
  trip.id,
  auth_user.id,
  coalesce(nullif(trim(auth_user.raw_user_meta_data->>'display_name'), ''), 'Jeroen Blomsma'),
  auth_user.email,
  'admin',
  now()
from public.trips trip
join auth.users auth_user on lower(auth_user.email) = lower('jeroenblomsma1978@gmail.com')
where trip.slug = 'noorwegen-2026'
on conflict (trip_id, user_id) do update
set
  role = 'admin',
  display_name = coalesce(nullif(trim(excluded.display_name), ''), public.trip_members.display_name),
  invited_email = excluded.invited_email,
  joined_at = coalesce(public.trip_members.joined_at, now())
returning id, trip_id, user_id, display_name, invited_email, role, joined_at;

-- 4) Verify the result. This should show role = admin and owner_matches = true.
select
  member.display_name,
  member.invited_email,
  member.role,
  member.joined_at,
  trip.owner_id = member.user_id as owner_matches
from public.trip_members member
join public.trips trip on trip.id = member.trip_id
where trip.slug = 'noorwegen-2026'
  and lower(member.invited_email) = lower('jeroenblomsma1978@gmail.com');
