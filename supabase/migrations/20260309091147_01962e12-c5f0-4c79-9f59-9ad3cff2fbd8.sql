
-- Automation Engine Tables
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  trigger_event text NOT NULL,
  conditions jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  execution_time integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- AI Campaign Intelligence Tables
CREATE TABLE public.campaign_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  impressions_estimated numeric DEFAULT 0,
  traffic_score numeric DEFAULT 0,
  visibility_score numeric DEFAULT 0,
  area_demand_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.asset_demand_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  bookings_last_12_months integer DEFAULT 0,
  vacancy_days integer DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  demand_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  recommendation_text text NOT NULL,
  confidence_score numeric DEFAULT 0,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_demand_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Automation rules: company members only
CREATE POLICY "automation_rules_tenant" ON public.automation_rules
  FOR ALL USING (company_id = (SELECT current_company_id()));

CREATE POLICY "automation_logs_tenant" ON public.automation_logs
  FOR ALL USING (rule_id IN (SELECT id FROM public.automation_rules WHERE company_id = (SELECT current_company_id())));

CREATE POLICY "campaign_analytics_tenant" ON public.campaign_analytics
  FOR ALL USING (company_id = (SELECT current_company_id()));

CREATE POLICY "asset_demand_scores_tenant" ON public.asset_demand_scores
  FOR ALL USING (company_id = (SELECT current_company_id()));

CREATE POLICY "ai_recommendations_tenant" ON public.ai_recommendations
  FOR ALL USING (company_id = (SELECT current_company_id()));

-- Indexes
CREATE INDEX idx_automation_rules_company ON public.automation_rules(company_id);
CREATE INDEX idx_automation_rules_trigger ON public.automation_rules(trigger_event);
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX idx_campaign_analytics_campaign ON public.campaign_analytics(campaign_id);
CREATE INDEX idx_asset_demand_scores_asset ON public.asset_demand_scores(asset_id);
CREATE INDEX idx_ai_recommendations_company ON public.ai_recommendations(company_id);
