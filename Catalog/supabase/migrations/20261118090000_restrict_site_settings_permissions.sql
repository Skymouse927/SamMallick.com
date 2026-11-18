revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (logo_path) on public.site_settings to authenticated;

notify pgrst, 'reload schema';
