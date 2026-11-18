begin;

select plan(37);

select ok(
  to_regclass('public.tags') is null
    and to_regclass('public.entry_tags') is null,
  'catalog descriptive tag tables have been removed'
);

insert into public.entries (id, name, entry_type_id, status)
values
  ('10000000-0000-0000-0000-000000000001', 'Published being', 'being', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'Draft being', 'being', 'draft'),
  ('10000000-0000-0000-0000-000000000003', 'First realm', 'realm', 'published'),
  ('10000000-0000-0000-0000-000000000004', 'Second realm', 'realm', 'published'),
  ('10000000-0000-0000-0000-000000000005', 'Species', 'species', 'published'),
  ('10000000-0000-0000-0000-000000000006', 'Group', 'group', 'published');

update public.entries
set image_path = 'test/published.png', image_alt = 'Published test image'
where id = '10000000-0000-0000-0000-000000000001';
update public.entries
set image_path = 'test/draft.png', image_alt = 'Draft test image'
where id = '10000000-0000-0000-0000-000000000002';

insert into storage.objects (bucket_id, name)
values
  ('catalog-images', 'test/published.png'),
  ('catalog-images', 'test/draft.png');

select ok(
  not (select public from storage.buckets where id = 'catalog-images'),
  'catalog images are stored in a private bucket'
);

insert into public.entry_relationships (source_entry_id, relationship_type, target_entry_id)
values
  ('10000000-0000-0000-0000-000000000001', 'realm', '10000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000001', 'realm', '10000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000001', 'species', '10000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000001', 'group', '10000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000002', 'realm', '10000000-0000-0000-0000-000000000003');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (
    select count(*)::integer
    from public.entries
    where id::text like '10000000-0000-0000-0000-00000000000%'
  ),
  5,
  'visitors can read published entries but not drafts'
);
select is(
  (
    select count(*)::integer
    from public.entry_relationships
    where source_entry_id = '10000000-0000-0000-0000-000000000001'
      and relationship_type = 'realm'
  ),
  2,
  'a being can link to multiple realms'
);
select is(
  (
    select count(*)::integer
    from public.entry_relationships
    where source_entry_id::text like '10000000-0000-0000-0000-00000000000%'
  ),
  4,
  'visitors can read published links but not draft links'
);
select ok(
  not public.is_catalog_developer(),
  'anonymous visitors are not developers'
);
select ok(
  not has_table_privilege('anon', 'public.entries', 'INSERT'),
  'anonymous visitors do not have entry insert privileges'
);
select throws_ok(
  $$select public.save_catalog_entry(
    null, 'Unauthorized', '', 'being', 'draft', array[]::uuid[], null,
    array[]::uuid[], null, null
  )$$,
  '42501',
  null,
  'anonymous visitors cannot use the catalog save function'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'catalog-images'
      and name in ('test/published.png', 'test/draft.png')
  ),
  1,
  'visitors can read only images attached to published entries'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('catalog-images', 'test/visitor-upload.png')$$,
  '42501',
  null,
  'visitors cannot upload catalog images'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"30000000-0000-0000-0000-000000000001","app_metadata":{"provider":"email"}}',
  true
);

select is(
  (
    select count(*)::integer
    from public.entries
    where id::text like '10000000-0000-0000-0000-00000000000%'
  ),
  5,
  'signed-in non-developers can read published entries only'
);
select ok(
  not public.is_catalog_developer(),
  'signed-in visitors are not developers by default'
);
select throws_ok(
  $$insert into public.entries (name, entry_type_id) values ('Unauthorized', 'being')$$,
  '42501',
  null,
  'signed-in non-developers cannot create entries'
);
select lives_ok(
  $$delete from public.entries
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'signed-in non-developers cannot delete entries'
);
select is(
  (
    select count(*)::integer
    from public.entries
    where id = '10000000-0000-0000-0000-000000000001'
  ),
  1,
  'the entry remains after a non-developer delete attempt'
);
select throws_ok(
  $$select public.save_catalog_entry(
    null, 'Unauthorized', '', 'being', 'draft', array[]::uuid[], null,
    array[]::uuid[], null, null
  )$$,
  '42501',
  null,
  'signed-in non-developers cannot use the catalog save function'
);
select throws_ok(
  $$select public.create_catalog_related_entry(
    '10000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    'realm',
    'Unauthorized realm',
    '',
    'draft',
    null,
    null
  )$$,
  '42501',
  null,
  'signed-in non-developers cannot create related entries'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'catalog-images'
      and name in ('test/published.png', 'test/draft.png')
  ),
  1,
  'signed-in non-developers cannot read images attached to drafts'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('catalog-images', 'test/non-developer-upload.png')$$,
  '42501',
  null,
  'signed-in non-developers cannot upload catalog images'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"30000000-0000-0000-0000-000000000002","app_metadata":{"catalog_role":"developer"}}',
  true
);

