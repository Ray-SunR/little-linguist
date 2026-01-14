alter table public.point_transactions
add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
add column if not exists metadata jsonb default '{}'::jsonb;

-- Optional: Add index for faster lookups by user
create index if not exists point_transactions_owner_user_id_idx on public.point_transactions(owner_user_id);
create index if not exists point_transactions_created_at_idx on public.point_transactions(created_at desc);
