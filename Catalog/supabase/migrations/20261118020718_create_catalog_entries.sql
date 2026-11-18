create table public.entries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  entry_type text not null check (entry_type in ('being', 'realm', 'species', 'group')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

grant select on public.entries to anon, authenticated;

create policy "Anyone can read published entries"
on public.entries
for select
to anon, authenticated
using (status = 'published');