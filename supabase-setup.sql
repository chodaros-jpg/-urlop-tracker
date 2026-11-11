-- Urlop Tracker schema (already applied to Supabase project urlop-tracker)

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
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own rows insert" on public.urlop_storage
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own rows update" on public.urlop_storage
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows delete" on public.urlop_storage
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Ping target for .github/workflows/supabase-keepalive.yml (returns only the time).
create or replace function public.keepalive()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
