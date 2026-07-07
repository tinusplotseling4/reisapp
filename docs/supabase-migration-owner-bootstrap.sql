-- Run this migration if the first schema was already installed.
-- It lets the trip owner read the trip and create the first admin membership.

drop policy if exists "members can read trips" on public.trips;
drop policy if exists "trip owners can manage trip members" on public.trip_members;

create policy "members can read trips"
on public.trips for select
to authenticated
using (public.is_trip_member(id) or owner_id = auth.uid());

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
