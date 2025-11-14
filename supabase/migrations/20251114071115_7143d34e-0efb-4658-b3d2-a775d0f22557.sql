-- Create table for user menu favorites/pinned items
CREATE TABLE IF NOT EXISTS public.user_menu_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_path TEXT NOT NULL,
  menu_item_label TEXT NOT NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, menu_item_path)
);

-- Enable RLS
ALTER TABLE public.user_menu_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for user_menu_favorites
CREATE POLICY "Users can view own favorites"
  ON public.user_menu_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.user_menu_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON public.user_menu_favorites
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.user_menu_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_user_menu_favorites_user_id ON public.user_menu_favorites(user_id);
CREATE INDEX idx_user_menu_favorites_display_order ON public.user_menu_favorites(user_id, display_order);