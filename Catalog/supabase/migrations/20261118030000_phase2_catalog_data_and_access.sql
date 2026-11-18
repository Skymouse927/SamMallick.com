create table public.entry_types (
  id text primary key check (id = btrim(id) and id <> ''),
  label text not null unique check (label = btrim(label) and label <> '')
);

insert into public.entry_types (id, label)
values
  ('being', 'Being'),
  ('realm', 'Realm'),
  ('species', 'Species'),
  ('group', 'Group');

alter table public.entries
  add column entry_type_id text references public.entry_types(id);

update public.entries
set entry_type_id = entry_type;

alter table public.entries
  alter column entry_type_id set not null,
  drop constraint entries_entry_type_check,
  drop column entry_type;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and name <> ''),
  created_at timestamptz not null default now()
);

create unique index tags_name_case_insensitive_unique
  on public.tags (lower(name));

create table public.entry_tags (
  entry_id uuid not null references public.entries(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, tag_id)
);

create table public.entry_relationships (
  source_entry_id uuid not null references public.entries(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('realm', 'species', 'group')),
  target_entry_id uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_entry_id, relationship_type, target_entry_id),
  check (source_entry_id <> target_entry_id)
);

create unique index one_species_per_being
  on public.entry_relationships (source_entry_id)
  where relationship_type = 'species';

create index entry_relationships_target_idx
  on public.entry_relationships (target_entry_id);

create function public.is_catalog_developer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'catalog_role' = 'developer',
    false
  );
$$;

grant execute on function public.is_catalog_developer() to anon, authenticated;

create function public.validate_entry_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_type text;
  target_type text;
begin
  select entry_type_id
  into source_type
  from public.entries
  where id = new.source_entry_id;

  select entry_type_id
  into target_type
  from public.entries
  where id = new.target_entry_id;

  if source_type is distinct from 'being' then
    raise exception using
      errcode = '23514',
      message = 'Only beings can have these relationships';
  end if;

  if target_type is distinct from new.relationship_type then
    raise exception using
      errcode = '23514',
      message = 'Relationship type must match the target entry type';
  end if;

  return new;
end;
$$;

create trigger validate_entry_relationship
before insert or update on public.entry_relationships
for each row execute function public.validate_entry_relationship();

alter table public.entry_types enable row level security;
alter table public.tags enable row level security;
alter table public.entry_tags enable row level security;
alter table public.entry_relationships enable row level security;

create policy "Anyone can read entry types"
on public.entry_types
for select
to anon, authenticated
using (true);

create policy "Developers can read drafts"
on public.entries
for select
to authenticated
using (public.is_catalog_developer());

create policy "Developers can create entries"
on public.entries
for insert
to authenticated
with check (public.is_catalog_developer());

create policy "Developers can update entries"
on public.entries
for update
to authenticated
using (public.is_catalog_developer())
with check (public.is_catalog_developer());

create policy "Anyone can read tags used by published entries"
on public.tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.entry_tags
    join public.entries on entries.id = entry_tags.entry_id
    where entry_tags.tag_id = tags.id
      and entries.status = 'published'
  )
);

create policy "Developers can read all tags"
on public.tags
for select
to authenticated
using (public.is_catalog_developer());

create policy "Developers can manage tags"
on public.tags
for all
to authenticated
using (public.is_catalog_developer())
with check (public.is_catalog_developer());

create policy "Anyone can read tags for published entries"
on public.entry_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.entries
    where entries.id = entry_tags.entry_id
      and entries.status = 'published'
  )
);

create policy "Developers can manage entry tags"
on public.entry_tags
for all
to authenticated
using (public.is_catalog_developer())
with check (public.is_catalog_developer());

create policy "Anyone can read relationships between published entries"
on public.entry_relationships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.entries as source
    join public.entries as target on target.id = entry_relationships.target_entry_id
    where source.id = entry_relationships.source_entry_id
      and source.status = 'published'
      and target.status = 'published'
  )
);

create policy "Developers can manage entry relationships"
on public.entry_relationships
for all
to authenticated
using (public.is_catalog_developer())
with check (public.is_catalog_developer());

revoke all on public.entry_types, public.tags, public.entry_tags,
  public.entry_relationships from anon, authenticated;
grant select on public.entry_types to anon, authenticated;
grant select on public.tags, public.entry_tags, public.entry_relationships
  to anon, authenticated;
grant insert, update, delete on public.tags, public.entry_tags,
  public.entry_relationships to authenticated;

revoke insert, update, delete on public.entries from anon, authenticated;
grant select on public.entries to anon, authenticated;
grant insert (name, description, entry_type_id, status)
  on public.entries to authenticated;
grant update (name, description, entry_type_id, status)
  on public.entries to authenticated;
