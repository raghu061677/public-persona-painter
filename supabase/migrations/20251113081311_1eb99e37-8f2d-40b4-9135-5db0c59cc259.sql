-- Add approval workflow fields to media_photos table
ALTER TABLE public.media_photos 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_media_photos_approval_status ON public.media_photos(approval_status);

-- Update RLS policy to allow operations managers to update approval status
CREATE POLICY "Operations managers can update photo approval status"
ON public.media_photos FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role)
);