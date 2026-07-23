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
