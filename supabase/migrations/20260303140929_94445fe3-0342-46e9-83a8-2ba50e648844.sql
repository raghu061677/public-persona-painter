-- ============================================================
-- PHASE 2C (v2): Finance Override Request + Approval Workflow
-- SAFE: Does NOT weaken locks. Adds request_id to existing permits.
-- ============================================================

-- A) CREATE TABLE: finance_override_requests
create table if not exists public.finance_override_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  requested_by uuid not null,
  requested_by_role text not null default 'finance',
  reason text not null,
  scope_table text not null,
  scope_record_id text not null,
  scope_action text not null,
  payload jsonb,
  status text not null default 'pending',
  admin_decision_by uuid,
  admin_decision_at timestamptz,
  admin_decision_reason text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists idx_for_status on public.finance_override_requests(company_id, status);
create index if not exists idx_for_scope on public.finance_override_requests(scope_table, scope_record_id);

alter table public.finance_override_requests enable row level security;

-- Finance can INSERT requests for own company
create policy "finance_insert_requests"
on public.finance_override_requests for insert to authenticated
with check (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_override_requests.company_id
      and cu.role in ('finance','admin')
      and cu.status = 'active'
  )
);

-- Finance + Admin can VIEW own company requests
create policy "company_select_requests"
on public.finance_override_requests for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_override_requests.company_id
      and cu.role in ('admin','finance')
      and cu.status = 'active'
  )
);

-- Admin can UPDATE status (approve/reject) for own company
create policy "admin_update_requests"
on public.finance_override_requests for update to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_override_requests.company_id
      and cu.role = 'admin'
      and cu.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.user_id = auth.uid()
      and cu.company_id = finance_override_requests.company_id
      and cu.role = 'admin'
      and cu.status = 'active'
  )
);

-- No DELETE policy = nobody can delete

-- B) ADD request_id to existing finance_overrides table
alter table public.finance_overrides
  add column if not exists request_id uuid references public.finance_override_requests(id);