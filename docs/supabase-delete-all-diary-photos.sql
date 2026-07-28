-- Delete all visible diary photos for Rondreis Noorwegen 2026.
-- This removes photo rows from public.diary_media, so the app no longer shows them.
-- Dagboekteksten, audio and comments are kept. Empty photo-only diary entries are removed.
--
-- Supabase does not allow direct deletion from storage.objects in SQL.
-- The actual files in the private diary-photos bucket can be cleaned later via Storage/API.

with selected_trip as (
  select id
  from public.trips
  where slug = 'noorwegen-2026'
),
target_photo_media as (
  select media.id
  from public.diary_media media
  join public.diary_entries entry on entry.id = media.diary_entry_id
  join selected_trip trip on trip.id = entry.trip_id
  where media.kind = 'photo'
),
deleted_photos as (
  delete from public.diary_media media
  using target_photo_media target
  where media.id = target.id
  returning media.id
),
empty_entries as (
  select entry.id
  from public.diary_entries entry
  join selected_trip trip on trip.id = entry.trip_id
  where coalesce(nullif(trim(entry.note), ''), nullif(trim(entry.transcript), '')) is null
    and not exists (
      select 1
      from public.diary_media media
      where media.diary_entry_id = entry.id
    )
    and not exists (
      select 1
      from public.diary_comments comment
      where comment.diary_entry_id = entry.id
    )
),
deleted_empty_entries as (
  delete from public.diary_entries entry
  using empty_entries empty
  where entry.id = empty.id
  returning entry.id
)
select
  (select count(*) from deleted_photos) as visible_photos_deleted,
  (select count(*) from deleted_empty_entries) as empty_diary_entries_deleted;
