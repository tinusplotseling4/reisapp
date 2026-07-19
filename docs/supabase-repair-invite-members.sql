-- Repair invite members that stayed on "Uitnodiging".
-- Run the first block once. Then use the checks and manual update template below.

-- 1) Required invite-claim function. Safe to run more than once.
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

-- 2) Check open invitations for this trip.
select
  member.id as member_id,
  member.display_name,
  member.invited_email,
  member.role,
  member.invite_token,
  member.joined_at
from public.trip_members member
join public.trips trip on trip.id = member.trip_id
where trip.slug = 'noorwegen-2026'
  and member.user_id is null
order by member.created_at;

-- 3) Check accounts that already exist in Supabase Auth.
select
  auth_user.id as user_id,
  auth_user.email,
  auth_user.created_at,
  auth_user.last_sign_in_at
from auth.users auth_user
order by auth_user.created_at desc;

-- 4) If an invitation already has the same e-mail address, this links it automatically.
update public.trip_members member
set
  user_id = auth_user.id,
  joined_at = coalesce(member.joined_at, now())
from auth.users auth_user
join public.trips trip on trip.slug = 'noorwegen-2026'
where member.trip_id = trip.id
  and member.user_id is null
  and member.invited_email is not null
  and lower(member.invited_email) = lower(auth_user.email)
returning member.display_name, member.invited_email, member.role, member.joined_at;

-- 5) Manual template if you invited by name only.
-- Replace MEMBER_ID and AUTH_USER_ID with values from steps 2 and 3.
-- update public.trip_members
-- set
--   user_id = 'AUTH_USER_ID',
--   joined_at = coalesce(joined_at, now())
-- where id = 'MEMBER_ID'
--   and user_id is null;
