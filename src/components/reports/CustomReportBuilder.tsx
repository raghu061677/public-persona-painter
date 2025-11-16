import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reportTypes = [
  { id: "media_assets", label: "Media Assets" },
  { id: "campaigns", label: "Campaigns" },
  { id: "clients", label: "Clients" },
  { id: "invoices", label: "Invoices" },
  { id: "expenses", label: "Expenses" },
];

const availableFields = {
  media_assets: ["ID", "City", "Area", "Location", "Media Type", "Status", "Rate"],
  campaigns: ["ID", "Name", "Client", "Start Date", "End Date", "Status", "Amount"],
  clients: ["ID", "Name", "Company", "Email", "Phone", "City"],
  invoices: ["ID", "Client", "Date", "Due Date", "Amount", "Status"],
  expenses: ["ID", "Vendor", "Category", "Amount", "Date", "Status"],
};

export function CustomReportBuilder() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thismonth">This Month</SelectItem>
                  <SelectItem value="lastmonth">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Fields to Include</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {availableFields.media_assets.map((field) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox id={field} />
                  <label
                    htmlFor={field}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Filters</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">City</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select defaultValue="excel">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button variant="outline" className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Monthly Vacant Media", lastRun: "2 days ago" },
              { name: "Client Revenue Report", lastRun: "1 week ago" },
              { name: "Campaign Performance", lastRun: "3 days ago" },
            ].map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">Last run: {template.lastRun}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Run
                  </Button>
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
