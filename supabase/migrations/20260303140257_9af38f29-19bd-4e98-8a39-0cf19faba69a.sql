-- ============================================================
-- PHASE 2C: Admin Override for Financial Lock Bypass
-- SAFE: Does NOT remove any existing triggers or weaken locks.
-- ============================================================

-- A) CREATE TABLE: finance_overrides
create table if not exists public.finance_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  requested_by uuid not null,
  approved_by uuid not null,
  reason text not null,
  scope_table text not null,
  scope_record_id text not null,
  scope_action text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  status text not null default 'approved'
);

-- RLS on finance_overrides
alter table public.finance_overrides enable row level security;

-- Admin can insert (create overrides)
create policy "admin_insert_overrides"
on public.finance_overrides for insert to authenticated
with check (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_overrides.company_id
      and cu.role = 'admin'
      and cu.status = 'active'
  )
);

-- Admin + Finance can view
create policy "admin_finance_select_overrides"
on public.finance_overrides for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_overrides.company_id
      and cu.role in ('admin','finance')
      and cu.status = 'active'
  )
);

-- B) HELPER: has_valid_finance_override
create or replace function public.has_valid_finance_override(
  p_company_id uuid,
  p_table text,
  p_record_id text,
  p_action text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from finance_overrides fo
    where fo.company_id = p_company_id
      and fo.scope_table = p_table
      and fo.scope_record_id = p_record_id
      and fo.scope_action = p_action
      and fo.status = 'approved'
      and fo.used_at is null
      and fo.expires_at > now()
  );
$$;

-- HELPER: consume_finance_override (marks override as used)
create or replace function public.consume_finance_override(
  p_company_id uuid,
  p_table text,
  p_record_id text,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update finance_overrides
  set used_at = now(), status = 'used'
  where company_id = p_company_id
    and scope_table = p_table
    and scope_record_id = p_record_id
    and scope_action = p_action
    and status = 'approved'
    and used_at is null
    and expires_at > now();
end;
$$;

-- ============================================================
-- C) UPDATE EXISTING LOCK TRIGGERS with override check
-- ============================================================

-- 1) INVOICES
create or replace function public.tg_block_locked_invoices()
returns trigger
language plpgsql
as $$
declare
  v_company uuid;
  v_date date;
  v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.invoice_date, old.invoice_date, (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if has_valid_finance_override(v_company, 'invoices', v_record_id, TG_OP) then
        perform consume_finance_override(v_company, 'invoices', v_record_id, TG_OP);
      else
        raise exception 'Financial period is locked. Invoice write blocked.';
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 2) EXPENSES
create or replace function public.tg_block_locked_expenses()
returns trigger
language plpgsql
as $$
declare
  v_company uuid;
  v_date date;
  v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.expense_date, old.expense_date, new.paid_date, old.paid_date, (coalesce(new.created_at, old.created_at))::date);
  v_record_id := coalesce(new.id, old.id)::text;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if has_valid_finance_override(v_company, 'expenses', v_record_id, TG_OP) then
        perform consume_finance_override(v_company, 'expenses', v_record_id, TG_OP);
      else
        raise exception 'Financial period is locked. Expense write blocked.';
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 3) INVOICE ITEMS (shared for invoice_items + invoice_line_items)
create or replace function public.tg_block_locked_invoice_items()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id text;
  v_company uuid;
  v_date date;
  v_record_id text;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  v_record_id := coalesce(new.id, old.id)::text;

  select i.company_id, i.invoice_date
    into v_company, v_date
  from invoices i
  where i.id = v_invoice_id;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if has_valid_finance_override(v_company, TG_TABLE_NAME, v_record_id, TG_OP) then
        perform consume_finance_override(v_company, TG_TABLE_NAME, v_record_id, TG_OP);
      else
        raise exception 'Financial period is locked. Invoice item write blocked.';
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 4) PAYABLE BATCHES
create or replace function public.tg_block_locked_payable_batches()
returns trigger
language plpgsql
as $$
declare
  v_company uuid;
  v_date date;
  v_record_id text;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := (coalesce(new.month_key, old.month_key) || '-01')::date;
  v_record_id := coalesce(new.id, old.id)::text;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      if has_valid_finance_override(v_company, 'payable_batches', v_record_id, TG_OP) then
        perform consume_finance_override(v_company, 'payable_batches', v_record_id, TG_OP);
      else
        raise exception 'Financial period is locked. Payable batch write blocked.';
      end if;
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- 5) CAMPAIGN ASSETS (financial fields only)
create or replace function public.tg_block_locked_campaign_assets_financial()
returns trigger
language plpgsql
as $$
declare
  v_company uuid;
  v_date date;
  v_record_id text;
begin
  select c.company_id into v_company
  from campaigns c
  where c.id = coalesce(new.campaign_id, old.campaign_id);

  if v_company is null then
    return new;
  end if;

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
      if has_valid_finance_override(v_company, 'campaign_assets', v_record_id, TG_OP) then
        perform consume_finance_override(v_company, 'campaign_assets', v_record_id, TG_OP);
      else
        raise exception 'Locked period: financial fields of campaign_assets cannot be changed.';
      end if;
    end if;
  end if;

  return new;
end;
$$;