-- Restore missing follower invitations for Rondreis Noorwegen 2026.
-- This does not delete anything. It adds these five name-only invitations
-- only when they are missing from this trip.

with selected_trip as (
  select id
  from public.trips
  where slug = 'noorwegen-2026'
),
wanted_invites(display_name, role) as (
  values
    ('Gea', 'follower'),
    ('dario', 'follower'),
    ('ad', 'follower'),
    ('tineke', 'follower'),
    ('leonie', 'follower')
),
inserted as (
  insert into public.trip_members (
    trip_id,
    user_id,
    display_name,
    invited_email,
    invite_token,
    role,
    joined_at
  )
  select
    selected_trip.id,
    null,
    wanted_invites.display_name,
    null,
    gen_random_uuid()::text,
    wanted_invites.role,
    null
  from selected_trip
  cross join wanted_invites
  where not exists (
    select 1
    from public.trip_members member
    where member.trip_id = selected_trip.id
      and lower(member.display_name) = lower(wanted_invites.display_name)
  )
  returning display_name, role, invite_token
)
select
  'toegevoegd' as status,
  display_name,
  role,
  invite_token
from inserted
union all
select
  'bestond_al' as status,
  member.display_name,
  member.role,
  member.invite_token
from public.trip_members member
join selected_trip on selected_trip.id = member.trip_id
where lower(member.display_name) in ('gea', 'dario', 'ad', 'tineke', 'leonie')
order by display_name;

-- After running this, refresh the app and use:
-- Beheer -> Uitnodigingen -> Kopieer alle thuisblijverlinks.
