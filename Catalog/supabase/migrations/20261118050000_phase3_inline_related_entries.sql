create function public.create_catalog_related_entry(
  p_entry_id uuid,
  p_source_entry_id uuid,
  p_relationship_type text,
  p_name text,
  p_description text,
  p_status text,
  p_tag_names text[],
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
    p_tag_names,
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
  uuid, uuid, text, text, text, text, text[], text, text
) from public, anon, authenticated;
grant execute on function public.create_catalog_related_entry(
  uuid, uuid, text, text, text, text, text[], text, text
) to authenticated;
