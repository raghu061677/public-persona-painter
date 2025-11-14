-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  action_url text,
  action_label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT valid_category CHECK (category IN ('general', 'campaign', 'client', 'asset', 'invoice', 'system', 'approval')),
  CONSTRAINT valid_type CHECK (type IN ('info', 'success', 'warning', 'error'))
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create saved searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  search_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_favorite boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_search_type CHECK (search_type IN ('media_assets', 'clients', 'campaigns', 'plans', 'invoices', 'global'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_type ON public.saved_searches(search_type);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own saved searches"
  ON public.saved_searches
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create recent searches table
CREATE TABLE IF NOT EXISTS public.recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query text NOT NULL,
  search_type text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_recent_search_type CHECK (search_type IN ('media_assets', 'clients', 'campaigns', 'plans', 'invoices', 'global'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_recent_searches_user_id ON public.recent_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_created_at ON public.recent_searches(created_at DESC);

-- Enable RLS
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own recent searches"
  ON public.recent_searches
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean old recent searches (keep last 20 per user)
CREATE OR REPLACE FUNCTION clean_old_recent_searches()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.recent_searches
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.recent_searches
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_clean_old_recent_searches
  AFTER INSERT ON public.recent_searches
  FOR EACH ROW
  EXECUTE FUNCTION clean_old_recent_searches();