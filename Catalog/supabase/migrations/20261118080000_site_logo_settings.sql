create table public.site_settings (
  singleton boolean primary key default true check (singleton),
  logo_path text check (
    logo_path is null
    or (
      logo_path like 'site-logo/%'
      and strpos(logo_path, '..') = 0
    )
  )
);

insert into public.site_settings (singleton)
values (true);

alter table public.site_settings enable row level security;

grant select on public.site_settings to anon, authenticated;
grant update (logo_path) on public.site_settings to authenticated;

create policy "Visitors can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Developers can update site settings"
on public.site_settings
for update
to authenticated
using (public.is_catalog_developer())
with check (public.is_catalog_developer());

create policy "Visitors can read the site logo image"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'catalog-images'
  and exists (
    select 1
    from public.site_settings
    where site_settings.logo_path = objects.name
  )
);
