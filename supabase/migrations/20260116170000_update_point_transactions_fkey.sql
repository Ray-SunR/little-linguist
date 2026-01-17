-- Update point_transactions.child_id to be nullable and use SET NULL on delete
ALTER TABLE public.point_transactions
ALTER COLUMN child_id DROP NOT NULL;

-- Drop existing constraint if it exists (check name from schema or use a generic approach)
-- In our schema it is point_transactions_child_id_fkey
ALTER TABLE public.point_transactions
DROP CONSTRAINT IF EXISTS point_transactions_child_id_fkey;

ALTER TABLE public.point_transactions
ADD CONSTRAINT point_transactions_child_id_fkey 
FOREIGN KEY (child_id) 
REFERENCES children(id) 
ON DELETE SET NULL;
