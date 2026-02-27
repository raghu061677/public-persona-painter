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
import { AdminAuthGate } from "@/components/auth/AdminAuthGate";
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
const MediaAssetsHealthReport = lazy(() => import("./pages/MediaAssetsHealthReport"));
// TenantAnalytics removed — redirect to analytics-dashboard
const ClientsImport = lazy(() => import("./pages/ClientsImport"));
const ClientsList = lazy(() => import("./pages/ClientsList"));
const ClientNew = lazy(() => import("./pages/ClientNew"));
const ClientEdit = lazy(() => import("./pages/ClientEdit"));
const ClientAnalytics = lazy(() => import("./pages/ClientAnalytics"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const LeadsList = lazy(() => import("./pages/LeadsList"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const LeadNew = lazy(() => import("./pages/LeadNew"));
const PlansList = lazy(() => import("./pages/PlansList"));
const PlanNew = lazy(() => import("./pages/PlanNew"));
const PlanEdit = lazy(() => import("./pages/PlanEdit"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const PlanShare = lazy(() => import("./pages/PlanShare"));
// Removed Plan Templates feature
const ApprovalsQueue = lazy(() => import("./pages/approvals/ApprovalsQueue"));
const ApprovalHistory = lazy(() => import("./pages/approvals/ApprovalHistory"));
const ApprovalRulesSettings = lazy(() => import("./pages/approvals/ApprovalRulesSettings"));
const CampaignsList = lazy(() => import("./pages/CampaignsList"));
const CampaignCreate = lazy(() => import("./pages/CampaignCreate"));
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
const InvoiceCreate = lazy(() => import("./pages/InvoiceCreate"));
const Invoices = lazy(() => import("./pages/Invoices"));
const ExpensesList = lazy(() => import("./pages/ExpensesList"));
const SalesOrders = lazy(() => import("./pages/SalesOrders"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Payments = lazy(() => import("./pages/PaymentsControlCenter"));
const OperationsCreatives = lazy(() => import("./pages/OperationsCreatives"));
const OperationsPrinting = lazy(() => import("./pages/OperationsPrinting"));
const OperationsProofUploads = lazy(() => import("./pages/OperationsProofUploads"));
const ReportClientBookings = lazy(() => import("./pages/ReportClientBookings"));
const ReportCampaignBookings = lazy(() => import("./pages/ReportCampaignBookingsV2"));
const ReportAssetRevenue = lazy(() => import("./pages/RevenueControlCenter"));
const ReportFinancialSummary = lazy(() => import("./pages/ReportFinancialSummary"));
const ReportProofExecution = lazy(() => import("./pages/ReportProofExecution"));
const ReportAging = lazy(() => import("./pages/ReportAging"));
const ReportOutstanding = lazy(() => import("./pages/ReportOutstanding"));
const ReportBookedMedia = lazy(() => import("./pages/ReportBookedMedia"));
const ReportMonthlyCampaigns = lazy(() => import("./pages/ReportMonthlyCampaigns"));
const PlatformReportCompanyUsage = lazy(() => import("./pages/PlatformReportCompanyUsage"));
const PlatformReportBilling = lazy(() => import("./pages/PlatformReportBilling"));
const PlatformReportMediaInventory = lazy(() => import("./pages/PlatformReportMediaInventory"));
const PlatformRoles = lazy(() => import("./pages/PlatformRoles"));
const ReportsDashboard = lazy(() => import("./pages/ReportsDashboard"));
const VacantMediaReport = lazy(() => import("./pages/VacantMediaReport"));
const AssetProfitabilityReport = lazy(() => import("./pages/AssetProfitabilityReport"));
const ReportCampaignProfitability = lazy(() => import("./pages/ReportCampaignProfitability"));
const ReportOOHRevenue = lazy(() => import("./pages/ReportOOHRevenue"));
const ReportOOHKPIs = lazy(() => import("./pages/ReportOOHKPIs"));
const ReportCashFlowForecast = lazy(() => import("./pages/ReportCashFlowForecast"));
const ReportConcessionRisk = lazy(() => import("./pages/ReportConcessionRisk"));
const ReportExecutiveDashboard = lazy(() => import("./pages/ReportExecutiveDashboard"));
const ReportExpenseAllocation = lazy(() => import("./pages/ReportExpenseAllocation"));
const MediaAvailabilityReport = lazy(() => import("./pages/admin/reports/MediaAvailabilityReport"));
const PhotoGallery = lazy(() => import("./pages/PhotoGallery"));
// ImportData and ExportData removed — redirect to data-export-import
// const ImportData = lazy(() => import("./pages/ImportData"));
// const ExportData = lazy(() => import("./pages/ExportData"));
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
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalInvoices = lazy(() => import("./pages/portal/PortalInvoices"));
const PortalInvoiceDetail = lazy(() => import("./pages/portal/PortalInvoiceDetail"));
const PortalReceipts = lazy(() => import("./pages/portal/PortalReceipts"));
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
// ComponentShowcase, DashboardBuilder removed — dev/test pages
// const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
// const DashboardBuilder = lazy(() => import("./pages/DashboardBuilder"));
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
// CompanyTesting, OnboardingTest removed — test pages
// const CompanyTesting = lazy(() => import("./pages/CompanyTesting"));
const CompanyManagement = lazy(() => import("./pages/CompanyManagement"));
// const OnboardingTest = lazy(() => import("./pages/OnboardingTest"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceAssetDetail = lazy(() => import("./pages/MarketplaceAssetDetail"));
const CompanyUsersSettings = lazy(() => import("./pages/CompanyUsersSettings"));
const CompanyCodeSettings = lazy(() => import("./pages/CompanyCodeSettings"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
// CustomDashboard removed — placeholder
// const CustomDashboard = lazy(() => import("./pages/CustomDashboard"));
const BookingRequests = lazy(() => import("./pages/BookingRequests"));
const ClientPortalDashboard = lazy(() => import("./pages/ClientPortalDashboard"));
const ClientPortalProofs = lazy(() => import("./pages/ClientPortalProofs"));
const ClientPortalPayments = lazy(() => import("./pages/ClientPortalPayments"));
const ClientPortalDownloads = lazy(() => import("./pages/ClientPortalDownloads"));
// WorkflowTest removed — test page
// const WorkflowTest = lazy(() => import("./pages/WorkflowTest"));
const ClientCampaignView = lazy(() => import("./pages/ClientCampaignView"));
const ClientInvoices = lazy(() => import("./pages/ClientInvoices"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const ManageUsers = lazy(() => import("./pages/platform/ManageUsers"));
const ManageCompanies = lazy(() => import("./pages/platform/ManageCompanies"));
const SubscriptionManagement = lazy(() => import("./pages/SubscriptionManagement"));
const MigrateToMatrix = lazy(() => import("./pages/MigrateToMatrix"));
const FixStreetViewLinks = lazy(() => import("./pages/admin/FixStreetViewLinks"));
const OperationsDashboard = lazy(() => import("./pages/OperationsDashboard"));
const PublicCampaignTracking = lazy(() => import("./pages/PublicCampaignTracking"));
const MounterTasks = lazy(() => import("./pages/MounterTasks"));
const OperationDetail = lazy(() => import("./pages/OperationDetail"));
const CampaignAssetsRedirect = lazy(() => import("./pages/CampaignAssetsRedirect"));
const InventoryUtilization = lazy(() => import("./pages/InventoryUtilization"));
const RevenueForecast = lazy(() => import("./pages/RevenueForecast"));
const MediaAssetDuplicates = lazy(() => import("./pages/admin/MediaAssetDuplicates"));
const PaymentConfirmations = lazy(() => import("./pages/PaymentConfirmations"));
const AlertsSettings = lazy(() => import("./pages/AlertsSettings"));

// Public website pages
const PublicAbout = lazy(() => import("./pages/public/About"));
const PublicOurStory = lazy(() => import("./pages/public/OurStory"));
const PublicTeam = lazy(() => import("./pages/public/Team"));
const PublicCareersAndFeatures = lazy(() => import("./pages/public/CareersAndFeatures"));
const PublicCampaignPlanning = lazy(() => import("./pages/public/CampaignPlanning"));
const PublicAssetManagement = lazy(() => import("./pages/public/AssetManagement"));
const PublicProofAndContact = lazy(() => import("./pages/public/ProofAndContact"));
const PublicSupport = lazy(() => import("./pages/public/Support"));
const PublicSales = lazy(() => import("./pages/public/Sales"));
const PublicPartners = lazy(() => import("./pages/public/Partners"));

// Optimized Query Client with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes  
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Prevent refetch on component mount
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
      <BrowserRouter>
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
            <Route path="/campaign-track/:token" element={<PublicLayout><PublicCampaignTracking /></PublicLayout>} />
            <Route path="/mounter/tasks" element={<ProtectedRoute requireAuth><PublicLayout><MounterTasks /></PublicLayout></ProtectedRoute>} />
            <Route path="/mobile/*" element={<MobilePage />} />
            
            {/* Public website pages */}
            <Route path="/about" element={<PublicLayout><PublicAbout /></PublicLayout>} />
            <Route path="/our-story" element={<PublicLayout><PublicOurStory /></PublicLayout>} />
            <Route path="/team" element={<PublicLayout><PublicTeam /></PublicLayout>} />
            <Route path="/careers" element={<PublicLayout><PublicCareersAndFeatures /></PublicLayout>} />
            <Route path="/campaign-planning" element={<PublicLayout><PublicCampaignPlanning /></PublicLayout>} />
            <Route path="/asset-management" element={<PublicLayout><PublicAssetManagement /></PublicLayout>} />
            <Route path="/proof-collection" element={<PublicLayout><PublicProofAndContact /></PublicLayout>} />
            <Route path="/support" element={<PublicLayout><PublicSupport /></PublicLayout>} />
            <Route path="/sales" element={<PublicLayout><PublicSales /></PublicLayout>} />
            <Route path="/partners" element={<PublicLayout><PublicPartners /></PublicLayout>} />
            
            {/* Redirect common paths to their correct /admin prefixed routes */}
            <Route path="/media-assets" element={<Navigate to="/admin/media-assets" replace />} />
            <Route path="/media-assets/new" element={<Navigate to="/admin/media-assets/new" replace />} />
            <Route path="/media-assets/:code" element={<Navigate to="/admin/media-assets/:code" replace />} />
            <Route path="/clients" element={<Navigate to="/admin/clients" replace />} />
            <Route path="/plans" element={<Navigate to="/admin/plans" replace />} />
            <Route path="/campaigns" element={<Navigate to="/admin/campaigns" replace />} />
            {/* Bare /admin/reports → financial summary */}
            <Route path="/admin/reports" element={<Navigate to="/admin/reports/financial" replace />} />
            
            {/* ===== GLOBAL ADMIN AUTH GATE — all /admin/* routes require authentication ===== */}
            <Route path="/admin" element={<AdminAuthGate />}>
              {/* Redirect /admin to /admin/dashboard */}
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="settings" element={<Navigate to="/admin/company-settings" replace />} />
              {/* /admin/reports redirect handled as top-level route above */}
              
              {/* Dashboard */}
              <Route path="dashboard" element={<ProtectedRoute requireAuth><ModernAppLayout><DashboardRouter /></ModernAppLayout></ProtectedRoute>} />
              <Route path="companies" element={<ProtectedRoute requireAuth><ModernAppLayout><CompaniesManagement /></ModernAppLayout></ProtectedRoute>} />
              <Route path="company-management" element={<ProtectedRoute requireAuth><ModernAppLayout><CompanyManagement /></ModernAppLayout></ProtectedRoute>} />
              <Route path="approve-companies" element={<ProtectedRoute requireAuth><ModernAppLayout><ApproveCompanies /></ModernAppLayout></ProtectedRoute>} />
              <Route path="company-code-settings" element={<ProtectedRoute requireAuth><ModernAppLayout><CompanyCodeSettings /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformAdminDashboard /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform/users" element={<PlatformAdminGuard><ModernAppLayout><ManageUsers /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="platform/companies" element={<PlatformAdminGuard><ModernAppLayout><ManageCompanies /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="subscriptions" element={<PlatformAdminGuard><ModernAppLayout><SubscriptionManagement /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="code-management" element={<PlatformAdminGuard><ModernAppLayout><CodeManagement /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="platform-reports" element={<PlatformAdminGuard><ModernAppLayout><PlatformReports /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="migrate-data" element={<PlatformAdminGuard><ModernAppLayout><MigrateToMatrix /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="fix-streetview-links" element={<ProtectedRoute requireAuth><ModernAppLayout><FixStreetViewLinks /></ModernAppLayout></ProtectedRoute>} />
              
              {/* Dead test routes — redirect to dashboard */}
              <Route path="company-testing" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="onboarding" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="booking-requests" element={<ProtectedRoute requireAuth><ModernAppLayout><BookingRequests /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><ClientsList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/new" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><ModernAppLayout><ClientNew /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/edit/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="update"><ModernAppLayout><ClientEdit /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><ClientDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/:id/overview" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><ClientDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/:id/analytics" element={<ProtectedRoute requireAuth><ModernAppLayout><ClientAnalytics /></ModernAppLayout></ProtectedRoute>} />
              <Route path="leads" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><LeadsList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="leads/new" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><ModernAppLayout><LeadNew /></ModernAppLayout></ProtectedRoute>} />
              <Route path="leads/:id" element={<ProtectedRoute requiredModule="clients" requiredAction="view"><ModernAppLayout><LeadDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/new" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><ModernAppLayout><MediaAssetNew /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/import" element={<ProtectedRoute requiredModule="media_assets" requiredAction="create"><ModernAppLayout><MediaAssetsImport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/validate" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsValidation /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/duplicates" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetDuplicates /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets-validation" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsValidation /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets-health" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsHealthReport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="clients/import" element={<ProtectedRoute requiredModule="clients" requiredAction="create"><ModernAppLayout><ClientsImport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/edit/:code" element={<ProtectedRoute requiredModule="media_assets" requiredAction="update"><ModernAppLayout><MediaAssetEdit /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets/:code" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="media-assets-map" element={<ProtectedRoute requiredModule="media_assets" requiredAction="view"><ModernAppLayout><MediaAssetsMap /></ModernAppLayout></ProtectedRoute>} />
              <Route path="marketplace" element={<ProtectedRoute requireAuth><ModernAppLayout><Marketplace /></ModernAppLayout></ProtectedRoute>} />
              <Route path="plans" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlansList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="plans/new" element={<ProtectedRoute requiredModule="plans" requiredAction="create"><ModernAppLayout><PlanNew /></ModernAppLayout></ProtectedRoute>} />
              <Route path="plans/edit/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="update"><ModernAppLayout><PlanEdit /></ModernAppLayout></ProtectedRoute>} />
              <Route path="plans/:id" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlanDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="plans-compare" element={<ProtectedRoute requiredModule="plans" requiredAction="view"><ModernAppLayout><PlanComparison /></ModernAppLayout></ProtectedRoute>} />
              <Route path="campaigns" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignsList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="campaigns/create" element={<ProtectedRoute requiredModule="campaigns" requiredAction="create"><ModernAppLayout><CampaignCreate /></ModernAppLayout></ProtectedRoute>} />
              <Route path="campaigns/edit/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="update"><ModernAppLayout><CampaignEdit /></ModernAppLayout></ProtectedRoute>} />
              <Route path="campaigns/:id" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="campaigns/:id/budget" element={<ProtectedRoute requiredModule="campaigns" requiredAction="view"><ModernAppLayout><CampaignBudget /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsDashboard /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/:id" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/:campaignId/assets/:assetId" element={<ProtectedRoute requireAuth><ModernAppLayout><CampaignAssetProofs /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/:campaignId/assets" element={<ProtectedRoute requireAuth><ModernAppLayout><CampaignAssetsRedirect /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/creatives" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsCreatives /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/printing" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsPrinting /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations/proof-uploads" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsProofUploads /></ModernAppLayout></ProtectedRoute>} />
              <Route path="workflow-test" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="operations-analytics" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsAnalytics /></ModernAppLayout></ProtectedRoute>} />
              <Route path="operations-calendar" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsCalendar /></ModernAppLayout></ProtectedRoute>} />
              <Route path="sales-orders" element={<ProtectedRoute requireAuth><ModernAppLayout><SalesOrders /></ModernAppLayout></ProtectedRoute>} />
              <Route path="purchase-orders" element={<ProtectedRoute requireAuth><ModernAppLayout><PurchaseOrders /></ModernAppLayout></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute requireAuth><ModernAppLayout><Payments /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/client-bookings" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportClientBookings /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/clients" element={<Navigate to="/admin/reports/client-bookings" replace />} />
              <Route path="reports/campaigns" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportCampaignBookings /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/revenue" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportAssetRevenue /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/financial" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportFinancialSummary /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/proof-execution" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportProofExecution /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/aging" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportAging /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/outstanding" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportOutstanding /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/booked-media" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportBookedMedia /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/monthly-campaigns" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportMonthlyCampaigns /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform-reports/company-usage" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformReportCompanyUsage /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform-reports/billing" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformReportBilling /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform-reports/media-inventory" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformReportMediaInventory /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform-roles" element={<ProtectedRoute requireAuth><ModernAppLayout><PlatformRoles /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/vacant-media" element={<ProtectedRoute requireAuth><ModernAppLayout><MediaAvailabilityReport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/availability" element={<ProtectedRoute requireAuth><ModernAppLayout><MediaAvailabilityReport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/profitability" element={<ProtectedRoute requireAuth><ModernAppLayout><AssetProfitabilityReport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/campaign-profitability" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportCampaignProfitability /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/ooh-revenue" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportOOHRevenue /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/ooh-kpis" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportOOHKPIs /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/cashflow-forecast" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportCashFlowForecast /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/concession-risk" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportConcessionRisk /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/executive" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportExecutiveDashboard /></ModernAppLayout></ProtectedRoute>} />
              <Route path="reports/expense-allocation" element={<ProtectedRoute requireAuth><ModernAppLayout><ReportExpenseAllocation /></ModernAppLayout></ProtectedRoute>} />
              <Route path="approvals" element={<ProtectedRoute requireAuth><ModernAppLayout><ApprovalsQueue /></ModernAppLayout></ProtectedRoute>} />
              <Route path="approval-history" element={<ProtectedRoute requireAuth><ModernAppLayout><ApprovalHistory /></ModernAppLayout></ProtectedRoute>} />
              <Route path="approvals/rules" element={<RoleGuard requireCompanyRole="company_admin"><ModernAppLayout><ApprovalRulesSettings /></ModernAppLayout></RoleGuard>} />
              <Route path="ai-assistant" element={<ProtectedRoute requireAuth><ModernAppLayout><AIAssistant /></ModernAppLayout></ProtectedRoute>} />
              <Route path="assistant" element={<Navigate to="/admin/ai-assistant" replace />} />
              <Route path="tenant-analytics" element={<Navigate to="/admin/analytics-dashboard" replace />} />
              <Route path="analytics-dashboard" element={<ProtectedRoute requireAuth><ModernAppLayout><AnalyticsDashboard /></ModernAppLayout></ProtectedRoute>} />
              <Route path="analytics/inventory" element={<ProtectedRoute requireAuth><ModernAppLayout><InventoryUtilization /></ModernAppLayout></ProtectedRoute>} />
              <Route path="analytics/revenue-forecast" element={<Navigate to="/admin/reports/revenue?tab=forecast" replace />} />
              <Route path="proformas" element={<ProtectedRoute requireAuth><ModernAppLayout><ProformasList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="proformas/:id" element={<ProtectedRoute requireAuth><ModernAppLayout><ProformaDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="estimations" element={<ProtectedRoute requireAuth><ModernAppLayout><EstimationsList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="gallery" element={<Navigate to="/admin/photo-library" replace />} />
              <Route path="photo-library" element={<ProtectedRoute requireAuth><ModernAppLayout><PhotoGallery /></ModernAppLayout></ProtectedRoute>} />
              <Route path="import" element={<Navigate to="/admin/data-export-import" replace />} />
              <Route path="export" element={<Navigate to="/admin/data-export-import" replace />} />
              <Route path="data-export-import" element={<ProtectedRoute requireAuth><ModernAppLayout><DataExportImport /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsDashboard /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills-analytics" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsAnalytics /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills-bulk-payment" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsBulkPayment /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills/bulk-upload" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsBulkUpload /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills/reconciliation" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsReconciliation /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills/scheduler" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsScheduler /></ModernAppLayout></ProtectedRoute>} />
              <Route path="power-bills-sharing" element={<ProtectedRoute requireAuth><ModernAppLayout><PowerBillsSharing /></ModernAppLayout></ProtectedRoute>} />
              <Route path="audit-logs" element={<ProtectedRoute requireAuth><ModernAppLayout><AuditLogs /></ModernAppLayout></ProtectedRoute>} />
              <Route path="vendors" element={<ProtectedRoute requireAuth><ModernAppLayout><VendorsManagement /></ModernAppLayout></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute requiredModule="users" requiredAction="view"><ModernAppLayout><UserManagement /></ModernAppLayout></ProtectedRoute>} />
              <Route path="users/companies/:companyId" element={<PlatformAdminGuard><ModernAppLayout><CompanyUsersManagement /></ModernAppLayout></PlatformAdminGuard>} />
              <Route path="operations-settings" element={<ProtectedRoute requireAuth><ModernAppLayout><OperationsSettings /></ModernAppLayout></ProtectedRoute>} />
              <Route path="organization-settings" element={<Navigate to="/admin/company-settings" replace />} />
              <Route path="invoices" element={<ProtectedRoute requireAuth><ModernAppLayout><InvoicesList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="invoices/new" element={<ProtectedRoute requireAuth><ModernAppLayout><InvoiceCreate /></ModernAppLayout></ProtectedRoute>} />
              <Route path="invoices/view/:encodedId" element={<ProtectedRoute requireAuth><ModernAppLayout><InvoiceDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="invoices/:id" element={<ProtectedRoute requireAuth><ModernAppLayout><InvoiceDetail /></ModernAppLayout></ProtectedRoute>} />
              <Route path="invoices-import" element={<ProtectedRoute requireAuth><ModernAppLayout><ImportInvoices /></ModernAppLayout></ProtectedRoute>} />
              <Route path="payment-reminders" element={<Navigate to="/admin/invoices" replace />} />
              <Route path="payment-confirmations" element={<Navigate to="/admin/payments?tab=confirmations" replace />} />
              <Route path="expenses" element={<ProtectedRoute requireAuth><ModernAppLayout><ExpensesList /></ModernAppLayout></ProtectedRoute>} />
              <Route path="platform-admin-setup" element={<ProtectedRoute requireAuth><PlatformAdminSetup /></ProtectedRoute>} />
              <Route path="approval-settings" element={<Navigate to="/admin/approvals/rules" replace />} />
              <Route path="approval-delegation" element={<ProtectedRoute requireAuth><ModernAppLayout><ApprovalDelegation /></ModernAppLayout></ProtectedRoute>} />
              <Route path="approval-analytics" element={<ProtectedRoute requireAuth><ModernAppLayout><ApprovalAnalytics /></ModernAppLayout></ProtectedRoute>} />
              <Route path="analytics" element={<Navigate to="/admin/analytics-dashboard" replace />} />
              {/* Dead test/placeholder routes — redirect */}
              <Route path="custom-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="ui-showcase" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard-builder" element={<Navigate to="/admin/dashboard" replace />} />
              
              {/* Company Settings with SettingsLayout */}
              <Route path="company-settings" element={<ProtectedRoute requireAuth><SettingsLayout /></ProtectedRoute>}>
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
                <Route path="alerts" element={<AlertsSettings />} />
              </Route>
            </Route>
            {/* ===== END GLOBAL ADMIN AUTH GATE ===== */}
            
            {/* Client Portal Routes */}
            <Route path="/portal/auth" element={<MagicLinkAuth />} />
            <Route path="/portal/auth/verify" element={<MagicLinkAuth />} />
            <Route path="/portal" element={<ClientPortalProvider><ClientPortalLayout /></ClientPortalProvider>}>
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="proofs" element={<ClientPortalProofs />} />
              <Route path="payments" element={<ClientPortalPayments />} />
              <Route path="downloads" element={<ClientPortalDownloads />} />
              <Route path="campaigns/:id" element={<ClientCampaignView />} />
              <Route path="invoices" element={<PortalInvoices />} />
              <Route path="invoices/:invoiceId" element={<PortalInvoiceDetail />} />
              <Route path="receipts" element={<PortalReceipts />} />
            </Route>
            
            {/* Access Denied */}
            <Route path="/access-denied" element={<AccessDenied />} />
            
            
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
