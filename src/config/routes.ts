/**
 * Centralized route configuration for Go-Ads 360°
 * All routes should be defined here to maintain consistency
 */

export const ROUTES = {
  // Public Routes
  LANDING: '/',
  AUTH: '/auth',
  
  // Main Dashboard
  DASHBOARD: '/dashboard',
  
  // Media Assets
  MEDIA_ASSETS: '/admin/media-assets',
  MEDIA_ASSETS_NEW: '/admin/media-assets/new',
  MEDIA_ASSETS_EDIT: (id: string) => `/admin/media-assets/edit/${id}`,
  MEDIA_ASSETS_DETAIL: (id: string) => `/admin/media-assets/${id}`,
  MEDIA_ASSETS_MAP: '/admin/media-assets-map',
  MEDIA_ASSETS_IMPORT: '/admin/import-media-assets',
  MEDIA_ASSETS_VALIDATION: '/admin/media-assets-validation',
  MEDIA_ASSETS_HEALTH: '/admin/media-assets-health',
  
  // Clients
  CLIENTS: '/admin/clients',
  CLIENTS_NEW: '/admin/clients/new',
  CLIENTS_EDIT: (id: string) => `/admin/clients/edit/${id}`,
  CLIENTS_DETAIL: (id: string) => `/admin/clients/${id}`,
  CLIENTS_IMPORT: '/admin/clients-import',
  CLIENTS_ANALYTICS: '/admin/client-analytics',
  
  // Plans
  PLANS: '/admin/plans',
  PLANS_NEW: '/admin/plans/new',
  PLANS_EDIT: (id: string) => `/admin/plans/edit/${id}`,
  PLANS_DETAIL: (id: string) => `/admin/plans/${id}`,
  PLANS_SHARE: (id: string, shareId: string) => `/plans/${id}/share/${shareId}`,
  PLANS_COMPARISON: '/admin/plans/comparison',
  
  // Campaigns
  CAMPAIGNS: '/admin/campaigns',
  CAMPAIGNS_DETAIL: (id: string) => `/admin/campaigns/${id}`,
  CAMPAIGNS_EDIT: (id: string) => `/admin/campaigns/edit/${id}`,
  CAMPAIGNS_BUDGET: (id: string) => `/admin/campaigns/${id}/budget`,
  CAMPAIGNS_PROOFS: (id: string) => `/admin/campaigns/${id}/proofs`,
  
  // Operations
  OPERATIONS: '/admin/operations',
  OPERATIONS_CALENDAR: '/admin/operations-calendar',
  OPERATIONS_ANALYTICS: '/admin/operations-analytics',
  OPERATIONS_SETTINGS: '/admin/operations-settings',
  
  // Finance
  FINANCE: '/admin/finance',
  PURCHASE_ORDERS: '/admin/purchase-orders',
  SALES_ORDERS: '/admin/sales-orders',
  ESTIMATIONS: '/admin/estimations',
  INVOICES: '/admin/invoices',
  INVOICES_NEW: '/admin/invoices/new',
  INVOICES_DETAIL: (id: string) => `/admin/invoices/${id}`,
  INVOICES_IMPORT: '/admin/invoices-import',
  PROFORMAS: '/admin/proformas',
  PROFORMAS_DETAIL: (id: string) => `/admin/proformas/${id}`,
  PAYMENTS: '/admin/payments',
  EXPENSES: '/admin/expenses',
  
  // Power Bills
  POWER_BILLS: '/admin/power-bills',
  POWER_BILLS_ANALYTICS: '/admin/power-bills-analytics',
  POWER_BILLS_UPLOAD: '/admin/power-bills-upload',
  POWER_BILLS_RECONCILIATION: '/admin/power-bills-reconciliation',
  POWER_BILLS_SCHEDULER: '/admin/power-bills-scheduler',
  POWER_BILLS_SHARING: '/admin/power-bills-sharing',
  POWER_BILLS_BULK_PAYMENT: '/admin/power-bills-bulk-payment',
  MOBILE_POWER_BILLS: '/mobile-power-bills',
  
  // Reports
  REPORTS: '/admin/reports',
  REPORTS_VACANT: '/admin/reports/vacant-media',
  REPORTS_REVENUE: '/admin/reports/revenue',
  REPORTS_CAMPAIGNS: '/admin/reports/campaigns',
  REPORTS_CLIENTS: '/admin/reports/clients',
  REPORTS_FINANCIAL: '/admin/reports/financial',
  
  // Analytics
  ANALYTICS: '/admin/analytics',
  ANALYTICS_DASHBOARD: '/admin/analytics-dashboard',
  TENANT_ANALYTICS: '/admin/tenant-analytics',
  
  // Platform Admin
  PLATFORM: '/admin/platform',
  PLATFORM_SETUP: '/admin/platform-admin-setup',
  COMPANY_MANAGEMENT: '/admin/company-management',
  COMPANIES: '/admin/companies',
  USER_MANAGEMENT: '/admin/users',
  
  // Settings
  SETTINGS: '/admin/settings',
  SETTINGS_PROFILE: '/admin/settings/profile',
  SETTINGS_COMPANY: '/admin/settings/company',
  SETTINGS_ORGANIZATION: '/admin/settings/organization',
  SETTINGS_BRANDING: '/admin/settings/branding',
  SETTINGS_INTEGRATIONS: '/admin/settings/integrations',
  SETTINGS_ROLES: '/admin/settings/roles',
  SETTINGS_WORKFLOWS: '/admin/settings/workflows',
  SETTINGS_NOTIFICATIONS: '/admin/settings/notifications',
  SETTINGS_TAXES: '/admin/settings/taxes',
  SETTINGS_PAYMENTS: '/admin/settings/payments',
  SETTINGS_APPROVALS: '/admin/settings/approvals',
  
  // Tools
  IMPORT_DATA: '/admin/import',
  EXPORT_DATA: '/admin/export',
  PHOTO_GALLERY: '/admin/photo-gallery',
  CODE_MANAGEMENT: '/admin/code-management',
  DASHBOARD_BUILDER: '/admin/dashboard-builder',
  MARKETPLACE: '/admin/marketplace',
  BOOKING_REQUESTS: '/admin/booking-requests',
  VENDORS: '/admin/vendors',
  FIX_STREETVIEW_LINKS: '/admin/fix-streetview-links',
  
  // Mobile
  MOBILE: '/mobile',
  
  // Client Portal
  CLIENT_PORTAL_AUTH: '/portal/auth',
  CLIENT_PORTAL_DASHBOARD: '/portal/dashboard',
  CLIENT_PORTAL_CAMPAIGNS: '/portal/campaigns',
  CLIENT_PORTAL_INVOICES: '/portal/invoices',
  
  // AI Assistant
  AI_ASSISTANT: '/admin/assistant',
  
  // Audit & Logs
  AUDIT_LOGS: '/admin/audit-logs',
  ACCESS_DENIED: '/access-denied',
} as const;

