import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ColorLegend() {
  const colorMeanings = [
    {
      color: "Blue",
      borderClass: "border-l-4 border-l-blue-500",
      usage: "Client Information, Contact Details, User Data",
      examples: ["Client cards in plans", "Customer profiles", "Revenue metrics"],
    },
    {
      color: "Green",
      borderClass: "border-l-4 border-l-green-500",
      usage: "Campaign Period, Time-related Data, Active Status",
      examples: ["Campaign timelines", "Active campaigns", "Completion metrics"],
    },
    {
      color: "Orange",
      borderClass: "border-l-4 border-l-orange-500",
      usage: "Financial Summary, Pricing, Outstanding Amounts",
      examples: ["Grand totals", "Outstanding payments", "Bottleneck alerts"],
    },
    {
      color: "Purple",
      borderClass: "border-l-4 border-l-purple-500",
      usage: "Plans, Secondary Metrics, Analytics",
      examples: ["Plan listings", "Secondary KPIs", "Report summaries"],
    },
    {
      color: "Red",
      borderClass: "border-l-4 border-l-red-500",
      usage: "Expenses, Negative Values, Critical Alerts",
      examples: ["Expense tracking", "Overdue items", "Loss indicators"],
    },
    {
      color: "Amber",
      borderClass: "border-l-4 border-l-amber-500",
      usage: "Warnings, Pending Status, Attention Required",
      examples: ["Pending approvals", "Payment reminders", "Review needed"],
    },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Colored borders help you quickly identify different types of information throughout the
          application. These colors are consistent across all modules for better visual clarity.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Color Coding System</CardTitle>
          <CardDescription>
            Understanding the meaning behind each border color
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {colorMeanings.map((item) => (
            <div key={item.color} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-12 rounded ${item.borderClass}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{item.color}</Badge>
                    <span className="font-medium">{item.usage}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.examples.join(" • ")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Example: Client Information Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Client Name</p>
              <p className="font-semibold">Sample Client Ltd.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Client ID</p>
              <p className="font-mono">CLT-2025-001</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Example: Campaign Period Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-semibold">Jan 15, 2025</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-semibold">30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Example: Financial Summary Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Subtotal</span>
              <span className="font-bold">₹1,50,000</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Grand Total</span>
              <span className="font-semibold text-lg">₹1,77,000</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
