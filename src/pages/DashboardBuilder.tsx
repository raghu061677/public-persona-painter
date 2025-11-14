import { DashboardBuilder as DashboardBuilderComponent } from "@/components/dashboard/DashboardBuilder";
import { PageContainer } from "@/components/ui/page-container";

export default function DashboardBuilder() {
  return (
    <PageContainer maxWidth="full">
      <DashboardBuilderComponent layoutId="custom-dashboard" />
    </PageContainer>
  );
}
