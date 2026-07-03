create or replace function public.extract_user_id_from_storage_path(path text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(path, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists "listing_uploads_select_own" on storage.objects;
create policy "listing_uploads_select_own"
on storage.objects
for select
using (
  bucket_id = 'listing-uploads'
  and (
    auth.uid() = public.extract_user_id_from_storage_path(name)
    or public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
  )
);

drop policy if exists "listing_uploads_insert_own" on storage.objects;
create policy "listing_uploads_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'listing-uploads'
  and auth.uid() = public.extract_user_id_from_storage_path(name)
);

drop policy if exists "listing_uploads_update_own" on storage.objects;
create policy "listing_uploads_update_own"
on storage.objects
for update
using (
  bucket_id = 'listing-uploads'
  and (
    auth.uid() = public.extract_user_id_from_storage_path(name)
    or public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
  )
)
with check (
  bucket_id = 'listing-uploads'
  and (
    auth.uid() = public.extract_user_id_from_storage_path(name)
    or public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
  )
);

drop policy if exists "listing_uploads_delete_own" on storage.objects;
create policy "listing_uploads_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'listing-uploads'
  and (
    auth.uid() = public.extract_user_id_from_storage_path(name)
    or public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
  )
);
