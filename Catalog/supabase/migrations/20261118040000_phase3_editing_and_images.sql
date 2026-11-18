alter table public.entries
  add column image_path text,
  add column image_alt text,
  add constraint entries_image_alt_requires_path
    check (
      (image_path is null and image_alt is null)
      or (
        image_path is not null
        and btrim(image_path) <> ''
        and image_alt is not null
        and btrim(image_alt) <> ''
      )
    );

grant insert (id, name, description, entry_type_id, status, image_path, image_alt)
  on public.entries to authenticated;
grant update (name, description, entry_type_id, status, image_path, image_alt)
  on public.entries to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'catalog-images',
  'catalog-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Visitors can read images for published entries"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'catalog-images'
  and (
    public.is_catalog_developer()
    or exists (
      select 1
      from public.entries
      where entries.image_path = objects.name
        and entries.status = 'published'
    )
  )
);

create policy "Developers can upload catalog images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalog-images'
  and public.is_catalog_developer()
);

create policy "Developers can delete catalog images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalog-images'
  and public.is_catalog_developer()
);

create function public.save_catalog_entry(
  p_entry_id uuid,
  p_name text,
  p_description text,
  p_entry_type_id text,
  p_status text,
  p_realm_ids uuid[],
  p_species_id uuid,
  p_group_ids uuid[],
  p_tag_names text[],
  p_image_path text,
  p_image_alt text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_entry_id uuid;
  tag_name text;
  tag_id uuid;
begin
  if not public.is_catalog_developer() then
    raise exception using
      errcode = '42501',
      message = 'Catalog developer access is required';
  end if;

  if btrim(coalesce(p_name, '')) = '' then
    raise exception using
      errcode = '23514',
      message = 'Entry name is required';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception using
      errcode = '23514',
      message = 'Entry status must be draft or published';
  end if;

  if p_image_path is null and p_image_alt is not null then
    raise exception using
      errcode = '23514',
      message = 'Image alt text requires an image';
  end if;

  if p_image_path is not null and btrim(coalesce(p_image_alt, '')) = '' then
    raise exception using
      errcode = '23514',
      message = 'Image alt text is required';
  end if;

  select id
  into saved_entry_id
  from public.entries
  where id = p_entry_id;

  if saved_entry_id is null then
    if p_entry_id is null then
      insert into public.entries (
        name, description, entry_type_id, status, image_path, image_alt
      )
      values (
        btrim(p_name), coalesce(p_description, ''), p_entry_type_id, p_status,
        p_image_path, p_image_alt
      )
      returning id into saved_entry_id;
    else
      insert into public.entries (
        id, name, description, entry_type_id, status, image_path, image_alt
      )
      values (
        p_entry_id, btrim(p_name), coalesce(p_description, ''), p_entry_type_id,
        p_status, p_image_path, p_image_alt
      )
      returning id into saved_entry_id;
    end if;
  else
    update public.entries
    set
      name = btrim(p_name),
      description = coalesce(p_description, ''),
      entry_type_id = p_entry_type_id,
      status = p_status,
      image_path = p_image_path,
      image_alt = p_image_alt
    where id = p_entry_id
    returning id into saved_entry_id;

  end if;

  if p_entry_type_id <> 'being'
    and (
      cardinality(coalesce(p_realm_ids, array[]::uuid[])) > 0
      or p_species_id is not null
      or cardinality(coalesce(p_group_ids, array[]::uuid[])) > 0
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Only beings can have realm, species, and group links';
  end if;

  delete from public.entry_relationships
  where source_entry_id = saved_entry_id;

  insert into public.entry_relationships (
    source_entry_id, relationship_type, target_entry_id
  )
  select saved_entry_id, 'realm', target_id
  from unnest(coalesce(p_realm_ids, array[]::uuid[])) as realms(target_id);

  if p_species_id is not null then
    insert into public.entry_relationships (
      source_entry_id, relationship_type, target_entry_id
    )
    values (saved_entry_id, 'species', p_species_id);
  end if;

  insert into public.entry_relationships (
    source_entry_id, relationship_type, target_entry_id
  )
  select saved_entry_id, 'group', target_id
  from unnest(coalesce(p_group_ids, array[]::uuid[])) as groups(target_id);

  delete from public.entry_tags
  where entry_id = saved_entry_id;

  for tag_name in
    select min(btrim(input_name))
    from unnest(coalesce(p_tag_names, array[]::text[])) as tags(input_name)
    where btrim(input_name) <> ''
    group by lower(btrim(input_name))
  loop
    if length(tag_name) > 80 then
      raise exception using
        errcode = '23514',
        message = 'Tag names cannot exceed 80 characters';
    end if;

    insert into public.tags (name)
    values (tag_name)
    on conflict (lower(name)) do update
      set name = public.tags.name
    returning id into tag_id;

    insert into public.entry_tags (entry_id, tag_id)
    values (saved_entry_id, tag_id);
  end loop;

  return saved_entry_id;
end;
$$;

revoke all on function public.save_catalog_entry(
  uuid, text, text, text, text, uuid[], uuid, uuid[], text[], text, text
) from public, anon, authenticated;
grant execute on function public.save_catalog_entry(
  uuid, text, text, text, text, uuid[], uuid, uuid[], text[], text, text
) to authenticated;
