import { DashboardBuilder as DashboardBuilderComponent } from "@/components/dashboard/DashboardBuilder";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ROUTES, ROUTE_LABELS } from "@/config/routes";

export default function DashboardBuilder() {
  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title={ROUTE_LABELS[ROUTES.DASHBOARD_BUILDER]}
        description="Customize your dashboard layout with widgets and analytics"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Tools", path: ROUTES.DASHBOARD },
          { label: "Dashboard Builder" }
        ]}
      />
      <DashboardBuilderComponent layoutId="custom-dashboard" />
    </PageContainer>
  );
}
