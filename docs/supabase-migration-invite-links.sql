-- Run this migration to enable WhatsApp invite links.

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

