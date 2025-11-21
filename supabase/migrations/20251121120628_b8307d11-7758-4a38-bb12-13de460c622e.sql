-- Add indexes for performance optimization on frequently queried columns
-- These indexes will significantly speed up the authentication and data loading queries

-- Company users lookup by user_id and status (used in auth flow)
CREATE INDEX IF NOT EXISTS idx_company_users_user_status ON company_users(user_id, status) WHERE status = 'active';

-- Company users lookup by company_id and status
CREATE INDEX IF NOT EXISTS idx_company_users_company_status ON company_users(company_id, status) WHERE status = 'active';

-- Companies lookup by status
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status) WHERE status = 'active';

-- Companies lookup by type
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);

-- Media assets by company and status (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_media_assets_company_status ON media_assets(company_id, status);

-- Campaigns by company and status
CREATE INDEX IF NOT EXISTS idx_campaigns_company_status ON campaigns(company_id, status);

-- Plans by company and status
CREATE INDEX IF NOT EXISTS idx_plans_company_status ON plans(company_id, status);

-- Clients by company
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);

-- Invoices by company and status
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);

-- Expenses by company
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);

-- Composite index for faster date range queries on campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(company_id, start_date, end_date);

-- Composite index for faster date range queries on plans
CREATE INDEX IF NOT EXISTS idx_plans_dates ON plans(company_id, start_date, end_date);