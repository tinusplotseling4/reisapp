create table if not exists public.diary_media_likes (
  id uuid primary key default gen_random_uuid(),
  diary_media_id uuid not null references public.diary_media(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (diary_media_id, user_id)
);

create index if not exists diary_media_likes_media_idx
  on public.diary_media_likes(diary_media_id, created_at);

alter table public.diary_media_likes enable row level security;

drop policy if exists "members can read diary photo likes" on public.diary_media_likes;
create policy "members can read diary photo likes"
on public.diary_media_likes for select
to authenticated
using (
  exists (
    select 1
    from public.diary_media media
    join public.diary_entries entry on entry.id = media.diary_entry_id
    where media.id = diary_media_id
      and media.kind = 'photo'
      and public.is_trip_member(entry.trip_id)
  )
);

drop policy if exists "members can create diary photo likes" on public.diary_media_likes;
create policy "members can create diary photo likes"
on public.diary_media_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.diary_media media
    join public.diary_entries entry on entry.id = media.diary_entry_id
    where media.id = diary_media_id
      and media.kind = 'photo'
      and public.is_trip_member(entry.trip_id)
  )
);

drop policy if exists "members can remove own diary photo likes" on public.diary_media_likes;
create policy "members can remove own diary photo likes"
on public.diary_media_likes for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.diary_media media
    join public.diary_entries entry on entry.id = media.diary_entry_id
    where media.id = diary_media_id
      and media.kind = 'photo'
      and public.is_trip_member(entry.trip_id)
  )
);
