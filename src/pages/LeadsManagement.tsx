import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeadsKanban } from "@/components/leads/LeadsKanban";
import { LeadsList } from "@/components/leads/LeadsList";
import { LeadScoring } from "@/components/leads/LeadScoring";
import { LeadAnalytics } from "@/components/leads/LeadAnalytics";
import { LayoutGrid, List, Target, BarChart3 } from "lucide-react";

export default function LeadsManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Lead Management"
        description="Manage leads, track conversions, and automate follow-ups"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Leads" }
        ]}
      />

      <Tabs defaultValue="kanban" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2">
            <Target className="h-4 w-4" />
            Lead Scoring
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <LeadsKanban />
        </TabsContent>

        <TabsContent value="list">
          <LeadsList />
        </TabsContent>

        <TabsContent value="scoring">
          <LeadScoring />
        </TabsContent>

        <TabsContent value="analytics">
          <LeadAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
