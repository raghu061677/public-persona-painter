
-- Step 1: Remove the old (client_id, email) unique constraint
ALTER TABLE public.client_portal_users DROP CONSTRAINT IF EXISTS client_portal_users_client_id_email_key;

-- Step 2: Delete duplicate rows per client_id, keeping only the most recent active one
DELETE FROM public.client_portal_users
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM public.client_portal_users
  ORDER BY client_id, is_active DESC NULLS LAST, created_at DESC NULLS LAST
);

-- Step 3: Add unique constraint on client_id only (one portal user per client)
ALTER TABLE public.client_portal_users ADD CONSTRAINT client_portal_users_client_id_unique UNIQUE (client_id);
