/**
 * Centralized route constants for the application
 * Use these constants instead of hardcoding routes to prevent mismatches
 */

// Public routes
export const ROUTES = {
  // Auth
  HOME: "/",
  AUTH: "/auth",
  
  // Main
  DASHBOARD: "/dashboard",
  
  // Clients
  CLIENTS: "/admin/clients",
  CLIENTS_NEW: "/admin/clients/new",
  CLIENTS_IMPORT: "/admin/clients/import",
  CLIENT_DETAIL: (id: string) => `/admin/clients/${id}`,
  CLIENT_ANALYTICS: (id: string) => `/admin/clients/${id}/analytics`,
  
  // Media Assets
  MEDIA_ASSETS: "/admin/media-assets",
  MEDIA_ASSETS_NEW: "/admin/media-assets/new",
  MEDIA_ASSETS_IMPORT: "/admin/media-assets/import",
  MEDIA_ASSETS_MAP: "/admin/media-assets-map",
  MEDIA_ASSET_DETAIL: (id: string) => `/admin/media-assets/${id}`,
  MEDIA_ASSET_EDIT: (id: string) => `/admin/media-assets/edit/${id}`,
  
  // Plans
  PLANS: "/admin/plans",
  PLANS_NEW: "/admin/plans/new",
  PLANS_COMPARE: "/admin/plans-compare",
  PLAN_DETAIL: (id: string) => `/admin/plans/${id}`,
  PLAN_EDIT: (id: string) => `/admin/plans/edit/${id}`,
  PLAN_SHARE: (id: string, token: string) => `/admin/plans/${id}/share/${token}`,
  
  // Campaigns
  CAMPAIGNS: "/admin/campaigns",
  CAMPAIGN_DETAIL: (id: string) => `/admin/campaigns/${id}`,
  CAMPAIGN_EDIT: (id: string) => `/admin/campaigns/edit/${id}`,
  
  // Operations
  OPERATIONS: "/admin/operations",
  OPERATIONS_ANALYTICS: "/admin/operations-analytics",
  OPERATIONS_CALENDAR: "/admin/operations-calendar",
  OPERATIONS_SETTINGS: "/admin/operations-settings",
  MOBILE_OPERATIONS: "/admin/mobile-operations",
  MOBILE_FIELD_APP: "/mobile/field-app",
  MOBILE_UPLOAD: (campaignId: string, assetId: string) => `/mobile/upload/${campaignId}/${assetId}`,
  MOBILE_OPS_UPLOAD: "/mobile/upload",
  CAMPAIGN_ASSET_PROOFS: "/admin/operations/:campaignId/assets/:assetId",
  MOBILE_POWER_BILLS: "/mobile/power-bills",
  
  // Finance
  FINANCE: "/finance",
  ESTIMATIONS: "/finance/estimations",
  INVOICES: "/finance/invoices",
  INVOICE_DETAIL: (id: string) => `/finance/invoices/${id}`,
  EXPENSES: "/finance/expenses",
  
  // Reports
  REPORTS: "/reports",
  REPORTS_VACANT_MEDIA: "/reports/vacant-media",
  
  // Power Bills
  POWER_BILLS: "/admin/power-bills",
  POWER_BILLS_ANALYTICS: "/admin/power-bills-analytics",
  POWER_BILLS_BULK_PAYMENT: "/admin/power-bills-bulk-payment",
  POWER_BILLS_BULK_UPLOAD: "/admin/power-bills/bulk-upload",
  POWER_BILLS_RECONCILIATION: "/admin/power-bills/reconciliation",
  
  // Admin
  PHOTO_LIBRARY: "/admin/photo-library",
  IMPORT_DATA: "/admin/import",
  EXPORT_DATA: "/admin/export",
  CODE_MANAGEMENT: "/admin/code-management",
  AUDIT_LOGS: "/admin/audit-logs",
  VENDORS: "/admin/vendors",
  USERS: "/admin/users",
  APPROVAL_SETTINGS: "/admin/approval-settings",
  APPROVAL_DELEGATION: "/admin/approval-delegation",
  APPROVAL_ANALYTICS: "/admin/approval-analytics",
  
  // Settings
  SETTINGS: "/settings",
  ORGANIZATION_SETTINGS: "/admin/organization-settings",
} as const;

/**
 * Role-specific default landing pages
 */
export const ROLE_DASHBOARDS = {
  admin: ROUTES.DASHBOARD,
  sales: ROUTES.PLANS,
  operations: ROUTES.OPERATIONS,
  finance: ROUTES.FINANCE,
  user: ROUTES.DASHBOARD,
} as const;
