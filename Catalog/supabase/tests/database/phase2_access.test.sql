begin;

select plan(14);

insert into public.entries (id, name, entry_type_id, status)
values
  ('10000000-0000-0000-0000-000000000001', 'Published being', 'being', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'Draft being', 'being', 'draft'),
  ('10000000-0000-0000-0000-000000000003', 'First realm', 'realm', 'published'),
  ('10000000-0000-0000-0000-000000000004', 'Second realm', 'realm', 'published'),
  ('10000000-0000-0000-0000-000000000005', 'Species', 'species', 'published'),
  ('10000000-0000-0000-0000-000000000006', 'Group', 'group', 'published');

insert into public.tags (id, name)
values
  ('20000000-0000-0000-0000-000000000001', 'test-nocturnal'),
  ('20000000-0000-0000-0000-000000000002', 'test-draft-only');

insert into public.entry_tags (entry_id, tag_id)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

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
    from public.entry_tags
    where entry_id::text like '10000000-0000-0000-0000-00000000000%'
  ),
  1,
  'visitors cannot read tags attached only to drafts'
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

select * from finish();
rollback;
