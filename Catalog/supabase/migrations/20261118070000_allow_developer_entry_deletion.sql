create policy "Developers can delete entries"
on public.entries
for delete
to authenticated
using (public.is_catalog_developer());

grant delete on public.entries to authenticated;
