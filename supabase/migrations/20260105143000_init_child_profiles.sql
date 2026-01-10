-- Create profiles table if it doesn't exist (Household/Guardian)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  email text,
  subscription_status text not null default 'free',
  stripe_customer_id text
);

alter table profiles enable row level security;

-- Policies for profiles
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view own profile') then
    create policy "Users can view own profile"
      on profiles for select
      using ( auth.uid() = id );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can update own profile') then
    create policy "Users can update own profile"
      on profiles for update
      using ( auth.uid() = id );
  end if;
end
$$;

-- Create children table
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  first_name text not null,
  last_name text,
  birth_year int,
  gender text,

  interests text[] not null default '{}',
  ability_tier text,
  learning_objectives jsonb not null default '{}',

  avatar_asset_path text
);

create index if not exists children_owner_user_id_idx on children (owner_user_id);

alter table children enable row level security;

-- Policies for children
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own children') then
    create policy "Users can view their own children"
      on children for select
      using ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own children') then
    create policy "Users can insert their own children"
      on children for insert
      with check ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own children') then
    create policy "Users can update their own children"
      on children for update
      using ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own children') then
    create policy "Users can delete their own children"
      on children for delete
      using ( auth.uid() = owner_user_id );
  end if;
end
$$;

-- Create media_assets table
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,

  bucket text not null,
  path text not null,
  mime_type text,
  bytes bigint,
  sha256 text,
  created_at timestamptz not null default now(),
  unique(bucket, path)
);

create index if not exists media_assets_owner_user_id_idx on media_assets (owner_user_id);
create index if not exists media_assets_child_id_idx on media_assets (child_id);

alter table media_assets enable row level security;

-- Policies for media_assets
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own media') then
    create policy "Users can view their own media"
      on media_assets for select
      using ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own media') then
    create policy "Users can insert their own media"
      on media_assets for insert
      with check ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own media') then
    create policy "Users can update their own media"
      on media_assets for update
      using ( auth.uid() = owner_user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own media') then
    create policy "Users can delete their own media"
      on media_assets for delete
      using ( auth.uid() = owner_user_id );
  end if;
end
$$;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end
$$;
