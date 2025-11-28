-- Add 'active' to campaign_status enum (must be in separate transaction)
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'active';