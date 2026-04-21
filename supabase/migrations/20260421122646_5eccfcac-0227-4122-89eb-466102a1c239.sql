CREATE TABLE IF NOT EXISTS public.campaign_charge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_asset_id uuid REFERENCES public.campaign_assets(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  charge_type text NOT NULL CHECK (charge_type IN ('display','printing','mounting','reprinting','remounting','misc')),
  charge_scope text NOT NULL DEFAULT 'one_time' CHECK (charge_scope IN ('recurring_cycle','one_time','ad_hoc')),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  gst_percent numeric NOT NULL DEFAULT 18,
  charge_date date NOT NULL DEFAULT CURRENT_DATE,
  billing_cycle_no integer,
  invoice_id text REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_invoiced boolean NOT NULL DEFAULT false,
  created_from text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charge_items_campaign ON public.campaign_charge_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_charge_items_cycle ON public.campaign_charge_items(campaign_id, billing_cycle_no);
CREATE INDEX IF NOT EXISTS idx_charge_items_invoice ON public.campaign_charge_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_charge_items_pending ON public.campaign_charge_items(campaign_id, is_invoiced) WHERE is_invoiced = false;

ALTER TABLE public.campaign_charge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charge_items_select_company"
  ON public.campaign_charge_items FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "charge_items_insert_company"
  ON public.campaign_charge_items FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "charge_items_update_company"
  ON public.campaign_charge_items FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "charge_items_delete_company"
  ON public.campaign_charge_items FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns
      WHERE company_id IN (
        SELECT company_id FROM public.company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE TRIGGER trg_charge_items_updated_at
  BEFORE UPDATE ON public.campaign_charge_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();