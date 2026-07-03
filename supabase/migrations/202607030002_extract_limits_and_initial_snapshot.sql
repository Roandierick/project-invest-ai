create table if not exists public.vision_extract_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, window_start)
);

alter table public.vision_extract_rate_limits enable row level security;

create or replace function public.ensure_conversation_snapshot(
  target_conversation_id uuid,
  input_data jsonb
)
returns table (
  snapshot_id uuid,
  version integer,
  created boolean
)
language plpgsql
set search_path = public
as $$
declare
  existing_snapshot_id uuid;
  existing_version integer;
begin
  perform 1
  from public.conversations
  where id = target_conversation_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Conversation not found or not owned by current user';
  end if;

  select snapshot.id, snapshot.version
  into existing_snapshot_id, existing_version
  from public.analysis_snapshots snapshot
  where snapshot.conversation_id = target_conversation_id
  order by snapshot.version desc
  limit 1;

  if existing_snapshot_id is not null then
    return query
    select existing_snapshot_id, existing_version, false;
    return;
  end if;

  insert into public.analysis_snapshots (
    conversation_id,
    version,
    input_data,
    calculated_results
  )
  values (
    target_conversation_id,
    1,
    input_data,
    null
  )
  returning id, version into existing_snapshot_id, existing_version;

  update public.conversations
  set updated_at = now()
  where id = target_conversation_id;

  return query
  select existing_snapshot_id, existing_version, true;
end;
$$;

create or replace function public.consume_vision_extract_rate_limit(
  max_requests integer default 20,
  window_seconds integer default 3600
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  request_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  effective_window_start timestamptz;
  effective_reset_at timestamptz;
  current_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if max_requests < 1 or window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  effective_window_start :=
    to_timestamp(
      floor(extract(epoch from now()) / window_seconds) * window_seconds
    );
  effective_reset_at :=
    effective_window_start + make_interval(secs => window_seconds);

  loop
    update public.vision_extract_rate_limits
    set request_count = request_count + 1,
        updated_at = now()
    where user_id = caller_id
      and window_start = effective_window_start
      and request_count < max_requests
    returning vision_extract_rate_limits.request_count into current_count;

    if found then
      return query
      select true,
             greatest(max_requests - current_count, 0),
             effective_reset_at,
             current_count;
      return;
    end if;

    begin
      insert into public.vision_extract_rate_limits (
        user_id,
        window_start,
        request_count
      )
      values (
        caller_id,
        effective_window_start,
        1
      )
      returning vision_extract_rate_limits.request_count into current_count;

      return query
      select true,
             max_requests - 1,
             effective_reset_at,
             current_count;
      return;
    exception
      when unique_violation then
        null;
    end;

    select vision_extract_rate_limits.request_count
    into current_count
    from public.vision_extract_rate_limits
    where user_id = caller_id
      and window_start = effective_window_start;

    if current_count is null then
      continue;
    end if;

    if current_count >= max_requests then
      return query
      select false, 0, effective_reset_at, current_count;
      return;
    end if;
  end loop;
end;
$$;

grant execute on function public.ensure_conversation_snapshot(uuid, jsonb) to authenticated;
grant execute on function public.consume_vision_extract_rate_limit(integer, integer) to authenticated;
