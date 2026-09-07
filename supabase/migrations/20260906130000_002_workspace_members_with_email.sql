create view workspace_members_with_email
with (security_invoker = true) as
select wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.email
from workspace_members wm
join auth.users u on u.id = wm.user_id;
