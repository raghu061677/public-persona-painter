import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MediaAssetsList from "./pages/MediaAssetsList";
import MediaAssetNew from "./pages/MediaAssetNew";
import MediaAssetDetail from "./pages/MediaAssetDetail";
import MediaAssetsMap from "./pages/MediaAssetsMap";
import ClientsList from "./pages/ClientsList";
import PlansList from "./pages/PlansList";
import PlanNew from "./pages/PlanNew";
import PlanDetail from "./pages/PlanDetail";
import PlanShare from "./pages/PlanShare";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/clients" element={<ClientsList />} />
          <Route path="/admin/media-assets" element={<MediaAssetsList />} />
          <Route path="/admin/media-assets/new" element={<MediaAssetNew />} />
          <Route path="/admin/media-assets/:id" element={<MediaAssetDetail />} />
          <Route path="/admin/media-assets-map" element={<MediaAssetsMap />} />
          <Route path="/admin/plans" element={<PlansList />} />
          <Route path="/admin/plans/new" element={<PlanNew />} />
          <Route path="/admin/plans/:id" element={<PlanDetail />} />
          <Route path="/admin/plans/:id/share/:shareToken" element={<PlanShare />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
