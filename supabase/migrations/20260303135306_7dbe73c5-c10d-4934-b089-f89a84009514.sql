-- =========================================================
-- PHASE 2A: finance_periods table + helper functions
-- =========================================================

create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year between 2000 and 2100),
  start_date date not null,
  end_date date not null,
  locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid,
  lock_reason text,
  created_at timestamptz not null default now(),
  unique(company_id, period_year, period_month)
);

alter table public.finance_periods enable row level security;

create policy "tenant_isolation_finance_periods"
on public.finance_periods
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create or replace function public.is_month_locked(p_company_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select fp.locked
    from finance_periods fp
    where fp.company_id = p_company_id
      and p_date >= fp.start_date
      and p_date <= fp.end_date
    limit 1
  ), false);
$$;

create or replace function public.is_fy_locked(p_company_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select fy.locked
    from finance_years fy
    where fy.company_id = p_company_id
      and p_date >= fy.start_date
      and p_date <= fy.end_date
    limit 1
  ), false);
$$;

-- =========================================================
-- PHASE 2B: DB-level lock triggers
-- =========================================================

create or replace function public.tg_block_locked_invoices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_date date;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.invoice_date, old.invoice_date, (coalesce(new.created_at, old.created_at))::date);

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      raise exception 'Financial period is locked. Invoice write blocked.';
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_block_locked_invoices on public.invoices;
create trigger trg_block_locked_invoices
before insert or update or delete on public.invoices
for each row execute function public.tg_block_locked_invoices();

create or replace function public.tg_block_locked_expenses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_date date;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := coalesce(new.expense_date, old.expense_date, new.paid_date, old.paid_date, (coalesce(new.created_at, old.created_at))::date);

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      raise exception 'Financial period is locked. Expense write blocked.';
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_block_locked_expenses on public.expenses;
create trigger trg_block_locked_expenses
before insert or update or delete on public.expenses
for each row execute function public.tg_block_locked_expenses();

create or replace function public.tg_block_locked_invoice_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id text;
  v_company uuid;
  v_date date;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select i.company_id, i.invoice_date
    into v_company, v_date
  from invoices i
  where i.id = v_invoice_id;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      raise exception 'Financial period is locked. Invoice item write blocked.';
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_block_locked_invoice_items on public.invoice_items;
create trigger trg_block_locked_invoice_items
before insert or update or delete on public.invoice_items
for each row execute function public.tg_block_locked_invoice_items();

drop trigger if exists trg_block_locked_invoice_line_items on public.invoice_line_items;
create trigger trg_block_locked_invoice_line_items
before insert or update or delete on public.invoice_line_items
for each row execute function public.tg_block_locked_invoice_items();

-- =========================================================
-- PHASE 2D: Freeze financial fields in campaign_assets
-- =========================================================

create or replace function public.tg_block_locked_campaign_assets_financial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_date date;
begin
  select c.company_id into v_company
  from campaigns c
  where c.id = coalesce(new.campaign_id, old.campaign_id);

  if v_company is null then
    return new;
  end if;

  v_date := coalesce(new.booking_start_date, old.booking_start_date, new.start_date, old.start_date, (coalesce(new.created_at, old.created_at))::date);

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
      raise exception 'Locked period: financial fields of campaign_assets cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_locked_campaign_assets_financial on public.campaign_assets;
create trigger trg_block_locked_campaign_assets_financial
before update on public.campaign_assets
for each row execute function public.tg_block_locked_campaign_assets_financial();

-- =========================================================
-- Payable batches lock trigger
-- =========================================================

create or replace function public.tg_block_locked_payable_batches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_date date;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_date := (coalesce(new.month_key, old.month_key) || '-01')::date;

  if v_company is not null and v_date is not null then
    if is_fy_locked(v_company, v_date) or is_month_locked(v_company, v_date) then
      raise exception 'Financial period is locked. Payable batch write blocked.';
    end if;
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_block_locked_payable_batches on public.payable_batches;
create trigger trg_block_locked_payable_batches
before insert or update or delete on public.payable_batches
for each row execute function public.tg_block_locked_payable_batches();