-- Reset gedeelde testdata voor Rondreis Noorwegen 2026.
-- Run dit alleen in de Supabase SQL editor als je de centrale reisdata wilt opschonen.
--
-- Dit wist:
-- - GPS-punten
-- - bezochte bezienswaardigheden
-- - etappevoortgang
-- - dagboeknotities en gekoppelde media-rijen
-- - opslagobjecten voor dagboekfoto's en audio
--
-- Dit bewaart:
-- - de reis zelf
-- - gebruikers/profielen
-- - leden, rollen en uitnodigingslinks

with selected_trip as (
  select id
  from public.trips
  where slug = 'noorwegen-2026'
),
deleted_storage as (
  delete from storage.objects object
  using selected_trip trip
  where object.bucket_id in ('diary-photos', 'diary-audio')
    and object.name like trip.id::text || '/%'
  returning object.id
),
deleted_diary as (
  delete from public.diary_entries entry
  using selected_trip trip
  where entry.trip_id = trip.id
  returning entry.id
),
deleted_gps as (
  delete from public.gps_points point
  using selected_trip trip
  where point.trip_id = trip.id
  returning point.id
),
deleted_pois as (
  delete from public.visited_pois poi
  using selected_trip trip
  where poi.trip_id = trip.id
  returning poi.id
),
deleted_progress as (
  delete from public.stage_progress progress
  using selected_trip trip
  where progress.trip_id = trip.id
  returning progress.id
)
select
  (select count(*) from deleted_storage) as storage_objects_deleted,
  (select count(*) from deleted_diary) as diary_entries_deleted,
  (select count(*) from deleted_gps) as gps_points_deleted,
  (select count(*) from deleted_pois) as visited_pois_deleted,
  (select count(*) from deleted_progress) as stage_progress_deleted;
