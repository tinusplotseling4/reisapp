-- Run this migration if thuisblijvers/followers may add written diary notes.
-- They can create text diary entries, but storage upload policies still keep photo/audio upload for active travelers only.

drop policy if exists "active travelers can create diary entries" on public.diary_entries;
create policy "trip members can create diary entries"
on public.diary_entries for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler', 'follower'])
);
