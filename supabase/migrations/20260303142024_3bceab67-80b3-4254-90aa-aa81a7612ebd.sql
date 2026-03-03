
-- Phase 2C Hardening: validation constraints + updated trigger/helper functions

-- 1) CHECK constraint on finance_override_requests.scope_record_id
ALTER TABLE public.finance_override_requests
  ADD CONSTRAINT chk_scope_record_id_valid
  CHECK (
    scope_record_id IS NOT NULL
    AND length(trim(scope_record_id)) > 0
    AND scope_record_id !~ '[*%_;''"\\]'
  );

-- 2) CHECK constraint on finance_overrides.scope_record_id
ALTER TABLE public.finance_overrides
  ADD CONSTRAINT chk_override_scope_record_id_valid
  CHECK (
    scope_record_id IS NOT NULL
    AND length(trim(scope_record_id)) > 0
    AND scope_record_id !~ '[*%_;''"\\]'
  );

-- 3) Update has_valid_finance_override to also match recently-consumed permits (60s window)
-- This supports the pre-write consumption pattern from the Edge Function
CREATE OR REPLACE FUNCTION public.has_valid_finance_override(
  p_company_id uuid, p_table text, p_record_id text, p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM finance_overrides fo
    WHERE fo.company_id = p_company_id
      AND fo.scope_table = p_table
      AND fo.scope_record_id = p_record_id
      AND fo.scope_action = p_action
      AND (
        (fo.status = 'approved' AND fo.used_at IS NULL AND fo.expires_at > now())
        OR
        (fo.status = 'used' AND fo.used_at IS NOT NULL AND fo.used_at > now() - interval '60 seconds')
      )
  );
$$;

-- 4) Update triggers: remove consume calls, just check override validity
CREATE OR REPLACE FUNCTION public.tg_block_locked_invoices()
RETURNS trigger LANGUAGE plpgsql AS $$
declare v_company uuid; v_date date; v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.invoice_date, old.invoice_date, (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;
  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if NOT has_valid_finance_override(v_company, 'invoices', v_record_id, TG_OP) then
        raise exception 'Financial period is locked. Invoice write blocked.';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.tg_block_locked_expenses()
RETURNS trigger LANGUAGE plpgsql AS $$
declare v_company uuid; v_date date; v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.expense_date, old.expense_date, new.paid_date, old.paid_date, (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;
  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if NOT has_valid_finance_override(v_company, 'expenses', v_record_id, TG_OP) then
        raise exception 'Financial period is locked. Expense write blocked.';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.tg_block_locked_invoice_items()
RETURNS trigger LANGUAGE plpgsql AS $$
declare v_invoice_id text; v_company uuid; v_date date; v_record_id text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  v_record_id := coalesce(new.id, old.id)::text;
  select i.company_id, i.invoice_date into v_company, v_date from invoices i where i.id = v_invoice_id;
  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if NOT has_valid_finance_override(v_company, TG_TABLE_NAME, v_record_id, TG_OP) then
        raise exception 'Financial period is locked. Invoice item write blocked.';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.tg_block_locked_payable_batches()
RETURNS trigger LANGUAGE plpgsql AS $$
declare v_company uuid; v_date date; v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(to_date(coalesce(new.month_key, old.month_key), 'YYYY-MM'), (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;
  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if NOT has_valid_finance_override(v_company, 'payable_batches', v_record_id, TG_OP) then
        raise exception 'Financial period is locked. Payable batch write blocked.';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.tg_block_locked_campaign_assets_financial()
RETURNS trigger LANGUAGE plpgsql AS $$
declare v_company uuid; v_date date; v_record_id text;
begin
  select c.company_id into v_company from campaigns c where c.id = coalesce(new.campaign_id, old.campaign_id);
  if v_company is null then return new; end if;
  v_date := coalesce(new.booking_start_date, old.booking_start_date, new.start_date, old.start_date, (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;
  if v_date is not null and (is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date)) then
    if (
      new.negotiated_rate is distinct from old.negotiated_rate or
      new.card_rate is distinct from old.card_rate or
      new.mounting_charges is distinct from old.mounting_charges or
      new.printing_charges is distinct from old.printing_charges or
      new.total_price is distinct from old.total_price or
      new.daily_rate is distinct from old.daily_rate or
      new.rent_amount is distinct from old.rent_amount or
      new.printing_cost is distinct from old.printing_cost or
      new.mounting_cost is distinct from old.mounting_cost or
      new.tax_percent is distinct from old.tax_percent
    ) then
      if NOT has_valid_finance_override(v_company, 'campaign_assets', v_record_id, TG_OP) then
        raise exception 'Locked period: financial fields of campaign_assets cannot be changed.';
      end if;
    end if;
  end if;
  return new;
end;
$$;
