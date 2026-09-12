-- get_workspace_members_with_email only returns email; several UI surfaces
-- (currently just financial_challenges) need a display name and previously
-- fell back to the email local-part. profiles.full_name/handle exist but
-- profiles_select_own RLS blocks reading another member's row directly, so
-- this is a new SECURITY DEFINER function following the same
-- membership-gated pattern as get_workspace_members_with_email itself.
drop function if exists get_workspace_members_with_email(uuid);

create function get_workspace_members_with_email(p_workspace_id uuid)
returns table(user_id uuid, role workspace_role, joined_at timestamptz, email text, full_name text, handle text)
language sql security definer stable set search_path = public as $$
  select wm.user_id, wm.role, wm.joined_at, u.email, p.full_name, p.handle
  from workspace_members wm
  join auth.users u on u.id = wm.user_id
  left join profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and is_workspace_member(p_workspace_id);
$$;

grant execute on function get_workspace_members_with_email(uuid) to authenticated;
