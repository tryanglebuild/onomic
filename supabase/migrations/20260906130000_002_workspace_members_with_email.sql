-- Returns a workspace's members with their email, restricted to callers who
-- are themselves a member of that workspace. SECURITY DEFINER because the
-- `authenticated` role has no SELECT grant on auth.users — the membership
-- check below is what enforces access, the same pattern already used by
-- create_family_workspace and accept_workspace_invite in the prior migration.
create or replace function get_workspace_members_with_email(p_workspace_id uuid)
returns table(user_id uuid, role workspace_role, joined_at timestamptz, email text)
language sql security definer stable set search_path = public as $$
  select wm.user_id, wm.role, wm.joined_at, u.email
  from workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and is_workspace_member(p_workspace_id);
$$;

grant execute on function get_workspace_members_with_email(uuid) to authenticated;
