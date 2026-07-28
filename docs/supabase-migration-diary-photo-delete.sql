drop policy if exists "active travelers can delete diary media" on public.diary_media;
create policy "active travelers can delete diary media"
on public.diary_media for delete
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.has_trip_role(entry.trip_id, array['admin', 'leader', 'traveler'])
  )
);

drop policy if exists "active travelers can delete diary photos" on storage.objects;
create policy "active travelers can delete diary photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'diary-photos'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
);
