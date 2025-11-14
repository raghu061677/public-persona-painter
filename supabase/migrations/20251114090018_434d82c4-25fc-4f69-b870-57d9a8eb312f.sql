-- Create table for storing custom table views/preferences
CREATE TABLE IF NOT EXISTS public.table_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_key TEXT NOT NULL,
  view_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, table_key, view_name)
);

-- Add RLS policies
ALTER TABLE public.table_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own table views"
  ON public.table_views
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own table views"
  ON public.table_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own table views"
  ON public.table_views
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own table views"
  ON public.table_views
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_table_views_user_table ON public.table_views(user_id, table_key);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_table_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_views_updated_at
  BEFORE UPDATE ON public.table_views
  FOR EACH ROW
  EXECUTE FUNCTION update_table_views_updated_at();