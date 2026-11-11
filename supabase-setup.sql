-- Urlop Tracker: run once in Supabase → SQL Editor → New query → Run

create table if not exists public.urlop_storage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.urlop_storage enable row level security;

-- Each logged-in user sees and edits only their own rows.
create policy "own rows select" on public.urlop_storage
  for select to authenticated using (auth.uid() = user_id);

create policy "own rows insert" on public.urlop_storage
  for insert to authenticated with check (auth.uid() = user_id);

create policy "own rows update" on public.urlop_storage
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows delete" on public.urlop_storage
  for delete to authenticated using (auth.uid() = user_id);
