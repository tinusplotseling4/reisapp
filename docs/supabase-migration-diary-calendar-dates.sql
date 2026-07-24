-- Run this migration to decouple diary days from planned route stages.
-- Existing photo entries use the photo capture date when available.

alter table public.diary_media
add column if not exists taken_at timestamptz;

alter table public.diary_entries
add column if not exists diary_date date;

update public.diary_entries entry
set diary_date = coalesce(
  (
    select min((coalesce(media.taken_at, media.created_at) at time zone 'Europe/Oslo')::date)
    from public.diary_media media
    where media.diary_entry_id = entry.id
      and media.kind = 'photo'
  ),
  (entry.created_at at time zone 'Europe/Oslo')::date
)
where entry.diary_date is null;

alter table public.diary_entries
alter column diary_date set default ((now() at time zone 'Europe/Oslo')::date);

alter table public.diary_entries
alter column diary_date set not null;

create index if not exists diary_entries_trip_date_idx
on public.diary_entries(trip_id, diary_date, created_at);
