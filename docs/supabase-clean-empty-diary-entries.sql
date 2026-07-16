-- Opschonen van lege/kapotte dagboek-testregels voor Rondreis Noorwegen 2026.
--
-- Dit wist alleen dagboekregels zonder tekst, zonder transcript en zonder gekoppelde media.
-- Gebruikers, rollen, uitnodigingen, GPS, bezochte punten en echte dagboeknotities blijven staan.

with selected_trip as (
  select id
  from public.trips
  where slug = 'noorwegen-2026'
),
empty_entries as (
  select entry.id
  from public.diary_entries entry
  join selected_trip trip on trip.id = entry.trip_id
  where coalesce(nullif(trim(entry.note), ''), '') = ''
    and coalesce(nullif(trim(entry.transcript), ''), '') = ''
    and not exists (
      select 1
      from public.diary_media media
      where media.diary_entry_id = entry.id
    )
),
deleted_entries as (
  delete from public.diary_entries entry
  using empty_entries empty
  where entry.id = empty.id
  returning entry.id
)
select count(*) as empty_diary_entries_deleted
from deleted_entries;
