insert into public.entries (id, name, description, entry_type_id, status)
values
  (
    '40000000-0000-0000-0000-000000000001',
    'Astra Vale',
    'A curious wayfinder from the northern reaches.',
    'being',
    'published'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Unfinished Wisp',
    'A local-only example of an unpublished draft.',
    'being',
    'draft'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Whispering Vale',
    'A quiet realm of misty forests.',
    'realm',
    'published'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'Glasswood',
    'A bright woodland realm.',
    'realm',
    'published'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'Moonfox',
    'A nocturnal species known for its silver markings.',
    'species',
    'published'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    'Nightwardens',
    'A group that watches the old paths.',
    'group',
    'published'
  );

insert into public.entry_relationships (
  source_entry_id,
  relationship_type,
  target_entry_id
)
values
  ('40000000-0000-0000-0000-000000000001', 'realm', '40000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000001', 'realm', '40000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000001', 'species', '40000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000001', 'group', '40000000-0000-0000-0000-000000000006');
