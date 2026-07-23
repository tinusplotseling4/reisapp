create table if not exists public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references public.diary_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists diary_comments_entry_id_idx
  on public.diary_comments(diary_entry_id, created_at);

alter table public.diary_comments enable row level security;

drop policy if exists "members can read diary comments" on public.diary_comments;
create policy "members can read diary comments"
on public.diary_comments for select
to authenticated
using (
  exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.is_trip_member(entry.trip_id)
  )
);

drop policy if exists "members can create diary comments" on public.diary_comments;
create policy "members can create diary comments"
on public.diary_comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.diary_entries entry
    where entry.id = diary_entry_id
      and public.is_trip_member(entry.trip_id)
  )
);
