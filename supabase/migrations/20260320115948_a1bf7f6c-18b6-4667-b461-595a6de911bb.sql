-- ============================================================
-- Data Quality Issues — persistent audit findings table
-- ============================================================

CREATE TABLE public.data_quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL,
  table_name text NOT NULL,
  field_name text NOT NULL,
  record_id text NOT NULL,
  raw_value text,
  context text,
  detail text,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uix_dqi_natural_key
  ON public.data_quality_issues (issue_type, table_name, field_name, record_id, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX idx_dqi_issue_type ON public.data_quality_issues (issue_type);
CREATE INDEX idx_dqi_table_name ON public.data_quality_issues (table_name);
CREATE INDEX idx_dqi_company_id ON public.data_quality_issues (company_id);
CREATE INDEX idx_dqi_last_seen ON public.data_quality_issues (last_seen DESC);
CREATE INDEX idx_dqi_is_resolved ON public.data_quality_issues (is_resolved) WHERE is_resolved = false;

ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view company data quality issues"
  ON public.data_quality_issues FOR SELECT TO authenticated
  USING (
    company_id = public.current_company_id()
    AND public.has_company_role(ARRAY['admin']::public.app_role[])
  );

-- ============================================================
-- Audit run log — tracks each nightly scan
-- ============================================================

CREATE TABLE public.data_quality_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  issues_found integer DEFAULT 0,
  issues_new integer DEFAULT 0,
  issues_resolved integer DEFAULT 0,
  tables_scanned text[] DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_quality_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit runs"
  ON public.data_quality_runs FOR SELECT TO authenticated
  USING (public.has_company_role(ARRAY['admin']::public.app_role[]));
