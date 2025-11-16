import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoicesList } from "@/components/finance/InvoicesList";
import { ExpensesList } from "@/components/finance/ExpensesList";
import { PaymentsDashboard } from "@/components/finance/PaymentsDashboard";
import { AgingReport } from "@/components/finance/AgingReport";
import { FileText, Receipt, CreditCard, TrendingUp } from "lucide-react";

export default function Finance() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Finance & Billing"
        description="Manage invoices, expenses, payments, and financial reports"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Finance" }
        ]}
      />

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="aging" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Aging Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesList />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesList />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsDashboard />
        </TabsContent>

        <TabsContent value="aging">
          <AgingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
