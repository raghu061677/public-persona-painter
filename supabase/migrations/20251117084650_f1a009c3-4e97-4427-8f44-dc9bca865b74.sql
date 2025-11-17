-- Performance Optimization: Add Strategic Indexes

-- Media Assets: Most queried table
CREATE INDEX IF NOT EXISTS idx_media_assets_company_status ON media_assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_media_assets_city_area ON media_assets(city, area);
CREATE INDEX IF NOT EXISTS idx_media_assets_search_tokens ON media_assets USING GIN(search_tokens);
CREATE INDEX IF NOT EXISTS idx_media_assets_location ON media_assets(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Campaigns: Frequent status and date queries
CREATE INDEX IF NOT EXISTS idx_campaigns_company_status ON campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id, status);

-- Plans: Active plan lookups
CREATE INDEX IF NOT EXISTS idx_plans_company_status ON plans(company_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_client ON plans(client_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_dates ON plans(start_date, end_date);

-- Plan Items: Join optimization
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_asset ON plan_items(asset_id);

-- Campaign Assets: Operations queries
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign_status ON campaign_assets(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_asset ON campaign_assets(asset_id);

-- Clients: Search and company lookups
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Invoices: Financial reports
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(invoice_date, due_date);

-- Expenses: Financial tracking
CREATE INDEX IF NOT EXISTS idx_expenses_company_category ON expenses(company_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign ON expenses(campaign_id);

-- Notifications: Real-time queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Activity Logs: Audit queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Company Users: Auth lookups
CREATE INDEX IF NOT EXISTS idx_company_users_user_company ON company_users(user_id, company_id, status);

-- Booking Requests: Marketplace queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_asset_status ON booking_requests(asset_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_requester ON booking_requests(requester_company_id, status);

-- Power Bills: Asset tracking
CREATE INDEX IF NOT EXISTS idx_power_bills_asset_month ON asset_power_bills(asset_id, bill_month);
CREATE INDEX IF NOT EXISTS idx_power_bills_payment_status ON asset_power_bills(payment_status, due_date);

-- Leads: Sales pipeline
CREATE INDEX IF NOT EXISTS idx_leads_company_status ON leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

COMMENT ON INDEX idx_media_assets_company_status IS 'Optimize dashboard and asset list queries';
COMMENT ON INDEX idx_campaigns_company_status IS 'Optimize campaign dashboard queries';
COMMENT ON INDEX idx_notifications_user_read IS 'Optimize notification center real-time queries';