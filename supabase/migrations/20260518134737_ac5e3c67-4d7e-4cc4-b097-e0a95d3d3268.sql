create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_settings enable row level security;

create policy "app_settings_public_read" on public.app_settings
  for select using (true);

create policy "app_settings_admin_insert" on public.app_settings
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "app_settings_admin_update" on public.app_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "app_settings_admin_delete" on public.app_settings
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.app_settings (key, value) values
  ('social_instagram', 'https://instagram.com/goads360'),
  ('social_facebook', 'https://facebook.com/goads360'),
  ('social_linkedin', 'https://linkedin.com/company/goads360'),
  ('social_whatsapp_phone', '919666444888')
on conflict (key) do nothing;