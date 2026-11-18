begin;

select plan(8);

insert into storage.objects (bucket_id, name)
values ('catalog-images', 'site-logo/test.png');

update public.site_settings
set logo_path = 'site-logo/test.png'
where singleton;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select logo_path from public.site_settings where singleton),
  'site-logo/test.png',
  'visitors can read the configured site logo path'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'catalog-images'
      and name = 'site-logo/test.png'
  ),
  1,
  'visitors can read the configured site logo image'
);
select ok(
  not has_table_privilege('anon', 'public.site_settings', 'UPDATE'),
  'visitors do not have update privileges on site settings'
);
select throws_ok(
  $$update public.site_settings
    set logo_path = 'site-logo/unauthorized.png'
    where singleton$$,
  '42501',
  null,
  'visitors cannot update site settings'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"30000000-0000-0000-0000-000000000001","app_metadata":{"provider":"email"}}',
  true
);

select lives_ok(
  $$update public.site_settings
    set logo_path = 'site-logo/non-developer.png'
    where singleton$$,
  'signed-in non-developers cannot update site settings'
);
select is(
  (select logo_path from public.site_settings where singleton),
  'site-logo/test.png',
  'site settings remain unchanged after a non-developer update'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"30000000-0000-0000-0000-000000000002","app_metadata":{"catalog_role":"developer"}}',
  true
);

select lives_ok(
  $$update public.site_settings
    set logo_path = 'site-logo/developer.png'
    where singleton$$,
  'developers can update the site logo'
);

reset role;
select is(
  (select logo_path from public.site_settings where singleton),
  'site-logo/developer.png',
  'developer logo updates are persisted'
);

select * from finish();
rollback;
