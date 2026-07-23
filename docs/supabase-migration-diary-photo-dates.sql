alter table public.diary_media
  add column if not exists taken_at timestamptz;

create index if not exists diary_media_taken_at_idx
  on public.diary_media(taken_at);
