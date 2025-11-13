/**
 * Centralized route constants for the application
 * Use these constants instead of hardcoding routes to prevent mismatches
 */

// Public routes
export const ROUTES = {
  INDEX: "/",
  DASHBOARD: "/admin/dashboard",
  
  // Authentication
  AUTH: "/auth",
  
  // Profile & Settings
  PROFILE_SETTINGS: "/settings/profile",
  SETTINGS: "/admin/settings",
  ORGANIZATION_SETTINGS: "/admin/settings/organization",
  
  // Media Assets
  MEDIA_ASSETS: "/admin/media-assets",
  MEDIA_ASSETS_NEW: "/admin/media-assets/new",
  MEDIA_ASSETS_EDIT: (id: string) => `/admin/media-assets/edit/${id}`,
  MEDIA_ASSETS_DETAIL: (id: string) => `/admin/media-assets/${id}`,
  MEDIA_ASSETS_MAP: "/admin/media-assets-map",
  MEDIA_ASSETS_IMPORT: "/admin/media-assets/import",
  PHOTO_LIBRARY: "/admin/photo-library",
  
  // Clients
  CLIENTS: "/admin/clients",
  CLIENTS_NEW: "/admin/clients/new",
  CLIENTS_DETAIL: (id: string) => `/admin/clients/${id}`,
  CLIENTS_IMPORT: "/admin/clients/import",
  CLIENTS_ANALYTICS: "/admin/clients/analytics",
  
  // Plans
  PLANS: "/admin/plans",
  PLANS_NEW: "/admin/plans/new",
  PLANS_EDIT: (id: string) => `/admin/plans/edit/${id}`,
  PLANS_DETAIL: (id: string) => `/admin/plans/${id}`,
  PLANS_SHARE: (id: string, shareToken: string) => `/plans/share/${id}/${shareToken}`,
  PLANS_COMPARISON: "/admin/plans/comparison",
  
  // Campaigns
  CAMPAIGNS: "/admin/campaigns",
  CAMPAIGNS_NEW: "/admin/campaigns/new",
  CAMPAIGNS_EDIT: (id: string) => `/admin/campaigns/edit/${id}`,
  CAMPAIGNS_DETAIL: (id: string) => `/admin/campaigns/${id}`,
  CAMPAIGNS_ASSET_PROOFS: (id: string) => `/admin/campaigns/${id}/asset-proofs`,
  CAMPAIGNS_BUDGET: (id: string) => `/admin/campaigns/${id}/budget`,
  
  // Finance
  ESTIMATIONS: "/admin/estimations",
  INVOICES: "/admin/invoices",
  INVOICES_DETAIL: (id: string) => `/admin/invoices/${id}`,
  EXPENSES: "/admin/expenses",
  FINANCE_DASHBOARD: "/admin/finance",
  
  // Power Bills
  POWER_BILLS_DASHBOARD: "/admin/power-bills",
  POWER_BILLS_ANALYTICS: "/admin/power-bills/analytics",
  POWER_BILLS_SCHEDULER: "/admin/power-bills/scheduler",
  POWER_BILLS_BULK_PAYMENT: "/admin/power-bills/bulk-payment",
  POWER_BILLS_BULK_UPLOAD: "/admin/power-bills/bulk-upload",
  POWER_BILLS_RECONCILIATION: "/admin/power-bills/reconciliation",
  MOBILE_POWER_BILLS: "/mobile/power-bills",
  
  // Operations
  OPERATIONS: "/admin/operations",
  OPERATIONS_CALENDAR: "/admin/operations/calendar",
  OPERATIONS_ANALYTICS: "/admin/operations/analytics",
  OPERATIONS_SETTINGS: "/admin/operations/settings",
  MOBILE_OPS_UPLOAD: "/mobile/operations/:assignmentId",
  MOBILE_FIELD_APP: "/mobile/field-app",
  MOBILE_OPERATIONS: "/mobile/operations",
  MOBILE_UPLOAD: "/mobile/upload/:campaignId/:assetId",
  
  // Reports
  REPORTS: "/admin/reports",
  VACANT_MEDIA_REPORT: "/admin/reports/vacant-media",
  
  // Users & Access
  USER_MANAGEMENT: "/admin/users",
  
  // Approvals
  APPROVAL_SETTINGS: "/admin/approvals/settings",
  APPROVAL_DELEGATION: "/admin/approvals/delegation",
  APPROVAL_ANALYTICS: "/admin/approvals/analytics",
  
  // Data Management
  IMPORT_DATA: "/admin/data/import",
  EXPORT_DATA: "/admin/data/export",
  AUDIT_LOGS: "/admin/audit-logs",
  
  // Code Management
  CODE_MANAGEMENT: "/admin/code-management",
  
  // Vendors
  VENDORS_MANAGEMENT: "/admin/vendors",
} as const;

/**
 * Role-specific default landing pages
 */
export const ROLE_DASHBOARDS = {
  admin: ROUTES.DASHBOARD,
  sales: ROUTES.PLANS,
  operations: ROUTES.OPERATIONS,
  finance: ROUTES.FINANCE_DASHBOARD,
  user: ROUTES.DASHBOARD,
} as const;
