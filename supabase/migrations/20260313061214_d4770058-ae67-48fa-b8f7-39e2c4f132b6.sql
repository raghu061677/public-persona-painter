-- Add renewal chain linking fields to campaigns table
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS parent_campaign_id text REFERENCES public.campaigns(id),
  ADD COLUMN IF NOT EXISTS campaign_group_id uuid DEFAULT NULL;

-- Index for fast chain lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_parent_campaign_id ON public.campaigns(parent_campaign_id) WHERE parent_campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_group_id ON public.campaigns(campaign_group_id) WHERE campaign_group_id IS NOT NULL;

COMMENT ON COLUMN public.campaigns.parent_campaign_id IS 'Links to the immediate parent campaign when created via Renew as New Campaign';
COMMENT ON COLUMN public.campaigns.campaign_group_id IS 'Shared UUID across all campaigns in a renewal chain/series for grouping';