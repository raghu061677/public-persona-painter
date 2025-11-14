-- Create user menu preferences table for personalization
CREATE TABLE IF NOT EXISTS public.user_menu_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_sections TEXT[] DEFAULT '{}',
  section_order JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_menu_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own menu preferences"
  ON public.user_menu_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menu preferences"
  ON public.user_menu_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menu preferences"
  ON public.user_menu_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_menu_preferences_user_id ON public.user_menu_preferences(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_menu_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_menu_preferences_updated_at
  BEFORE UPDATE ON public.user_menu_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_menu_preferences_updated_at();