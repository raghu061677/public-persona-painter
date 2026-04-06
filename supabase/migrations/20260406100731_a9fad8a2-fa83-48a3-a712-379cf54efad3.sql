
-- Add delivery tracking columns to collection_communications
ALTER TABLE public.collection_communications 
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_comm_id uuid REFERENCES public.collection_communications(id);

-- Update default status to 'draft' for new rows
ALTER TABLE public.collection_communications 
  ALTER COLUMN status SET DEFAULT 'draft';

-- Index for faster history queries
CREATE INDEX IF NOT EXISTS idx_collection_comms_status ON public.collection_communications(status);
CREATE INDEX IF NOT EXISTS idx_collection_comms_channel ON public.collection_communications(channel);
CREATE INDEX IF NOT EXISTS idx_collection_comms_sent_at ON public.collection_communications(sent_at DESC);
