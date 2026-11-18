drop function public.create_catalog_related_entry(
  uuid, uuid, text, text, text, text, text[], text, text
);
drop function public.save_catalog_entry(
  uuid, text, text, text, text, uuid[], uuid, uuid[], text[], text, text
);

drop policy "Anyone can read tags used by published entries" on public.tags;
drop table public.entry_tags;
drop table public.tags;

create function public.save_catalog_entry(
  p_entry_id uuid,
  p_name text,
  p_description text,
  p_entry_type_id text,
  p_status text,
  p_realm_ids uuid[],
  p_species_id uuid,
  p_group_ids uuid[],
  p_image_path text,
  p_image_alt text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_entry_id uuid;
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

  return saved_entry_id;
end;
$$;

revoke all on function public.save_catalog_entry(
  uuid, text, text, text, text, uuid[], uuid, uuid[], text, text
) from public, anon, authenticated;
grant execute on function public.save_catalog_entry(
  uuid, text, text, text, text, uuid[], uuid, uuid[], text, text
) to authenticated;

create function public.create_catalog_related_entry(
  p_entry_id uuid,
  p_source_entry_id uuid,
  p_relationship_type text,
  p_name text,
  p_description text,
  p_status text,
  p_image_path text,
  p_image_alt text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  source_type text;
  saved_entry_id uuid;
begin
  if not public.is_catalog_developer() then
    raise exception using
      errcode = '42501',
      message = 'Catalog developer access is required';
  end if;

  if p_relationship_type not in ('realm', 'species', 'group') then
    raise exception using
      errcode = '23514',
      message = 'Related entries must be realms, species, or groups';
  end if;

  select entry_type_id
  into source_type
  from public.entries
  where id = p_source_entry_id;

  if source_type is distinct from 'being' then
    raise exception using
      errcode = '23514',
      message = 'Only beings can have realm, species, and group relationships';
  end if;

  saved_entry_id := public.save_catalog_entry(
    p_entry_id,
    p_name,
    p_description,
    p_relationship_type,
    p_status,
    array[]::uuid[],
    null,
    array[]::uuid[],
    p_image_path,
    p_image_alt
  );

  if p_relationship_type = 'species' then
    delete from public.entry_relationships
    where source_entry_id = p_source_entry_id
      and relationship_type = 'species';
  end if;

  insert into public.entry_relationships (
    source_entry_id,
    relationship_type,
    target_entry_id
  )
  values (
    p_source_entry_id,
    p_relationship_type,
    saved_entry_id
  );

  return saved_entry_id;
end;
$$;

revoke all on function public.create_catalog_related_entry(
  uuid, uuid, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_catalog_related_entry(
  uuid, uuid, text, text, text, text, text, text
) to authenticated;
