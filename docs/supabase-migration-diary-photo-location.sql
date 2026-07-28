-- Adds optional GPS metadata for diary photos.
-- Run this in the Supabase SQL editor for the Noorwegen project.

alter table public.diary_media
  add column if not exists lat double precision,
  add column if not exists lon double precision;

create index if not exists diary_media_location_idx
  on public.diary_media(lat, lon);
