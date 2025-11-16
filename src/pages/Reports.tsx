import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { VacantMediaReport } from "@/components/reports/VacantMediaReport";
import { RevenueAnalytics } from "@/components/reports/RevenueAnalytics";
import { OccupancyReport } from "@/components/reports/OccupancyReport";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";
import { MapPin, TrendingUp, PieChart, Settings } from "lucide-react";

export default function Reports() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive business intelligence and performance metrics"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Reports" }
        ]}
      />

      <Tabs defaultValue="vacant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vacant" className="gap-2">
            <MapPin className="h-4 w-4" />
            Vacant Media
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="gap-2">
            <PieChart className="h-4 w-4" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Settings className="h-4 w-4" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacant">
          <VacantMediaReport />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="occupancy">
          <OccupancyReport />
        </TabsContent>

        <TabsContent value="custom">
          <CustomReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
