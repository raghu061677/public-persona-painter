import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ClientPortalProvider } from "@/contexts/ClientPortalContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard, PlatformAdminGuard } from "@/components/auth/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "@/layouts/AppLayout";
import { ClientPortalLayout } from "@/layouts/ClientPortalLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { AIAssistantChat } from "@/components/assistant/AIAssistantChat";

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const RegisterCompany = lazy(() => import("./pages/RegisterCompany"));
const ApproveCompanies = lazy(() => import("./pages/ApproveCompanies"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MediaAssetsList = lazy(() => import("./pages/MediaAssetsControlCenter"));
const MediaAssetNew = lazy(() => import("./pages/MediaAssetNew"));
const MediaAssetDetail = lazy(() => import("./pages/MediaAssetDetail"));
const MediaAssetEdit = lazy(() => import("./pages/MediaAssetEdit"));
const MediaAssetsMap = lazy(() => import("./pages/MediaAssetsMap"));
const MediaAssetsImport = lazy(() => import("./pages/MediaAssetsImport"));
const MediaAssetsValidation = lazy(() => import("./pages/MediaAssetsValidation"));
const TenantAnalytics = lazy(() => import("./pages/TenantAnalytics"));
const ClientsImport = lazy(() => import("./pages/ClientsImport"));
const ClientsList = lazy(() => import("./pages/ClientsList"));
const ClientNew = lazy(() => import("./pages/ClientNew"));
const ClientAnalytics = lazy(() => import("./pages/ClientAnalytics"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const PlansList = lazy(() => import("./pages/PlansList"));
const PlanNew = lazy(() => import("./pages/PlanNew"));
const PlanEdit = lazy(() => import("./pages/PlanEdit"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const PlanShare = lazy(() => import("./pages/PlanShare"));
const CampaignsList = lazy(() => import("./pages/CampaignsList"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CampaignEdit = lazy(() => import("./pages/CampaignEdit"));
const CampaignBudget = lazy(() => import("./pages/CampaignBudget"));
const CampaignAssetProofs = lazy(() => import("./pages/CampaignAssetProofs"));
const MobilePowerBills = lazy(() => import("./pages/MobilePowerBills"));
const MobilePage = lazy(() => import("./pages/mobile/index"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const EstimationsList = lazy(() => import("./pages/EstimationsList"));
const InvoicesList = lazy(() => import("./pages/InvoicesList"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const ExpensesList = lazy(() => import("./pages/ExpensesList"));
const SalesOrders = lazy(() => import("./pages/SalesOrders"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Payments = lazy(() => import("./pages/Payments"));
const OperationsCreatives = lazy(() => import("./pages/OperationsCreatives"));
const OperationsPrinting = lazy(() => import("./pages/OperationsPrinting"));
const OperationsProofUploads = lazy(() => import("./pages/OperationsProofUploads"));
const ReportClientBookings = lazy(() => import("./pages/ReportClientBookings"));
const ReportCampaignBookings = lazy(() => import("./pages/ReportCampaignBookings"));
const ReportAssetRevenue = lazy(() => import("./pages/ReportAssetRevenue"));
const ReportFinancialSummary = lazy(() => import("./pages/ReportFinancialSummary"));
const ReportProofExecution = lazy(() => import("./pages/ReportProofExecution"));
const PlatformReportCompanyUsage = lazy(() => import("./pages/PlatformReportCompanyUsage"));
const PlatformReportBilling = lazy(() => import("./pages/PlatformReportBilling"));
const PlatformReportMediaInventory = lazy(() => import("./pages/PlatformReportMediaInventory"));
const PlatformRoles = lazy(() => import("./pages/PlatformRoles"));
const ReportsDashboard = lazy(() => import("./pages/ReportsDashboard"));
const VacantMediaReport = lazy(() => import("./pages/VacantMediaReport"));
const PhotoGallery = lazy(() => import("./pages/PhotoGallery"));
const ImportData = lazy(() => import("./pages/ImportData"));
const ExportData = lazy(() => import("./pages/ExportData"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const CompanyUsersManagement = lazy(() => import("./pages/CompanyUsersManagement"));
const CodeManagement = lazy(() => import("./pages/CodeManagement"));
const PowerBillsDashboard = lazy(() => import("./pages/PowerBillsDashboard"));
const PowerBillsAnalytics = lazy(() => import("./pages/PowerBillsAnalytics"));
const PowerBillsBulkPayment = lazy(() => import("./pages/PowerBillsBulkPayment"));
const PowerBillsBulkUpload = lazy(() => import("./pages/PowerBillsBulkUpload"));
const PowerBillsReconciliation = lazy(() => import("./pages/PowerBillsReconciliation"));
const PowerBillsSharing = lazy(() => import("./pages/PowerBillsSharing"));
const PowerBillsScheduler = lazy(() => import("./pages/PowerBillsScheduler"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ApprovalSettings = lazy(() => import("./pages/ApprovalSettings"));
const ApprovalDelegation = lazy(() => import("./pages/ApprovalDelegation"));
const ApprovalAnalytics = lazy(() => import("./pages/ApprovalAnalytics"));
const VendorsManagement = lazy(() => import("./pages/VendorsManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ThemeSettings = lazy(() => import("./pages/ThemeSettings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const ClientPortalAuth = lazy(() => import("./pages/ClientPortalAuth"));
const MagicLinkAuth = lazy(() => import("./pages/portal/MagicLinkAuth"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const OperationsSettings = lazy(() => import("./pages/OperationsSettings"));
const Operations = lazy(() => import("./pages/Operations"));
const OperationsCalendar = lazy(() => import("./pages/OperationsCalendar"));
const OperationsAnalytics = lazy(() => import("./pages/OperationsAnalytics"));
const PlanComparison = lazy(() => import("./pages/PlanComparison"));
const ProformasList = lazy(() => import("./pages/ProformasList"));
const ProformaDetail = lazy(() => import("./pages/ProformaDetail"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const DashboardBuilder = lazy(() => import("./pages/DashboardBuilder"));
const DataExportImport = lazy(() => import("./pages/DataExportImport"));
const CompanyOnboarding = lazy(() => import("./pages/CompanyOnboarding"));
const CompaniesManagement = lazy(() => import("./pages/CompaniesManagement"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const CompanyBranding = lazy(() => import("./pages/CompanyBranding"));
const BrandingSettings = lazy(() => import("./pages/BrandingSettings"));
const CompanyTaxes = lazy(() => import("./pages/CompanyTaxes"));
const CompanyReminders = lazy(() => import("./pages/CompanyReminders"));
const CompanyClientPortal = lazy(() => import("./pages/CompanyClientPortal"));
const CompanyCurrencies = lazy(() => import("./pages/CompanyCurrencies"));
const CompanyPDFTemplates = lazy(() => import("./pages/CompanyPDFTemplates"));
const CompanyRoles = lazy(() => import("./pages/CompanyRoles"));
const CompanyDirectTaxes = lazy(() => import("./pages/CompanyDirectTaxes"));
const CompanyEInvoicing = lazy(() => import("./pages/CompanyEInvoicing"));
const CompanyGeneral = lazy(() => import("./pages/CompanyGeneral"));
const CompanyEmailNotifications = lazy(() => import("./pages/CompanyEmailNotifications"));
const CompanySMSNotifications = lazy(() => import("./pages/CompanySMSNotifications"));
const CompanyDigitalSignature = lazy(() => import("./pages/CompanyDigitalSignature"));
const CompanyPayments = lazy(() => import("./pages/CompanyPayments"));
const CompanySales = lazy(() => import("./pages/CompanySales"));
const CompanyIntegrations = lazy(() => import("./pages/CompanyIntegrations"));
const CompanyDeveloper = lazy(() => import("./pages/CompanyDeveloper"));
const CompanyWorkflows = lazy(() => import("./pages/CompanyWorkflows"));
const PlatformAdminDashboard = lazy(() => import("./pages/PlatformAdminDashboard"));
const PlatformAdminSetup = lazy(() => import("./pages/PlatformAdminSetup"));
const PlatformReports = lazy(() => import("./pages/PlatformReports"));
const DashboardRouter = lazy(() => import("./components/dashboard/DashboardRouter").then(m => ({ default: m.DashboardRouter })));
const CompanyTesting = lazy(() => import("./pages/CompanyTesting"));
const CompanyManagement = lazy(() => import("./pages/CompanyManagement"));
const OnboardingTest = lazy(() => import("./pages/OnboardingTest"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceAssetDetail = lazy(() => import("./pages/MarketplaceAssetDetail"));
const CompanyUsersSettings = lazy(() => import("./pages/CompanyUsersSettings"));
const CompanyCodeSettings = lazy(() => import("./pages/CompanyCodeSettings"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const CustomDashboard = lazy(() => import("./pages/CustomDashboard"));
const BookingRequests = lazy(() => import("./pages/BookingRequests"));
const ClientPortalDashboard = lazy(() => import("./pages/ClientPortalDashboard"));
const ClientPortalProofs = lazy(() => import("./pages/ClientPortalProofs"));
const ClientPortalPayments = lazy(() => import("./pages/ClientPortalPayments"));
const ClientPortalDownloads = lazy(() => import("./pages/ClientPortalDownloads"));
const WorkflowTest = lazy(() => import("./pages/WorkflowTest"));
const ClientCampaignView = lazy(() => import("./pages/ClientCampaignView"));
const ClientInvoices = lazy(() => import("./pages/ClientInvoices"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const ManageUsers = lazy(() => import("./pages/platform/ManageUsers"));
const ManageCompanies = lazy(() => import("./pages/platform/ManageCompanies"));
const SubscriptionManagement = lazy(() => import("./pages/SubscriptionManagement"));
const MigrateToMatrix = lazy(() => import("./pages/MigrateToMatrix"));

// Optimized Query Client with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes  
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Preload critical routes on idle for faster navigation
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    import("./pages/Dashboard");
    import("./pages/PlansList");
    import("./pages/CampaignsList");
  }, { timeout: 3000 });
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <TenantProvider>
            <CompanyProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/register-company" element={<RegisterCompany />} />
                  <Route path="/onboarding" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            <Route path="/explore" element={<PublicLayout><Marketplace /></PublicLayout>} />
            <Route path="/marketplace" element={<PublicLayout><Marketplace /></PublicLayout>} />
            <Route path="/marketplace/asset/:id" element={<PublicLayout><MarketplaceAssetDetail /></PublicLayout>} />
            <Route path="/admin/plans/:id/share/:shareToken" element={<PlanShare />} />
            <Route path="/mobile/*" element={<MobilePage />} />
            
            {/* Redirect /admin to /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Redirect common paths to their correct /admin prefixed routes */}
            <Route path="/media-assets" element={<Navigate to="/admin/media-assets" replace />} />
            <Route path="/clients" element={<Navigate to="/admin/clients" replace />} />
            <Route path="/plans" element={<Navigate to="/admin/plans" replace />} />
            <Route path="/campaigns" element={<Navigate to="/admin/campaigns" replace />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute requireAuth><AppLayout><DashboardRouter /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requireAuth><AppLayout><DashboardRouter /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute requireAuth><AppLayout><CompaniesManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/company-management" element={<ProtectedRoute requireAuth><AppLayout><CompanyManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/approve-companies" element={<ProtectedRoute requireAuth><AppLayout><ApproveCompanies /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/company-code-settings" element={<ProtectedRoute requireAuth><AppLayout><CompanyCodeSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/platform" element={<ProtectedRoute requireAuth><AppLayout><PlatformAdminDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/platform/users" element={<PlatformAdminGuard><AppLayout><ManageUsers /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/platform/companies" element={<PlatformAdminGuard><AppLayout><ManageCompanies /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/subscriptions" element={<PlatformAdminGuard><AppLayout><SubscriptionManagement /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/code-management" element={<PlatformAdminGuard><AppLayout><CodeManagement /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/platform-reports" element={<PlatformAdminGuard><AppLayout><PlatformReports /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/migrate-data" element={<PlatformAdminGuard><AppLayout><MigrateToMatrix /></AppLayout></PlatformAdminGuard>} />
            
            {/* Duplicate route removed - see line 268 for actual company settings routes */}
            
            <Route path="/admin/company-testing" element={<ProtectedRoute requireAuth><AppLayout><CompanyTesting /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/onboarding" element={<ProtectedRoute requireAuth><AppLayout><OnboardingTest /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/booking-requests" element={<ProtectedRoute requireAuth><AppLayout><BookingRequests /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><AppLayout><ClientsList /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/new" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><AppLayout><ClientNew /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><AppLayout><ClientDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/:id/analytics" element={<AppLayout><ClientAnalytics /></AppLayout>} />
            <Route path="/admin/media-assets" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><AppLayout><MediaAssetsList /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/new" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><AppLayout><MediaAssetNew /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/import" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><AppLayout><MediaAssetsImport /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/validate" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><AppLayout><MediaAssetsValidation /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/import" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><AppLayout><ClientsImport /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/edit/:id" element={<ProtectedRoute requiredModule="media_assets" requiredAction="update"><AppLayout><MediaAssetEdit /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/:id" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><AppLayout><MediaAssetDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets-map" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><AppLayout><MediaAssetsMap /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/marketplace" element={<ProtectedRoute requireAuth><AppLayout><Marketplace /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/plans" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><AppLayout><PlansList /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/new" element={<ProtectedRoute requiredModule="plans" requiredAction="create"><AppLayout><PlanNew /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/edit/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="update"><AppLayout><PlanEdit /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><AppLayout><PlanDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/plans-compare" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><AppLayout><PlanComparison /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><AppLayout><CampaignsList /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/edit/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="update"><AppLayout><CampaignEdit /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><AppLayout><CampaignDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id/budget" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><AppLayout><CampaignBudget /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/operations" element={<AppLayout><Operations /></AppLayout>} />
            <Route path="/admin/operations/creatives" element={<AppLayout><OperationsCreatives /></AppLayout>} />
            <Route path="/admin/operations/printing" element={<AppLayout><OperationsPrinting /></AppLayout>} />
            <Route path="/admin/operations/proof-uploads" element={<AppLayout><OperationsProofUploads /></AppLayout>} />
            <Route path="/admin/workflow-test" element={<AppLayout><WorkflowTest /></AppLayout>} />
            <Route path="/admin/operations-analytics" element={<AppLayout><OperationsAnalytics /></AppLayout>} />
            <Route path="/admin/operations-calendar" element={<AppLayout><OperationsCalendar /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
            <Route path="/finance/estimations" element={<AppLayout><EstimationsList /></AppLayout>} />
            <Route path="/admin/sales-orders" element={<AppLayout><SalesOrders /></AppLayout>} />
            <Route path="/admin/purchase-orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />
            <Route path="/admin/payments" element={<AppLayout><Payments /></AppLayout>} />
            <Route path="/admin/reports/clients" element={<AppLayout><ReportClientBookings /></AppLayout>} />
            <Route path="/admin/reports/campaigns" element={<AppLayout><ReportCampaignBookings /></AppLayout>} />
            <Route path="/admin/reports/revenue" element={<AppLayout><ReportAssetRevenue /></AppLayout>} />
            <Route path="/admin/reports/financial" element={<AppLayout><ReportFinancialSummary /></AppLayout>} />
            <Route path="/admin/reports/proof-execution" element={<AppLayout><ReportProofExecution /></AppLayout>} />
            <Route path="/admin/platform-reports/company-usage" element={<AppLayout><PlatformReportCompanyUsage /></AppLayout>} />
            <Route path="/admin/platform-reports/billing" element={<AppLayout><PlatformReportBilling /></AppLayout>} />
            <Route path="/admin/platform-reports/media-inventory" element={<AppLayout><PlatformReportMediaInventory /></AppLayout>} />
            <Route path="/admin/platform-roles" element={<AppLayout><PlatformRoles /></AppLayout>} />
            <Route path="/finance/proformas" element={<AppLayout><ProformasList /></AppLayout>} />
            <Route path="/finance/proformas/:id" element={<AppLayout><ProformaDetail /></AppLayout>} />
            <Route path="/finance/invoices" element={<AppLayout><InvoicesList /></AppLayout>} />
            <Route path="/finance/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />
            <Route path="/admin/invoices" element={<AppLayout><Invoices /></AppLayout>} />
            <Route path="/admin/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />
            <Route path="/finance/expenses" element={<AppLayout><ExpensesList /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsDashboard /></AppLayout>} />
            <Route path="/reports/vacant-media" element={<AppLayout><VacantMediaReport /></AppLayout>} />
            <Route path="/admin/reports/vacant-media" element={<AppLayout><VacantMediaReport /></AppLayout>} />
            <Route path="/admin/ai-assistant" element={<AppLayout><AIAssistant /></AppLayout>} />
            <Route path="/admin/assistant" element={<AppLayout><AIAssistant /></AppLayout>} />
            <Route path="/admin/tenant-analytics" element={<AppLayout><TenantAnalytics /></AppLayout>} />
            <Route path="/admin/analytics-dashboard" element={<AppLayout><AnalyticsDashboard /></AppLayout>} />
            <Route path="/admin/proformas" element={<AppLayout><ProformasList /></AppLayout>} />
            <Route path="/admin/proformas/:id" element={<AppLayout><ProformaDetail /></AppLayout>} />
            <Route path="/admin/estimations" element={<AppLayout><EstimationsList /></AppLayout>} />
            <Route path="/admin/gallery" element={<ProtectedRoute><AppLayout><PhotoGallery /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/photo-library" element={<ProtectedRoute><AppLayout><PhotoGallery /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/import" element={<AppLayout><ImportData /></AppLayout>} />
            <Route path="/admin/export" element={<AppLayout><ExportData /></AppLayout>} />
            <Route path="/admin/data-export-import" element={<AppLayout><DataExportImport /></AppLayout>} />
            <Route path="/admin/code-management" element={<AppLayout><CodeManagement /></AppLayout>} />
            <Route path="/admin/power-bills" element={<AppLayout><PowerBillsDashboard /></AppLayout>} />
            <Route path="/admin/power-bills-analytics" element={<AppLayout><PowerBillsAnalytics /></AppLayout>} />
            <Route path="/admin/power-bills-bulk-payment" element={<AppLayout><PowerBillsBulkPayment /></AppLayout>} />
            <Route path="/admin/power-bills/bulk-upload" element={<AppLayout><PowerBillsBulkUpload /></AppLayout>} />
            <Route path="/admin/power-bills/reconciliation" element={<AppLayout><PowerBillsReconciliation /></AppLayout>} />
            <Route path="/admin/power-bills/scheduler" element={<AppLayout><PowerBillsScheduler /></AppLayout>} />
            <Route path="/admin/power-bills-sharing" element={<AppLayout><PowerBillsSharing /></AppLayout>} />
            <Route path="/admin/audit-logs" element={<AppLayout><AuditLogs /></AppLayout>} />
            <Route path="/admin/vendors" element={<AppLayout><VendorsManagement /></AppLayout>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredModule="users" requiredAction="view"><AppLayout><UserManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/users/companies/:companyId" element={<PlatformAdminGuard><AppLayout><CompanyUsersManagement /></AppLayout></PlatformAdminGuard>} />
            <Route path="/admin/operations-settings" element={<AppLayout><OperationsSettings /></AppLayout>} />
            <Route path="/admin/organization-settings" element={<AppLayout><OrganizationSettings /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/settings/profile" element={<ProtectedRoute requireAuth><AppLayout><ProfileSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/settings/theme" element={<ProtectedRoute requireAuth><AppLayout><ThemeSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute requireAuth><AppLayout><NotificationSettings /></AppLayout></ProtectedRoute>} />
            
            {/* Company Settings with SettingsLayout */}
            <Route path="/admin/company-settings" element={<ProtectedRoute requireAuth><SettingsLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/company-settings/profile" replace />} />
              <Route path="profile" element={<CompanyProfile />} />
              <Route path="branding" element={<CompanyBranding />} />
              <Route path="roles" element={<CompanyRoles />} />
              <Route path="users" element={<CompanyUsersSettings />} />
              <Route path="taxes" element={<CompanyTaxes />} />
              <Route path="direct-taxes" element={<CompanyDirectTaxes />} />
              <Route path="einvoicing" element={<CompanyEInvoicing />} />
              <Route path="general" element={<CompanyGeneral />} />
              <Route path="currencies" element={<CompanyCurrencies />} />
              <Route path="reminders" element={<CompanyReminders />} />
              <Route path="client-portal" element={<CompanyClientPortal />} />
              <Route path="pdf-templates" element={<CompanyPDFTemplates />} />
              <Route path="email-notifications" element={<CompanyEmailNotifications />} />
              <Route path="sms-notifications" element={<CompanySMSNotifications />} />
              <Route path="digital-signature" element={<CompanyDigitalSignature />} />
              <Route path="payments" element={<CompanyPayments />} />
              <Route path="sales" element={<CompanySales />} />
              <Route path="integrations" element={<CompanyIntegrations />} />
              <Route path="developer" element={<CompanyDeveloper />} />
              <Route path="workflows" element={<CompanyWorkflows />} />
            </Route>
            
            {/* Company Onboarding */}
            <Route path="/onboarding" element={<CompanyOnboarding />} />
            
            {/* Platform Admin Setup */}
            <Route path="/admin/platform-admin-setup" element={<PlatformAdminSetup />} />
            
            <Route path="/admin/approval-settings" element={<AppLayout><ApprovalSettings /></AppLayout>} />
            <Route path="/admin/approval-delegation" element={<AppLayout><ApprovalDelegation /></AppLayout>} />
            <Route path="/admin/approval-analytics" element={<AppLayout><ApprovalAnalytics /></AppLayout>} />
            <Route path="/admin/analytics" element={<AppLayout><AnalyticsDashboard /></AppLayout>} />
            <Route path="/admin/custom-dashboard" element={<AppLayout><CustomDashboard /></AppLayout>} />
            
            {/* Operations Photo Upload */}
            <Route path="/admin/operations/:campaignId/assets/:assetId" element={<AppLayout><CampaignAssetProofs /></AppLayout>} />
            <Route path="/admin/ui-showcase" element={<AppLayout><ComponentShowcase /></AppLayout>} />
            <Route path="/admin/dashboard-builder" element={<AppLayout><DashboardBuilder /></AppLayout>} />
            
            {/* Client Portal Routes */}
            <Route path="/portal/auth" element={<MagicLinkAuth />} />
            <Route path="/portal/auth/verify" element={<MagicLinkAuth />} />
            <Route path="/portal" element={<ClientPortalProvider><ClientPortalLayout /></ClientPortalProvider>}>
              <Route path="dashboard" element={<ClientPortalDashboard />} />
              <Route path="proofs" element={<ClientPortalProofs />} />
              <Route path="payments" element={<ClientPortalPayments />} />
              <Route path="downloads" element={<ClientPortalDownloads />} />
              <Route path="campaigns/:id" element={<ClientCampaignView />} />
              <Route path="invoices" element={<ClientInvoices />} />
            </Route>
            
            {/* Access Denied */}
            <Route path="/access-denied" element={<AccessDenied />} />
            
            <Route path="/admin/tenant-analytics" element={<ProtectedRoute><AppLayout><TenantAnalytics /></AppLayout></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <InstallPrompt />
                <OfflineIndicator />
                <AIAssistantChat />
                </TooltipProvider>
              </ThemeProvider>
            </CompanyProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
