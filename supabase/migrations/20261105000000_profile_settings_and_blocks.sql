alter table public.public_profiles
  add column if not exists full_name text not null default '',
  add column if not exists profile_picture_path text,
  add column if not exists profile_picture_visibility text not null default 'everyone'
    check (profile_picture_visibility in ('everyone', 'contacts', 'nobody'));

alter table public.private_profiles
  add column if not exists rada_visibility text not null default 'contacts'
    check (rada_visibility in ('everyone', 'contacts', 'nobody')),
  add column if not exists allow_links boolean not null default true,
  add column if not exists allow_group_invites boolean not null default true;

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

  insert into public.public_profiles (user_id, username, email, full_name)
  values (
    new.id,
    profile_username,
    new.email,
    trim(new.raw_user_meta_data ->> 'full_name')
  );

  insert into public.private_profiles (user_id, phone_number)
  values (new.id, profile_phone);

  return new;
end;
$$;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  blocked_username text not null default '',
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks as blocked
    where (select auth.uid()) in (first_user, second_user)
      and (
        (blocked.blocker_id = first_user and blocked.blocked_id = second_user)
        or (blocked.blocker_id = second_user and blocked.blocked_id = first_user)
      )
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

revoke select on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;
revoke update on public.public_profiles from authenticated;
grant update (username, full_name, bio, about, profile_picture_path, profile_picture_visibility)
  on public.public_profiles to authenticated;

drop policy if exists "Public profiles are visible to everyone"
  on public.public_profiles;
drop policy if exists "Authenticated users can view unblocked public profiles"
  on public.public_profiles;
create policy "Authenticated users can view unblocked public profiles"
  on public.public_profiles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or not public.is_blocked_between((select auth.uid()), user_id)
  );

drop policy if exists "Owners and saved contacts can view private profiles"
  on public.private_profiles;
create policy "Owners and saved contacts can view private profiles"
  on public.private_profiles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      public.is_saved_contact(user_id, (select auth.uid()))
      and not public.is_blocked_between((select auth.uid()), user_id)
    )
  );

drop policy if exists "Users can view their saved contacts"
  on public.saved_contacts;
create policy "Users can view their saved contacts"
  on public.saved_contacts for select to authenticated
  using (
    (select auth.uid()) = owner_id
    and not public.is_blocked_between(owner_id, contact_id)
  );

drop policy if exists "Users can add their own saved contacts"
  on public.saved_contacts;
create policy "Users can add their own saved contacts"
  on public.saved_contacts for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and not public.is_blocked_between(owner_id, contact_id)
  );

drop policy if exists "Users can view their own blocks"
  on public.user_blocks;
create policy "Users can view their own blocks"
  on public.user_blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

drop policy if exists "Users can block other accounts"
  on public.user_blocks;
create policy "Users can block other accounts"
  on public.user_blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id and blocker_id <> blocked_id);

drop policy if exists "Users can unblock accounts"
  on public.user_blocks;
create policy "Users can unblock accounts"
  on public.user_blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

grant select, insert, delete on public.user_blocks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Owners and permitted viewers can read profile photos"
  on storage.objects;
create policy "Owners and permitted viewers can read profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (
      select 1
      from public.public_profiles as profile
      where profile.user_id::text = (storage.foldername(name))[1]
        and not public.is_blocked_between((select auth.uid()), profile.user_id)
        and (
          profile.user_id = (select auth.uid())
          or profile.profile_picture_visibility = 'everyone'
          or (
            profile.profile_picture_visibility = 'contacts'
            and public.is_saved_contact(profile.user_id, (select auth.uid()))
          )
        )
    )
  );

drop policy if exists "Users can upload their own profile photos"
  on storage.objects;
create policy "Users can upload their own profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own profile photos"
  on storage.objects;
create policy "Users can update their own profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own profile photos"
  on storage.objects;
create policy "Users can delete their own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
