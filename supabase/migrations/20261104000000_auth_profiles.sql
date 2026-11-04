create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9_]{3,30}$'),
  email text not null,
  bio text not null default '',
  about text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.private_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_number text not null,
  date_of_birth date,
  sex text,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_contacts (
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);

alter table public.public_profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.saved_contacts enable row level security;

grant select on public.public_profiles to anon, authenticated;
revoke insert, update on public.public_profiles from authenticated;
grant insert (user_id, username, bio, about)
  on public.public_profiles to authenticated;
grant update (username, bio, about)
  on public.public_profiles to authenticated;
grant select, insert, update on public.private_profiles to authenticated;
grant select, insert, delete on public.saved_contacts to authenticated;

drop policy if exists "Public profiles are visible to everyone"
  on public.public_profiles;
create policy "Public profiles are visible to everyone"
  on public.public_profiles for select
  using (true);

drop policy if exists "Users can create their public profile"
  on public.public_profiles;
create policy "Users can create their public profile"
  on public.public_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their public profile"
  on public.public_profiles;
create policy "Users can update their public profile"
  on public.public_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.is_saved_contact(
  profile_owner uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer = (select auth.uid())
    and exists (
      select 1
      from public.saved_contacts as contact
      where contact.owner_id = profile_owner
        and contact.contact_id = viewer
    );
$$;

revoke all on function public.is_saved_contact(uuid, uuid) from public;
grant execute on function public.is_saved_contact(uuid, uuid) to authenticated;

drop policy if exists "Owners and saved contacts can view private profiles"
  on public.private_profiles;
create policy "Owners and saved contacts can view private profiles"
  on public.private_profiles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_saved_contact(user_id, (select auth.uid()))
  );

drop policy if exists "Users can create their private profile"
  on public.private_profiles;
create policy "Users can create their private profile"
  on public.private_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their private profile"
  on public.private_profiles;
create policy "Users can update their private profile"
  on public.private_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their saved contacts"
  on public.saved_contacts;
create policy "Users can view their saved contacts"
  on public.saved_contacts for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can add their own saved contacts"
  on public.saved_contacts;
create policy "Users can add their own saved contacts"
  on public.saved_contacts for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can remove their own saved contacts"
  on public.saved_contacts;
create policy "Users can remove their own saved contacts"
  on public.saved_contacts for delete to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text;
  profile_phone text;
begin
  profile_username := lower(trim(new.raw_user_meta_data ->> 'username'));
  profile_phone := trim(new.raw_user_meta_data ->> 'phone_number');

  if profile_username is null
    or profile_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'A valid username is required to create an account.';
  end if;

  if profile_phone is null
    or length(regexp_replace(profile_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'A valid phone number is required to create an account.';
  end if;

  insert into public.public_profiles (user_id, username, email)
  values (new.id, profile_username, new.email);

  insert into public.private_profiles (user_id, phone_number)
  values (new.id, profile_phone);

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.public_profiles
  set email = new.email, updated_at = now()
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

drop trigger if exists sync_public_profile_email on auth.users;
create trigger sync_public_profile_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();
