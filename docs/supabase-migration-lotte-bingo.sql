-- Run this migration to centrally sync Lotte's bingo card and photos.

create table if not exists public.lotte_bingo_items (
  trip_id uuid not null references public.trips(id) on delete cascade,
  item_index integer not null check (item_index between 0 and 32),
  checked boolean not null default false,
  note text not null default '',
  score integer check (score between 1 and 5),
  photo_path text,
  updated_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (trip_id, item_index)
);

create index if not exists lotte_bingo_items_trip_updated_idx
on public.lotte_bingo_items(trip_id, updated_at);

alter table public.lotte_bingo_items enable row level security;

drop policy if exists "trip members can read lotte bingo" on public.lotte_bingo_items;
create policy "trip members can read lotte bingo"
on public.lotte_bingo_items for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "active travelers can add lotte bingo" on public.lotte_bingo_items;
create policy "active travelers can add lotte bingo"
on public.lotte_bingo_items for insert
to authenticated
with check (
  updated_by = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

drop policy if exists "active travelers can update lotte bingo" on public.lotte_bingo_items;
create policy "active travelers can update lotte bingo"
on public.lotte_bingo_items for update
to authenticated
using (public.has_trip_role(trip_id, array['admin', 'leader', 'traveler']))
with check (
  updated_by = auth.uid()
  and public.has_trip_role(trip_id, array['admin', 'leader', 'traveler'])
);

insert into storage.buckets (id, name, public)
values ('lotte-photos', 'lotte-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "trip members can read lotte photos" on storage.objects;
create policy "trip members can read lotte photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lotte-photos'
  and public.is_trip_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "active travelers can upload lotte photos" on storage.objects;
create policy "active travelers can upload lotte photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lotte-photos'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
);

drop policy if exists "active travelers can update lotte photos" on storage.objects;
create policy "active travelers can update lotte photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lotte-photos'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
)
with check (
  bucket_id = 'lotte-photos'
  and public.has_trip_role((storage.foldername(name))[1]::uuid, array['admin', 'leader', 'traveler'])
);

