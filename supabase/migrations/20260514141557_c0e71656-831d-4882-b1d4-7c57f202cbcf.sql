
CREATE TABLE IF NOT EXISTS public.admin_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  path text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_pageviews_created ON public.admin_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_pageviews_user ON public.admin_pageviews(user_id);

CREATE TABLE IF NOT EXISTS public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  event_type text NOT NULL CHECK (event_type IN ('login_success','login_failure','signup_success','signup_failure')),
  error_reason text,
  user_agent text,
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON public.auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_email ON public.auth_events(email);

ALTER TABLE public.admin_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Inserts
CREATE POLICY "users can log own pageviews"
  ON public.admin_pageviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anyone can log auth events"
  ON public.auth_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Reads: platform admins only
CREATE POLICY "platform admins read pageviews"
  ON public.admin_pageviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "platform admins read auth events"
  ON public.auth_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
