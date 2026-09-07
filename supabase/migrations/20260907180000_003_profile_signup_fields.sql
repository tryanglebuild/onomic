-- Signup now collects a display name and an optional birth date. Both are
-- captured as auth.users metadata at signUp() time (see app/(auth)/actions.ts)
-- and copied into profiles by the same trigger that already creates the row.
-- Nullable at the DB level (not every auth.users insert is a signup with
-- metadata attached) — "name is required" is enforced by the signup form and
-- server action, not by a NOT NULL constraint here.
alter table profiles
  add column full_name text,
  add column birth_date date;

create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, birth_date)
  values (
    new.id,
    'user',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
