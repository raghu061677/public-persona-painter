CREATE TABLE IF NOT EXISTS public.seo_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_url TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'mobile',
  performance_score NUMERIC,
  lcp_ms NUMERIC,
  fcp_ms NUMERIC,
  cls NUMERIC,
  tbt_ms NUMERIC,
  speed_index_ms NUMERIC,
  sitemap_status INTEGER,
  sitemap_url_count INTEGER,
  robots_status INTEGER,
  gsc_indexed_count INTEGER,
  errors JSONB DEFAULT '[]'::jsonb,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_reports_run_at ON public.seo_reports(run_at DESC);

ALTER TABLE public.seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SEO reports"
ON public.seo_reports FOR SELECT
TO authenticated
USING (true);