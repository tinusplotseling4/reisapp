-- Run this migration to enable central diary photo/audio storage.
-- Buckets stay private; the app creates signed URLs for trip members.

insert into storage.buckets (id, name, public)
values
  ('diary-photos', 'diary-photos', false),
  ('diary-audio', 'diary-audio', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "trip members can read diary photos" on storage.objects;
create policy "trip members can read diary photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'diary-photos'
  and public.is_trip_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "trip leaders can read diary audio" on storage.objects;
create policy "trip leaders can read diary audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'diary-audio'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader'])
);

drop policy if exists "active travelers can upload diary photos" on storage.objects;
create policy "active travelers can upload diary photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'diary-photos'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
);

drop policy if exists "active travelers can upload diary audio" on storage.objects;
create policy "active travelers can upload diary audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'diary-audio'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
);
