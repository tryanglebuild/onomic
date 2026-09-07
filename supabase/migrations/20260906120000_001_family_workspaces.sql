create extension if not exists pgcrypto;

create type workspace_type as enum ('personal', 'family');
create type workspace_role as enum ('owner', 'member');
create type invite_status as enum ('pending', 'accepted', 'expired');
create type app_role as enum ('user', 'admin', 'support');

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  type workspace_type not null,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  invited_email text not null,
  token text not null unique,
  status invite_status not null default 'pending',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Platform-level role (RBAC foundation for a future backoffice). Distinct
-- from workspace_members.role, which is per-workspace (owner/member).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile row, defaulted to role='user'. No
-- client-facing INSERT/UPDATE policy exists below — role changes are out of
-- scope for this feature and will go through a trusted path once a backoffice
-- exists (never through an endpoint that accepts `role` from the user).
create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, role) values (new.id, 'user');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user_profile
after insert on auth.users
for each row execute function handle_new_user_profile();

-- A personal workspace may never have more than one member.
create or replace function enforce_personal_workspace_single_member()
returns trigger as $$
declare
  ws_type workspace_type;
  member_count int;
begin
  select type into ws_type from workspaces where id = new.workspace_id;

  if ws_type = 'personal' then
    select count(*) into member_count from workspace_members where workspace_id = new.workspace_id;
    if member_count >= 1 then
      raise exception 'personal workspaces cannot have more than one member';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_personal_workspace_single_member
before insert on workspace_members
for each row execute function enforce_personal_workspace_single_member();

-- Every new auth user gets a personal workspace automatically.
create or replace function handle_new_user_personal_workspace()
returns trigger as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (type, name, created_by)
  values ('personal', 'Pessoal', new.id)
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_user_personal_workspace
after insert on auth.users
for each row execute function handle_new_user_personal_workspace();

-- Creates a family workspace and makes the caller its owner. This is the ONLY
-- way a family workspace gets its first member — client code never inserts
-- directly into workspace_members (see: no INSERT policy on that table below).
create or replace function create_family_workspace(p_name text)
returns uuid as $$
declare
  v_workspace_id uuid;
begin
  insert into workspaces (type, name, created_by)
  values ('family', p_name, auth.uid())
  returning id into v_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, auth.uid(), 'owner');

  return v_workspace_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function create_family_workspace(text) to authenticated;

-- Validates and consumes an invite. The token itself is verified in the
-- application layer (HMAC signature + expiry) before this is ever called;
-- this function re-checks the invite's DB state as defense in depth.
create or replace function accept_workspace_invite(p_invite_id uuid)
returns void as $$
declare
  v_invite workspace_invites%rowtype;
begin
  select * into v_invite from workspace_invites where id = p_invite_id for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;

  if v_invite.expires_at < now() then
    update workspace_invites set status = 'expired' where id = p_invite_id;
    raise exception 'invite_expired';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), 'member');

  update workspace_invites set status = 'accepted' where id = p_invite_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function accept_workspace_invite(uuid) to authenticated;

-- Lets anyone with a (verified) invite id preview it before joining/logging in,
-- without needing a workspace_invites SELECT policy that would require
-- membership they don't have yet. Exposes only non-sensitive fields.
create or replace function get_invite_preview(p_invite_id uuid)
returns table(workspace_name text, invited_email text, status invite_status, expires_at timestamptz) as $$
  select w.name, wi.invited_email, wi.status, wi.expires_at
  from workspace_invites wi
  join workspaces w on w.id = wi.workspace_id
  where wi.id = p_invite_id;
$$ language sql security definer set search_path = public;

grant execute on function get_invite_preview(uuid) to anon, authenticated;

-- Row Level Security

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table profiles enable row level security;

create policy profiles_select_own on profiles
for select using (id = auth.uid());

-- No INSERT/UPDATE/DELETE policy on profiles: the row is created only by the
-- signup trigger above, and `role` is not editable by any client in this
-- feature's scope.

create policy workspaces_select on workspaces
for select using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
  )
);

-- No client-facing INSERT policy on workspaces or workspace_members:
-- every row is created by a SECURITY DEFINER function above
-- (signup trigger, create_family_workspace, accept_workspace_invite).

create policy workspace_members_select on workspace_members
for select using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
  )
);

create policy workspace_members_delete on workspace_members
for delete using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

create policy workspace_invites_select on workspace_invites
for select using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id and wm.user_id = auth.uid()
  )
);

create policy workspace_invites_insert on workspace_invites
for insert with check (
  exists (
    select 1 from workspace_members wm
    join workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
      and w.type = 'family'
  )
);

create policy workspace_invites_delete on workspace_invites
for delete using (
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);
