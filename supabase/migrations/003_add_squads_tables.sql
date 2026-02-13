-- Create squads table
create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now(),
  avatar_url text
);

-- Create squad_members table
create table if not exists squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references squads(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamp with time zone default now(),
  unique(squad_id, user_id)
);

-- Enable RLS
alter table squads enable row level security;
alter table squad_members enable row level security;

-- Policies for squads
create policy "Squads are viewable by everyone"
  on squads for select
  using (true);

create policy "Users can create squads"
  on squads for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their squads"
  on squads for update
  using (auth.uid() = owner_id);

-- Policies for squad_members
create policy "Squad members are viewable by everyone"
  on squad_members for select
  using (true);

create policy "Users can join squads"
  on squad_members for insert
  with check (auth.uid() = user_id);

create policy "Members can leave squads"
  on squad_members for delete
  using (auth.uid() = user_id);

-- Extended policy for owners to remove members? 
-- For V1, keep it simple. Owners can remove members.
create policy "Owners can remove members"
  on squad_members for delete
  using (
    exists (
      select 1 from squads
      where squads.id = squad_members.squad_id
      and squads.owner_id = auth.uid()
    )
  );
