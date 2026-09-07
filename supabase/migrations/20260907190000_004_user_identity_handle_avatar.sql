create extension if not exists unaccent with schema extensions;

-- ============================================================================
-- 1. Reserved handles — lookup table, not a hardcoded list, para ser editável
--    no futuro backoffice sem nova migração.
-- ============================================================================
create table reserved_handles (
  handle text primary key
);

alter table reserved_handles enable row level security;

create policy reserved_handles_select_all on reserved_handles
for select using (true);

insert into reserved_handles (handle) values
  ('admin'), ('support'), ('onomic'), ('api'), ('www'), ('help'),
  ('settings'), ('security'), ('privacy'), ('terms'), ('billing'),
  ('root'), ('system'), ('null'), ('undefined'), ('me'), ('you'),
  ('invite'), ('login'), ('signup');

-- ============================================================================
-- 2. profiles: handle + avatar_path
-- ============================================================================
alter table profiles
  add column handle text,
  add column avatar_path text;

-- Format: 3-20 chars, lowercase letters/digits/underscore, must start with a
-- letter. Kept in sync by hand with HANDLE_REGEX in lib/handles.ts.
alter table profiles
  add constraint profiles_handle_format check (handle ~ '^[a-z][a-z0-9_]{2,19}$');

alter table profiles
  add constraint profiles_handle_unique unique (handle);

-- handle is required in practice (the signup form always sends one — see
-- Task 3), but is intentionally NOT declared `not null` at the DB level: the
-- signup trigger below still needs to succeed for any future auth.users
-- insert that doesn't go through this app's signup form (e.g. a
-- backoffice-created account), same tradeoff already accepted for
-- full_name/birth_date.

-- Reserved handles must be blocked on every write path, not just inside
-- is_handle_available/suggest_handle — a client could otherwise call
-- auth.signUp() directly with metadata.handle = 'admin' and bypass those
-- helper functions entirely.
create or replace function prevent_reserved_handle()
returns trigger as $$
begin
  if new.handle is not null and exists (
    select 1 from reserved_handles where handle = new.handle
  ) then
    raise exception 'handle_reserved';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_prevent_reserved_handle
before insert or update of handle on profiles
for each row execute function prevent_reserved_handle();

-- ============================================================================
-- 3. Self-service profile updates — first-ever UPDATE policy on `profiles`.
--    Row scope (RLS) says "your own row"; column scope (GRANT) says "only
--    these columns". `role` is deliberately never granted, so no UPDATE from
--    any client-facing role can change it, no matter what the request body
--    contains.
--
--    IMPORTANT: Supabase grants ALL table privileges to `anon`/`authenticated`
--    by default on every new table (RLS is normally the only gate). That
--    means `profiles` already has a blanket UPDATE grant sitting unused since
--    there was no UPDATE policy. Adding a policy WITHOUT first revoking that
--    blanket grant would make every column (including `role`) updatable.
--    The REVOKE below is not optional.
-- ============================================================================
revoke update on profiles from authenticated, anon;
grant update (full_name, handle, birth_date, avatar_path) on profiles to authenticated;

create policy profiles_update_own on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- 4. Signup trigger — now also sets `handle` from auth metadata.
-- ============================================================================
create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, birth_date, handle)
  values (
    new.id,
    'user',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'handle'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- 5. Handle availability + suggestion — SECURITY DEFINER because checking
--    uniqueness needs to see every user's handle, which profiles_select_own
--    would otherwise hide. Same pattern as get_workspace_members_with_email
--    in Family Workspaces: the function returns only a boolean/string, never
--    another user's row.
-- ============================================================================
create or replace function is_handle_available(p_handle text)
returns boolean as $$
begin
  if p_handle is null or p_handle !~ '^[a-z][a-z0-9_]{2,19}$' then
    return false;
  end if;

  if exists (select 1 from reserved_handles where handle = p_handle) then
    return false;
  end if;

  return not exists (select 1 from profiles where handle = p_handle);
end;
$$ language plpgsql security definer set search_path = public;

-- anon, authenticated (not just authenticated): handle checking must work
-- during signup, before the user has a session — same reasoning as
-- get_invite_preview's anon, authenticated grant.
grant execute on function is_handle_available(text) to anon, authenticated;

create or replace function suggest_handle(p_full_name text)
returns text as $$
declare
  v_base text;
  v_candidate text;
  v_attempt int := 0;
begin
  v_base := regexp_replace(lower(unaccent(coalesce(p_full_name, ''))), '[^a-z0-9]', '', 'g');
  v_base := left(v_base, 14);

  if v_base = '' or v_base !~ '^[a-z]' then
    v_base := 'user';
  end if;

  loop
    -- "até 5 números": floor(random()*100000) yields 0-99999, i.e. 1 to 5 digits.
    v_candidate := left(v_base || floor(random() * 100000)::int::text, 20);

    if is_handle_available(v_candidate) then
      return v_candidate;
    end if;

    v_attempt := v_attempt + 1;
    if v_attempt >= 20 then
      -- Never loop forever. Extremely unlikely to be reached in practice.
      return left(v_base || extract(epoch from clock_timestamp())::bigint::text, 20);
    end if;
  end loop;
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- anon, authenticated: suggestion must also work during signup, before the
-- user has a session, same reasoning as is_handle_available above.
grant execute on function suggest_handle(text) to anon, authenticated;

-- ============================================================================
-- 6. Avatars bucket — public (read), write restricted to the user's own
--    folder. Size/type enforced at the bucket level, not just client-side.
--
--    Write policies (insert/update/delete) are explicitly scoped to the
--    `authenticated` role. The `(storage.foldername(name))[1] = auth.uid()::text`
--    check is already safe against anon writes on its own — for an anon
--    request auth.uid() is NULL, and NULL comparison is never true — but this
--    project has a history of NULL-comparison bugs and prefers making the
--    role scope explicit rather than relying on that semantics alone.
--    avatars_public_read stays unscoped (any role, including anon): the
--    bucket is meant to be publicly readable.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
for select using (bucket_id = 'avatars');

create policy avatars_own_write on storage.objects
for insert to authenticated with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_own_update on storage.objects
for update to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_own_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
