-- Performance optimization: Add database indexes for faster queries

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- Company users indexes
CREATE INDEX IF NOT EXISTS idx_company_users_user_company ON company_users(user_id, company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_company_users_company_role ON company_users(company_id, role) WHERE status = 'active';

-- Media assets indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_company_status ON media_assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_media_assets_city_area ON media_assets(city, area);
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type ON media_assets(media_type);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON clients USING gin(to_tsvector('english', name));

-- Plans indexes  
CREATE INDEX IF NOT EXISTS idx_plans_company_status ON plans(company_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_client ON plans(client_id);
CREATE INDEX IF NOT EXISTS idx_plans_created ON plans(created_at DESC);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_company_status ON campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- Campaign assets indexes
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign ON campaign_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_status ON campaign_assets(status);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign ON expenses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_module ON role_permissions(role, module);