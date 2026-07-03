create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  version integer not null,
  input_data jsonb not null,
  calculated_results jsonb,
  created_at timestamptz not null default now(),
  constraint analysis_snapshots_conversation_version_key unique (conversation_id, version)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  snapshot_id uuid references public.analysis_snapshots(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.analysis_snapshots(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at desc);

create index if not exists analysis_snapshots_conversation_id_created_at_idx
  on public.analysis_snapshots (conversation_id, created_at desc);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

create index if not exists uploads_snapshot_id_created_at_idx
  on public.uploads (snapshot_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_conversation_owner(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = target_conversation_id
      and conversation.user_id = auth.uid()
  );
$$;

create or replace function public.is_snapshot_owner(target_snapshot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.analysis_snapshots snapshot
    join public.conversations conversation
      on conversation.id = snapshot.conversation_id
    where snapshot.id = target_snapshot_id
      and conversation.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.analysis_snapshots enable row level security;
alter table public.messages enable row level security;
alter table public.uploads enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
on public.conversations
for select
using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
on public.conversations
for insert
with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
on public.conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
on public.conversations
for delete
using (auth.uid() = user_id);

drop policy if exists "analysis_snapshots_select_own" on public.analysis_snapshots;
create policy "analysis_snapshots_select_own"
on public.analysis_snapshots
for select
using (public.is_conversation_owner(conversation_id));

drop policy if exists "analysis_snapshots_insert_own" on public.analysis_snapshots;
create policy "analysis_snapshots_insert_own"
on public.analysis_snapshots
for insert
with check (public.is_conversation_owner(conversation_id));

drop policy if exists "analysis_snapshots_update_own" on public.analysis_snapshots;
create policy "analysis_snapshots_update_own"
on public.analysis_snapshots
for update
using (public.is_conversation_owner(conversation_id))
with check (public.is_conversation_owner(conversation_id));

drop policy if exists "analysis_snapshots_delete_own" on public.analysis_snapshots;
create policy "analysis_snapshots_delete_own"
on public.analysis_snapshots
for delete
using (public.is_conversation_owner(conversation_id));

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
on public.messages
for select
using (public.is_conversation_owner(conversation_id));

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
on public.messages
for insert
with check (public.is_conversation_owner(conversation_id));

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
on public.messages
for update
using (public.is_conversation_owner(conversation_id))
with check (public.is_conversation_owner(conversation_id));

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
on public.messages
for delete
using (public.is_conversation_owner(conversation_id));

drop policy if exists "uploads_select_own" on public.uploads;
create policy "uploads_select_own"
on public.uploads
for select
using (public.is_snapshot_owner(snapshot_id));

drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own"
on public.uploads
for insert
with check (public.is_snapshot_owner(snapshot_id));

drop policy if exists "uploads_update_own" on public.uploads;
create policy "uploads_update_own"
on public.uploads
for update
using (public.is_snapshot_owner(snapshot_id))
with check (public.is_snapshot_owner(snapshot_id));

drop policy if exists "uploads_delete_own" on public.uploads;
create policy "uploads_delete_own"
on public.uploads
for delete
using (public.is_snapshot_owner(snapshot_id));
