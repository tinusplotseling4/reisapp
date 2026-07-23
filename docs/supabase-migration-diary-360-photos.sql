-- Run this migration to register whether a diary photo is a flat image or a 360 panorama.

alter table public.diary_media
  add column if not exists projection text not null default 'flat';

update public.diary_media
set projection = 'equirectangular'
where kind = 'photo'
  and storage_path ~ '-360\.[a-zA-Z0-9]+$';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_media_projection_check'
      and conrelid = 'public.diary_media'::regclass
  ) then
    alter table public.diary_media
      add constraint diary_media_projection_check
      check (projection in ('flat', 'equirectangular'));
  end if;
end
$$;

drop policy if exists "active travelers can update diary media" on public.diary_media;
create policy "active travelers can update diary media"
on public.diary_media for update
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.has_trip_role(entry.trip_id, array['admin', 'leader', 'traveler'])
  )
)
with check (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.has_trip_role(entry.trip_id, array['admin', 'leader', 'traveler'])
  )
);
