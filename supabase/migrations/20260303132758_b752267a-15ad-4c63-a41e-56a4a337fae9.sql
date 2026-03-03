create table if not exists public.finance_years (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  fy_label text not null,
  start_date date not null,
  end_date date not null,
  locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid,
  lock_reason text,
  created_at timestamptz not null default now(),
  unique(company_id, fy_label)
);

alter table public.finance_years enable row level security;

create policy "tenant_isolation_finance_years"
on public.finance_years
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());