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
import { ModernAppLayout } from "@/layouts/ModernAppLayout";
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
const ClientEdit = lazy(() => import("./pages/ClientEdit"));
const ClientAnalytics = lazy(() => import("./pages/ClientAnalytics"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const PlansList = lazy(() => import("./pages/PlansList"));
const PlanNew = lazy(() => import("./pages/PlanNew"));
const PlanEdit = lazy(() => import("./pages/PlanEdit"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const PlanShare = lazy(() => import("./pages/PlanShare"));
const PlanTemplatesListNew = lazy(() => import("./pages/PlanTemplatesListNew"));
const PlanTemplateForm = lazy(() => import("./pages/PlanTemplateForm"));
const PlanTemplatePreview = lazy(() => import("./pages/PlanTemplatePreview"));
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
const ImportInvoices = lazy(() => import("./pages/ImportInvoices"));
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
const FixStreetViewLinks = lazy(() => import("./pages/admin/FixStreetViewLinks"));

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
            <Route path="/media-assets/new" element={<Navigate to="/admin/media-assets/new" replace />} />
            <Route path="/media-assets/:id" element={<Navigate to="/admin/media-assets/:id" replace />} />
            <Route path="/clients" element={<Navigate to="/admin/clients" replace />} />
            <Route path="/plans" element={<Navigate to="/admin/plans" replace />} />
            <Route path="/campaigns" element={<Navigate to="/admin/campaigns" replace />} />
            <Route path="/admin/settings" element={<Navigate to="/admin/company-settings" replace />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute requireAuth><ModernAppLayout><DashboardRouter /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requireAuth><ModernAppLayout><DashboardRouter /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute requireAuth><ModernAppLayout><CompaniesManagement /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/company-management" element={<ProtectedRoute requireAuth><ModernAppLayout><CompanyManagement /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/approve-companies" element={<ProtectedRoute requireAuth><ModernAppLayout><ApproveCompanies /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/company-code-settings" element={<ProtectedRoute requireAuth><ModernAppLayout><CompanyCodeSettings /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/platform" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformAdminDashboard /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/platform/users" element={<PlatformAdminGuard><ModernAppLayout><ManageUsers /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/platform/companies" element={<PlatformAdminGuard><ModernAppLayout><ManageCompanies /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/subscriptions" element={<PlatformAdminGuard><ModernAppLayout><SubscriptionManagement /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/code-management" element={<PlatformAdminGuard><ModernAppLayout><CodeManagement /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/platform-reports" element={<PlatformAdminGuard><ModernAppLayout><PlatformReports /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/migrate-data" element={<PlatformAdminGuard><ModernAppLayout><MigrateToMatrix /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/fix-streetview-links" element={<ProtectedRoute requireAuth><ModernAppLayout><FixStreetViewLinks /></ModernAppLayout></ProtectedRoute>} />
            
            {/* Duplicate route removed - see line 268 for actual company settings routes */}
            
            <Route path="/admin/company-testing" element={<ProtectedRoute requireAuth><ModernAppLayout><CompanyTesting /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/onboarding" element={<ProtectedRoute requireAuth><ModernAppLayout><OnboardingTest /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/booking-requests" element={<ProtectedRoute requireAuth><ModernAppLayout><BookingRequests /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><ClientsList /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/new" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><ModernAppLayout><ClientNew /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/edit/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="update"><ModernAppLayout><ClientEdit /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><ClientDetail /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/:id/analytics" element={<ModernAppLayout><ClientAnalytics /></ModernAppLayout>} />
            <Route path="/admin/media-assets" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsList /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/new" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><ModernAppLayout><MediaAssetNew /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/import" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><ModernAppLayout><MediaAssetsImport /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/validate" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsValidation /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/clients/import" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><ModernAppLayout><ClientsImport /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/edit/:id" element={<ProtectedRoute requiredModule="media_assets" requiredAction="update"><ModernAppLayout><MediaAssetEdit /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets/:id" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetDetail /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/media-assets-map" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsMap /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/marketplace" element={<ProtectedRoute requireAuth><ModernAppLayout><Marketplace /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/plans" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlansList /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/new" element={<ProtectedRoute requiredModule="plans" requiredAction="create"><ModernAppLayout><PlanNew /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/edit/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="update"><ModernAppLayout><PlanEdit /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/plans/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlanDetail /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/plan-templates" element={<RoleGuard requireCompanyRole="company_admin"><ModernAppLayout><PlanTemplatesListNew /></ModernAppLayout></RoleGuard>} />
            <Route path="/admin/plan-templates/new" element={<RoleGuard requireCompanyRole="company_admin"><ModernAppLayout><PlanTemplateForm /></ModernAppLayout></RoleGuard>} />
            <Route path="/admin/plan-templates/:id" element={<RoleGuard requireCompanyRole="company_admin"><ModernAppLayout><PlanTemplateForm /></ModernAppLayout></RoleGuard>} />
            <Route path="/admin/plan-templates/:id/preview" element={<RoleGuard requireCompanyRole="company_admin"><ModernAppLayout><PlanTemplatePreview /></ModernAppLayout></RoleGuard>} />
            <Route path="/admin/plans-compare" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlanComparison /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignsList /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/edit/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="update"><ModernAppLayout><CampaignEdit /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignDetail /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/campaigns/:id/budget" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignBudget /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/operations" element={<ModernAppLayout><Operations /></ModernAppLayout>} />
            <Route path="/admin/operations/creatives" element={<ModernAppLayout><OperationsCreatives /></ModernAppLayout>} />
            <Route path="/admin/operations/printing" element={<ModernAppLayout><OperationsPrinting /></ModernAppLayout>} />
            <Route path="/admin/operations/proof-uploads" element={<ModernAppLayout><OperationsProofUploads /></ModernAppLayout>} />
            <Route path="/admin/workflow-test" element={<ModernAppLayout><WorkflowTest /></ModernAppLayout>} />
            <Route path="/admin/operations-analytics" element={<ModernAppLayout><OperationsAnalytics /></ModernAppLayout>} />
            <Route path="/admin/operations-calendar" element={<ModernAppLayout><OperationsCalendar /></ModernAppLayout>} />
            <Route path="/finance" element={<ModernAppLayout><FinanceDashboard /></ModernAppLayout>} />
            <Route path="/finance/estimations" element={<ModernAppLayout><EstimationsList /></ModernAppLayout>} />
            <Route path="/admin/sales-orders" element={<ModernAppLayout><SalesOrders /></ModernAppLayout>} />
            <Route path="/admin/purchase-orders" element={<ModernAppLayout><PurchaseOrders /></ModernAppLayout>} />
            <Route path="/admin/payments" element={<ModernAppLayout><Payments /></ModernAppLayout>} />
            <Route path="/admin/reports/clients" element={<ModernAppLayout><ReportClientBookings /></ModernAppLayout>} />
            <Route path="/admin/reports/campaigns" element={<ModernAppLayout><ReportCampaignBookings /></ModernAppLayout>} />
            <Route path="/admin/reports/revenue" element={<ModernAppLayout><ReportAssetRevenue /></ModernAppLayout>} />
            <Route path="/admin/reports/financial" element={<ModernAppLayout><ReportFinancialSummary /></ModernAppLayout>} />
            <Route path="/admin/reports/proof-execution" element={<ModernAppLayout><ReportProofExecution /></ModernAppLayout>} />
            <Route path="/admin/platform-reports/company-usage" element={<ModernAppLayout><PlatformReportCompanyUsage /></ModernAppLayout>} />
            <Route path="/admin/platform-reports/billing" element={<ModernAppLayout><PlatformReportBilling /></ModernAppLayout>} />
            <Route path="/admin/platform-reports/media-inventory" element={<ModernAppLayout><PlatformReportMediaInventory /></ModernAppLayout>} />
            <Route path="/admin/platform-roles" element={<ModernAppLayout><PlatformRoles /></ModernAppLayout>} />
            <Route path="/finance/proformas" element={<ModernAppLayout><ProformasList /></ModernAppLayout>} />
            <Route path="/finance/proformas/:id" element={<ModernAppLayout><ProformaDetail /></ModernAppLayout>} />
            <Route path="/finance/invoices" element={<ModernAppLayout><InvoicesList /></ModernAppLayout>} />
            <Route path="/finance/invoices/:id" element={<ModernAppLayout><InvoiceDetail /></ModernAppLayout>} />
            <Route path="/admin/invoices" element={<ModernAppLayout><Invoices /></ModernAppLayout>} />
            <Route path="/admin/invoices/:id" element={<ModernAppLayout><InvoiceDetail /></ModernAppLayout>} />
            <Route path="/admin/invoices-import" element={<ModernAppLayout><ImportInvoices /></ModernAppLayout>} />
            <Route path="/admin/expenses" element={<ModernAppLayout><ExpensesList /></ModernAppLayout>} />
            <Route path="/finance/expenses" element={<ModernAppLayout><ExpensesList /></ModernAppLayout>} />
            <Route path="/reports" element={<ModernAppLayout><ReportsDashboard /></ModernAppLayout>} />
            <Route path="/reports/vacant-media" element={<ModernAppLayout><VacantMediaReport /></ModernAppLayout>} />
            <Route path="/admin/reports/vacant-media" element={<ModernAppLayout><VacantMediaReport /></ModernAppLayout>} />
            <Route path="/admin/ai-assistant" element={<ModernAppLayout><AIAssistant /></ModernAppLayout>} />
            <Route path="/admin/assistant" element={<ModernAppLayout><AIAssistant /></ModernAppLayout>} />
            <Route path="/admin/tenant-analytics" element={<ModernAppLayout><TenantAnalytics /></ModernAppLayout>} />
            <Route path="/admin/analytics-dashboard" element={<ModernAppLayout><AnalyticsDashboard /></ModernAppLayout>} />
            <Route path="/admin/proformas" element={<ModernAppLayout><ProformasList /></ModernAppLayout>} />
            <Route path="/admin/proformas/:id" element={<ModernAppLayout><ProformaDetail /></ModernAppLayout>} />
            <Route path="/admin/estimations" element={<ModernAppLayout><EstimationsList /></ModernAppLayout>} />
            <Route path="/admin/gallery" element={<ProtectedRoute><ModernAppLayout><PhotoGallery /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/photo-library" element={<ProtectedRoute><ModernAppLayout><PhotoGallery /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/import" element={<ModernAppLayout><ImportData /></ModernAppLayout>} />
            <Route path="/admin/export" element={<ModernAppLayout><ExportData /></ModernAppLayout>} />
            <Route path="/admin/data-export-import" element={<ModernAppLayout><DataExportImport /></ModernAppLayout>} />
            <Route path="/admin/code-management" element={<ModernAppLayout><CodeManagement /></ModernAppLayout>} />
            <Route path="/admin/power-bills" element={<ModernAppLayout><PowerBillsDashboard /></ModernAppLayout>} />
            <Route path="/admin/power-bills-analytics" element={<ModernAppLayout><PowerBillsAnalytics /></ModernAppLayout>} />
            <Route path="/admin/power-bills-bulk-payment" element={<ModernAppLayout><PowerBillsBulkPayment /></ModernAppLayout>} />
            <Route path="/admin/power-bills/bulk-upload" element={<ModernAppLayout><PowerBillsBulkUpload /></ModernAppLayout>} />
            <Route path="/admin/power-bills/reconciliation" element={<ModernAppLayout><PowerBillsReconciliation /></ModernAppLayout>} />
            <Route path="/admin/power-bills/scheduler" element={<ModernAppLayout><PowerBillsScheduler /></ModernAppLayout>} />
            <Route path="/admin/power-bills-sharing" element={<ModernAppLayout><PowerBillsSharing /></ModernAppLayout>} />
            <Route path="/admin/audit-logs" element={<ModernAppLayout><AuditLogs /></ModernAppLayout>} />
            <Route path="/admin/vendors" element={<ModernAppLayout><VendorsManagement /></ModernAppLayout>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredModule="users" requiredAction="view"><ModernAppLayout><UserManagement /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/admin/users/companies/:companyId" element={<PlatformAdminGuard><ModernAppLayout><CompanyUsersManagement /></ModernAppLayout></PlatformAdminGuard>} />
            <Route path="/admin/operations-settings" element={<ModernAppLayout><OperationsSettings /></ModernAppLayout>} />
            <Route path="/admin/organization-settings" element={<ModernAppLayout><OrganizationSettings /></ModernAppLayout>} />
            <Route path="/settings" element={<ModernAppLayout><Settings /></ModernAppLayout>} />
            <Route path="/settings/profile" element={<ProtectedRoute requireAuth><ModernAppLayout><ProfileSettings /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/settings/theme" element={<ProtectedRoute requireAuth><ModernAppLayout><ThemeSettings /></ModernAppLayout></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute requireAuth><ModernAppLayout><NotificationSettings /></ModernAppLayout></ProtectedRoute>} />
            
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
            
            <Route path="/admin/approval-settings" element={<ModernAppLayout><ApprovalSettings /></ModernAppLayout>} />
            <Route path="/admin/approval-delegation" element={<ModernAppLayout><ApprovalDelegation /></ModernAppLayout>} />
            <Route path="/admin/approval-analytics" element={<ModernAppLayout><ApprovalAnalytics /></ModernAppLayout>} />
            <Route path="/admin/analytics" element={<ModernAppLayout><AnalyticsDashboard /></ModernAppLayout>} />
            <Route path="/admin/custom-dashboard" element={<ModernAppLayout><CustomDashboard /></ModernAppLayout>} />
            
            {/* Operations Photo Upload */}
            <Route path="/admin/operations/:campaignId/assets/:assetId" element={<ModernAppLayout><CampaignAssetProofs /></ModernAppLayout>} />
            <Route path="/admin/ui-showcase" element={<ModernAppLayout><ComponentShowcase /></ModernAppLayout>} />
            <Route path="/admin/dashboard-builder" element={<ModernAppLayout><DashboardBuilder /></ModernAppLayout>} />
            
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
            
            <Route path="/admin/tenant-analytics" element={<ProtectedRoute><ModernAppLayout><TenantAnalytics /></ModernAppLayout></ProtectedRoute>} />
            
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
