-- Phase-5: Token hashing for invoice_share_tokens
-- Store sha256 hash instead of raw token for defense-in-depth

-- Add token_hash column
ALTER TABLE public.invoice_share_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

-- Create index on token_hash for lookups
CREATE INDEX IF NOT EXISTS idx_invoice_share_tokens_hash 
  ON public.invoice_share_tokens(token_hash) WHERE NOT is_revoked;

-- Note: The raw 'token' column is kept temporarily for backward compatibility.
-- After migration, the generate-share-token function will:
--   1. Generate raw token
--   2. Compute sha256 hash
--   3. Store ONLY the hash in token_hash
--   4. Set token = NULL
--   5. Return raw token to user ONCE
-- The portal verification function will:
--   1. Receive raw token from URL
--   2. Compute sha256(token)
--   3. Look up by token_hash