select ok(
  public.is_catalog_developer(),
  'administrator-granted developer metadata is recognized'
);
select is(
  (
    select count(*)::integer
    from public.entries
    where id::text like '10000000-0000-0000-0000-00000000000%'
  ),
  6,
  'developers can read drafts as well as published entries'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'catalog-images'
      and name in ('test/published.png', 'test/draft.png')
  ),
  2,
  'developers can read published and draft images'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('catalog-images', 'test/developer-upload.png')$$,
  'developers can upload catalog images'
);
select lives_ok(
  $$insert into public.entries (name, entry_type_id, status) values ('Developer draft', 'being', 'draft')$$,
  'developers can create entries'
);
select lives_ok(
  $$update public.entries set name = 'Updated draft' where id = '10000000-0000-0000-0000-000000000002'$$,
  'developers can edit entries'
);
select throws_ok(
  $$insert into public.entry_relationships (source_entry_id, relationship_type, target_entry_id)
    values ('10000000-0000-0000-0000-000000000001', 'realm', '10000000-0000-0000-0000-000000000005')$$,
  '23514',
  'Relationship type must match the target entry type',
  'relationship type must match the linked entry type'
);
select lives_ok(
  $$select public.save_catalog_entry(
    '10000000-0000-0000-0000-000000000007',
    'Editor-created being',
    'Created by the Phase 3 save workflow.',
    'being',
    'draft',
    array['10000000-0000-0000-0000-000000000003']::uuid[],
    '10000000-0000-0000-0000-000000000005',
    array['10000000-0000-0000-0000-000000000006']::uuid[],
    null,
    null
  )$$,
  'developers can save an entry with relationships'
);
select is(
  (select status from public.entries where id = '10000000-0000-0000-0000-000000000007'),
  'draft',
  'the editor can save a draft without an image'
);
select is(
  (
    select count(*)::integer
    from public.entry_relationships
    where source_entry_id = '10000000-0000-0000-0000-000000000007'
  ),
  3,
  'the editor saves the selected realm, species, and group links'
);
select lives_ok(
  $$select public.save_catalog_entry(
    '10000000-0000-0000-0000-000000000007',
    'Editor-created being',
    'Created by the Phase 3 save workflow.',
    'being',
    'published',
    array['10000000-0000-0000-0000-000000000003']::uuid[],
    '10000000-0000-0000-0000-000000000005',
    array['10000000-0000-0000-0000-000000000006']::uuid[],
    null,
    null
  )$$,
  'developers can publish an entry without an image'
);
select is(
  (select status from public.entries where id = '10000000-0000-0000-0000-000000000007'),
  'published',
  'the editor saves the published status'
);
select lives_ok(
  $$select public.create_catalog_related_entry(
    '10000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    'species',
    'Inline species',
    'Created from the Being editor.',
    'draft',
    null,
    null
  )$$,
  'developers can create and link related entries from a Being'
);
select is(
  (
    select count(*)::integer
    from public.entry_relationships
    where source_entry_id = '10000000-0000-0000-0000-000000000001'
      and relationship_type = 'species'
      and target_entry_id = '10000000-0000-0000-0000-000000000008'
  ),
  1,
  'the inline-created entry is immediately linked to its Being'
);
select is(
  (
    select entry_type_id
    from public.entries
    where id = '10000000-0000-0000-0000-000000000008'
  ),
  'species',
  'the inline-created related entry has the selected type'
);
select lives_ok(
  $$delete from public.entries
    where id = '10000000-0000-0000-0000-000000000008'$$,
  'developers can delete catalog entries'
);
select is(
  (
    select count(*)::integer
    from public.entries
    where id = '10000000-0000-0000-0000-000000000008'
  ),
  0,
  'deleting an entry removes it from the database'
);
select is(
  (
    select count(*)::integer
    from public.entry_relationships
    where target_entry_id = '10000000-0000-0000-0000-000000000008'
  ),
  0,
  'deleting an entry removes its relationship links'
);
select * from finish();
rollback;
