import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MediaAssetsList from "./pages/MediaAssetsList";
import MediaAssetNew from "./pages/MediaAssetNew";
import MediaAssetDetail from "./pages/MediaAssetDetail";
import MediaAssetEdit from "./pages/MediaAssetEdit";
import MediaAssetsMap from "./pages/MediaAssetsMap";
import MediaAssetsImport from "./pages/MediaAssetsImport";
import ClientsList from "./pages/ClientsList";
import ClientAnalytics from "./pages/ClientAnalytics";
import PlansList from "./pages/PlansList";
import PlanNew from "./pages/PlanNew";
import PlanEdit from "./pages/PlanEdit";
import PlanDetail from "./pages/PlanDetail";
import PlanShare from "./pages/PlanShare";
import CampaignsList from "./pages/CampaignsList";
import CampaignDetail from "./pages/CampaignDetail";
import MobileUpload from "./pages/MobileUpload";
import FinanceDashboard from "./pages/FinanceDashboard";
import EstimationsList from "./pages/EstimationsList";
import InvoicesList from "./pages/InvoicesList";
import ExpensesList from "./pages/ExpensesList";
import ReportsDashboard from "./pages/ReportsDashboard";
import VacantMediaReport from "./pages/VacantMediaReport";
import PhotoLibrary from "./pages/PhotoLibrary";
import ImportData from "./pages/ImportData";
import ExportData from "./pages/ExportData";
import Settings from "./pages/Settings";
import CodeManagement from "./pages/CodeManagement";
import PowerBillsDashboard from "./pages/PowerBillsDashboard";
import PowerBillsAnalytics from "./pages/PowerBillsAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/plans/:id/share/:shareToken" element={<PlanShare />} />
            <Route path="/mobile/upload/:campaignId/:assetId" element={<MobileUpload />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/admin/clients" element={<AppLayout><ClientsList /></AppLayout>} />
            <Route path="/admin/clients/:id/analytics" element={<AppLayout><ClientAnalytics /></AppLayout>} />
            <Route path="/admin/media-assets" element={<AppLayout><MediaAssetsList /></AppLayout>} />
            <Route path="/admin/media-assets/new" element={<AppLayout><MediaAssetNew /></AppLayout>} />
            <Route path="/admin/media-assets/import" element={<AppLayout><MediaAssetsImport /></AppLayout>} />
            <Route path="/admin/media-assets/edit/:id" element={<AppLayout><MediaAssetEdit /></AppLayout>} />
            <Route path="/admin/media-assets/:id" element={<AppLayout><MediaAssetDetail /></AppLayout>} />
            <Route path="/admin/media-assets-map" element={<AppLayout><MediaAssetsMap /></AppLayout>} />
            <Route path="/admin/plans" element={<AppLayout><PlansList /></AppLayout>} />
            <Route path="/admin/plans/new" element={<AppLayout><PlanNew /></AppLayout>} />
            <Route path="/admin/plans/edit/:id" element={<AppLayout><PlanEdit /></AppLayout>} />
            <Route path="/admin/plans/:id" element={<AppLayout><PlanDetail /></AppLayout>} />
            <Route path="/admin/campaigns" element={<AppLayout><CampaignsList /></AppLayout>} />
            <Route path="/admin/campaigns/:id" element={<AppLayout><CampaignDetail /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
            <Route path="/finance/estimations" element={<AppLayout><EstimationsList /></AppLayout>} />
            <Route path="/finance/invoices" element={<AppLayout><InvoicesList /></AppLayout>} />
            <Route path="/finance/expenses" element={<AppLayout><ExpensesList /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><ReportsDashboard /></AppLayout>} />
            <Route path="/reports/vacant-media" element={<AppLayout><VacantMediaReport /></AppLayout>} />
            <Route path="/admin/photo-library" element={<AppLayout><PhotoLibrary /></AppLayout>} />
            <Route path="/admin/import" element={<AppLayout><ImportData /></AppLayout>} />
            <Route path="/admin/export" element={<AppLayout><ExportData /></AppLayout>} />
            <Route path="/admin/code-management" element={<AppLayout><CodeManagement /></AppLayout>} />
            <Route path="/admin/power-bills" element={<AppLayout><PowerBillsDashboard /></AppLayout>} />
            <Route path="/admin/power-bills-analytics" element={<AppLayout><PowerBillsAnalytics /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
