-- Create template_favorites table for bookmarking PPT templates
CREATE TABLE IF NOT EXISTS public.template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_config jsonb NOT NULL,
  template_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, template_name)
);

-- Enable RLS
ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for template_favorites
CREATE POLICY "Users can view their own favorite templates"
  ON public.template_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite templates"
  ON public.template_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite templates"
  ON public.template_favorites
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite templates"
  ON public.template_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_template_favorites_user_id ON public.template_favorites(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_template_favorites_updated_at
  BEFORE UPDATE ON public.template_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();