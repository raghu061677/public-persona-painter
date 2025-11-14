import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MediaAssetsList from "./pages/MediaAssetsList";
import MediaAssetNew from "./pages/MediaAssetNew";
import MediaAssetDetail from "./pages/MediaAssetDetail";
import MediaAssetEdit from "./pages/MediaAssetEdit";
import MediaAssetsMap from "./pages/MediaAssetsMap";
import MediaAssetsImport from "./pages/MediaAssetsImport";
import MediaAssetsValidation from "./pages/MediaAssetsValidation";
import TenantAnalytics from "./pages/TenantAnalytics";
import ClientsImport from "./pages/ClientsImport";
import ClientsList from "./pages/ClientsList";
import ClientNew from "./pages/ClientNew";
import ClientAnalytics from "./pages/ClientAnalytics";
import ClientDetail from "./pages/ClientDetail";
import PlansList from "./pages/PlansList";
import PlanNew from "./pages/PlanNew";
import PlanEdit from "./pages/PlanEdit";
import PlanDetail from "./pages/PlanDetail";
import PlanShare from "./pages/PlanShare";
import CampaignsList from "./pages/CampaignsList";
import CampaignDetail from "./pages/CampaignDetail";
import CampaignEdit from "./pages/CampaignEdit";
import CampaignBudget from "./pages/CampaignBudget";
import MobileUpload from "./pages/MobileUpload";
import MobileOpsUpload from "./pages/MobileOpsUpload";
import CampaignAssetProofs from "./pages/CampaignAssetProofs";
import MobileFieldApp from "./pages/MobileFieldApp";
import MobilePowerBills from "./pages/MobilePowerBills";
import FinanceDashboard from "./pages/FinanceDashboard";
import EstimationsList from "./pages/EstimationsList";
import InvoicesList from "./pages/InvoicesList";
import InvoiceDetail from "./pages/InvoiceDetail";
import ExpensesList from "./pages/ExpensesList";
import ReportsDashboard from "./pages/ReportsDashboard";
import VacantMediaReport from "./pages/VacantMediaReport";
import PhotoGallery from "./pages/PhotoGallery";
import ImportData from "./pages/ImportData";
import ExportData from "./pages/ExportData";
import UserManagement from "./pages/UserManagement";
import CodeManagement from "./pages/CodeManagement";
import PowerBillsDashboard from "./pages/PowerBillsDashboard";
import PowerBillsAnalytics from "./pages/PowerBillsAnalytics";
import PowerBillsBulkPayment from "./pages/PowerBillsBulkPayment";
import PowerBillsBulkUpload from "./pages/PowerBillsBulkUpload";
import PowerBillsReconciliation from "./pages/PowerBillsReconciliation";
import PowerBillsSharing from "./pages/PowerBillsSharing";
import PowerBillsScheduler from "./pages/PowerBillsScheduler";
import AuditLogs from "./pages/AuditLogs";
import ApprovalSettings from "./pages/ApprovalSettings";
import ApprovalDelegation from "./pages/ApprovalDelegation";
import ApprovalAnalytics from "./pages/ApprovalAnalytics";
import VendorsManagement from "./pages/VendorsManagement";
import Settings from "./pages/Settings";
import ProfileSettings from "./pages/ProfileSettings";
import ClientPortalAuth from "./pages/ClientPortalAuth";
import OrganizationSettings from "./pages/OrganizationSettings";
import OperationsSettings from "./pages/OperationsSettings";
import Operations from "./pages/Operations";
import OperationsCalendar from "./pages/OperationsCalendar";
import OperationsAnalytics from "./pages/OperationsAnalytics";
import MobileOperations from "./pages/MobileOperations";
import PlanComparison from "./pages/PlanComparison";
import ProformasList from "./pages/ProformasList";
import ProformaDetail from "./pages/ProformaDetail";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import ComponentShowcase from "./pages/ComponentShowcase";
import DashboardBuilder from "./pages/DashboardBuilder";
import DataExportImport from "./pages/DataExportImport";
import CompanyOnboarding from "./pages/CompanyOnboarding";
import CompaniesManagement from "./pages/CompaniesManagement";
import CompanyTesting from "./pages/CompanyTesting";
import Marketplace from "./pages/Marketplace";
import BookingRequests from "./pages/BookingRequests";
import ClientPortalDashboard from "./pages/ClientPortalDashboard";
import ClientCampaignView from "./pages/ClientCampaignView";
import ClientInvoices from "./pages/ClientInvoices";
import AccessDenied from "./pages/AccessDenied";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />
            <Route path="/install" element={<Install />} />
            <Route path="/admin/plans/:id/share/:shareToken" element={<PlanShare />} />
            <Route path="/mobile/field-app" element={<MobileFieldApp />} />
            <Route path="/mobile/upload/:campaignId/:assetId" element={<MobileUpload />} />
            <Route path="/mobile/upload" element={<MobileOpsUpload />} />
            <Route path="/mobile/power-bills" element={<MobilePowerBills />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute requireAuth><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requireAuth><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/companies" element={<ProtectedRoute requireAuth><AppLayout><CompaniesManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/company-testing" element={<ProtectedRoute requireAuth><AppLayout><CompanyTesting /></AppLayout></ProtectedRoute>} />
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
            <Route path="/marketplace" element={<ProtectedRoute requireAuth><AppLayout><Marketplace /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/booking-requests" element={<ProtectedRoute requireAuth><AppLayout><BookingRequests /></AppLayout></ProtectedRoute>} />
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
            <Route path="/admin/operations-analytics" element={<AppLayout><OperationsAnalytics /></AppLayout>} />
            <Route path="/admin/operations-calendar" element={<AppLayout><OperationsCalendar /></AppLayout>} />
            <Route path="/admin/mobile-operations" element={<MobileOperations />} />
            <Route path="/admin/mobile-upload" element={<AppLayout><MobileFieldApp /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
            <Route path="/finance/estimations" element={<AppLayout><EstimationsList /></AppLayout>} />
            <Route path="/finance/proformas" element={<AppLayout><ProformasList /></AppLayout>} />
            <Route path="/finance/proformas/:id" element={<AppLayout><ProformaDetail /></AppLayout>} />
            <Route path="/finance/invoices" element={<AppLayout><InvoicesList /></AppLayout>} />
            <Route path="/finance/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />
            <Route path="/finance/expenses" element={<AppLayout><ExpensesList /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsDashboard /></AppLayout>} />
            <Route path="/reports/vacant-media" element={<AppLayout><VacantMediaReport /></AppLayout>} />
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
            <Route path="/admin/operations-settings" element={<AppLayout><OperationsSettings /></AppLayout>} />
            <Route path="/admin/organization-settings" element={<AppLayout><OrganizationSettings /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/settings/profile" element={<ProtectedRoute requireAuth><AppLayout><ProfileSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/approval-settings" element={<AppLayout><ApprovalSettings /></AppLayout>} />
            <Route path="/admin/approval-delegation" element={<AppLayout><ApprovalDelegation /></AppLayout>} />
            <Route path="/admin/approval-analytics" element={<AppLayout><ApprovalAnalytics /></AppLayout>} />
            
            {/* Operations Photo Upload */}
            <Route path="/admin/operations/:campaignId/assets/:assetId" element={<AppLayout><CampaignAssetProofs /></AppLayout>} />
            <Route path="/admin/ui-showcase" element={<AppLayout><ComponentShowcase /></AppLayout>} />
            <Route path="/admin/dashboard-builder" element={<AppLayout><DashboardBuilder /></AppLayout>} />
            
            {/* Client Portal Routes */}
          <Route path="/portal/auth" element={<ClientPortalAuth />} />
          <Route path="/portal/dashboard" element={<ClientPortalDashboard />} />
          <Route path="/portal/campaigns/:id" element={<ClientCampaignView />} />
          <Route path="/portal/invoices" element={<ClientInvoices />} />
            
            {/* Access Denied */}
            <Route path="/access-denied" element={<AccessDenied />} />
            
            <Route path="/admin/tenant-analytics" element={<ProtectedRoute><AppLayout><TenantAnalytics /></AppLayout></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
