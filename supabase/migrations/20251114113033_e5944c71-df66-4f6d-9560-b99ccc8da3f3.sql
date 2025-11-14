-- Create enum for watermark position
create type watermark_position as enum ('bottom-right', 'bottom-left', 'top-right', 'top-left');

-- Create watermark settings table
create table public.watermark_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  position watermark_position not null default 'bottom-right',
  background_color text not null default 'rgba(0, 0, 0, 0.75)',
  text_color text not null default 'rgba(255, 255, 255, 1)',
  border_color text not null default 'rgba(16, 185, 129, 0.8)',
  show_logo boolean not null default false,
  logo_url text,
  fields_to_show jsonb not null default '["location", "direction", "dimension", "area", "illumination"]'::jsonb,
  panel_width integer not null default 380,
  panel_padding integer not null default 30,
  font_size integer not null default 16,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

-- Enable RLS
alter table public.watermark_settings enable row level security;

-- RLS Policies
create policy "Company users can view their watermark settings"
  on public.watermark_settings
  for select
  using (company_id = get_current_user_company_id() or is_platform_admin(auth.uid()));

create policy "Admins can insert watermark settings"
  on public.watermark_settings
  for insert
  with check (
    has_role(auth.uid(), 'admin'::app_role) 
    and company_id = get_current_user_company_id()
  );

create policy "Admins can update watermark settings"
  on public.watermark_settings
  for update
  using (
    has_role(auth.uid(), 'admin'::app_role) 
    and company_id = get_current_user_company_id()
  );

-- Create index for faster lookups
create index idx_watermark_settings_company_id on public.watermark_settings(company_id);

-- Insert default settings for existing companies
insert into public.watermark_settings (company_id)
select id from public.companies
where id not in (select company_id from public.watermark_settings where company_id is not null);