/**
 * Route labels for breadcrumbs and navigation
 */
export const ROUTE_LABELS: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.MEDIA_ASSETS]: 'Media Assets',
  [ROUTES.MEDIA_ASSETS_NEW]: 'New Asset',
  [ROUTES.MEDIA_ASSETS_MAP]: 'Map View',
  [ROUTES.MEDIA_ASSETS_IMPORT]: 'Import Assets',
  [ROUTES.MEDIA_ASSETS_VALIDATION]: 'Validation',
  [ROUTES.MEDIA_ASSETS_HEALTH]: 'Health Report',
  [ROUTES.CLIENTS]: 'Clients',
  [ROUTES.CLIENTS_NEW]: 'New Client',
  [ROUTES.CLIENTS_IMPORT]: 'Import Clients',
  [ROUTES.CLIENTS_ANALYTICS]: 'Client Analytics',
  [ROUTES.PLANS]: 'Plans',
  [ROUTES.PLANS_NEW]: 'New Plan',
  [ROUTES.PLANS_COMPARISON]: 'Compare Plans',
  [ROUTES.CAMPAIGNS]: 'Campaigns',
  [ROUTES.OPERATIONS]: 'Operations',
  [ROUTES.OPERATIONS_CALENDAR]: 'Calendar',
  [ROUTES.OPERATIONS_ANALYTICS]: 'Analytics',
  [ROUTES.OPERATIONS_SETTINGS]: 'Settings',
  [ROUTES.FINANCE]: 'Finance',
  [ROUTES.PURCHASE_ORDERS]: 'Purchase Orders',
  [ROUTES.SALES_ORDERS]: 'Sales Orders',
  [ROUTES.ESTIMATIONS]: 'Quotations',
  [ROUTES.INVOICES]: 'Invoices',
  [ROUTES.INVOICES_IMPORT]: 'Import Invoices',
  [ROUTES.PROFORMAS]: 'Proformas',
  [ROUTES.PAYMENTS]: 'Payments',
  [ROUTES.EXPENSES]: 'Expenses',
  [ROUTES.POWER_BILLS]: 'Power Bills',
  [ROUTES.POWER_BILLS_ANALYTICS]: 'Analytics',
  [ROUTES.POWER_BILLS_UPLOAD]: 'Bulk Upload',
  [ROUTES.POWER_BILLS_RECONCILIATION]: 'Reconciliation',
  [ROUTES.POWER_BILLS_SCHEDULER]: 'Scheduler',
  [ROUTES.POWER_BILLS_SHARING]: 'Sharing',
  [ROUTES.POWER_BILLS_BULK_PAYMENT]: 'Bulk Payment',
  [ROUTES.REPORTS]: 'Reports',
  [ROUTES.REPORTS_VACANT]: 'Vacant Media',
  [ROUTES.REPORTS_REVENUE]: 'Revenue Analytics',
  [ROUTES.REPORTS_CAMPAIGNS]: 'Campaign Performance',
  [ROUTES.REPORTS_CLIENTS]: 'Client Reports',
  [ROUTES.REPORTS_FINANCIAL]: 'Financial Reports',
  [ROUTES.ANALYTICS]: 'Analytics',
  [ROUTES.ANALYTICS_DASHBOARD]: 'Analytics Dashboard',
  [ROUTES.TENANT_ANALYTICS]: 'Tenant Analytics',
  [ROUTES.PLATFORM]: 'Platform Admin',
  [ROUTES.PLATFORM_SETUP]: 'Platform Setup',
  [ROUTES.COMPANY_MANAGEMENT]: 'Companies',
  [ROUTES.COMPANIES]: 'Companies',
  [ROUTES.USER_MANAGEMENT]: 'Users',
  [ROUTES.SETTINGS]: 'Settings',
  [ROUTES.SETTINGS_PROFILE]: 'Profile',
  [ROUTES.SETTINGS_COMPANY]: 'Company',
  [ROUTES.SETTINGS_ORGANIZATION]: 'Organization',
  [ROUTES.SETTINGS_BRANDING]: 'Branding',
  [ROUTES.SETTINGS_INTEGRATIONS]: 'Integrations',
  [ROUTES.SETTINGS_ROLES]: 'Roles',
  [ROUTES.SETTINGS_WORKFLOWS]: 'Workflows',
  [ROUTES.SETTINGS_NOTIFICATIONS]: 'Notifications',
  [ROUTES.SETTINGS_TAXES]: 'Taxes',
  [ROUTES.SETTINGS_PAYMENTS]: 'Payments',
  [ROUTES.SETTINGS_APPROVALS]: 'Approvals',
  [ROUTES.IMPORT_DATA]: 'Import',
  [ROUTES.EXPORT_DATA]: 'Export',
  [ROUTES.PHOTO_GALLERY]: 'Photo Gallery',
  [ROUTES.CODE_MANAGEMENT]: 'Code Management',
  [ROUTES.DASHBOARD_BUILDER]: 'Dashboard Builder',
  [ROUTES.MARKETPLACE]: 'Marketplace',
  [ROUTES.BOOKING_REQUESTS]: 'Booking Requests',
  [ROUTES.VENDORS]: 'Vendors',
  [ROUTES.FIX_STREETVIEW_LINKS]: 'Fix Street View Links',
  [ROUTES.MOBILE]: 'Mobile',
  [ROUTES.CLIENT_PORTAL_DASHBOARD]: 'Dashboard',
  [ROUTES.CLIENT_PORTAL_CAMPAIGNS]: 'Campaigns',
  [ROUTES.CLIENT_PORTAL_INVOICES]: 'Invoices',
  [ROUTES.AI_ASSISTANT]: 'AI Assistant',
  [ROUTES.AUDIT_LOGS]: 'Audit Logs',
};
