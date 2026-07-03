insert into storage.buckets (id, name, public)
values ('listing-uploads', 'listing-uploads', false)
on conflict (id) do nothing;

create or replace function public.extract_snapshot_id_from_storage_path(path text)
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
  and public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
);

drop policy if exists "listing_uploads_insert_own" on storage.objects;
create policy "listing_uploads_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'listing-uploads'
  and public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
);

drop policy if exists "listing_uploads_update_own" on storage.objects;
create policy "listing_uploads_update_own"
on storage.objects
for update
using (
  bucket_id = 'listing-uploads'
  and public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
)
with check (
  bucket_id = 'listing-uploads'
  and public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
);

drop policy if exists "listing_uploads_delete_own" on storage.objects;
create policy "listing_uploads_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'listing-uploads'
  and public.is_snapshot_owner(public.extract_snapshot_id_from_storage_path(name))
);

create or replace function public.append_analysis_snapshot(
  target_conversation_id uuid,
  next_title text,
  input_data jsonb,
  calculated_results jsonb,
  user_content text,
  assistant_content text
)
returns table (
  snapshot_id uuid,
  version integer,
  conversation_id uuid,
  updated_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  next_version integer;
  inserted_snapshot_id uuid;
  conversation_updated_at timestamptz;
begin
  perform 1
  from public.conversations
  where id = target_conversation_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Conversation not found or not owned by current user';
  end if;

  select coalesce(max(snapshot.version), 0) + 1
  into next_version
  from public.analysis_snapshots snapshot
  where snapshot.conversation_id = target_conversation_id;

  insert into public.analysis_snapshots (
    conversation_id,
    version,
    input_data,
    calculated_results
  )
  values (
    target_conversation_id,
    next_version,
    input_data,
    calculated_results
  )
  returning id into inserted_snapshot_id;

  insert into public.messages (conversation_id, role, content, snapshot_id)
  values
    (target_conversation_id, 'user', user_content, inserted_snapshot_id),
    (target_conversation_id, 'assistant', assistant_content, inserted_snapshot_id);

  update public.conversations
  set titel = coalesce(nullif(trim(next_title), ''), titel),
      updated_at = now()
  where id = target_conversation_id
  returning conversations.updated_at into conversation_updated_at;

  return query
  select inserted_snapshot_id, next_version, target_conversation_id, conversation_updated_at;
end;
$$;
