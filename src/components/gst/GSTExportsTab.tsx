import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

const EXPORTS = [
  { name: "GST_Monthly_Summary", desc: "Complete monthly GST summary with tax breakup, B2B/B2C split, and credit note impact", formats: ["XLSX", "CSV"] },
  { name: "GST_B2B_Register", desc: "B2B outward supplies register with GSTIN, place of supply, and tax details", formats: ["XLSX", "CSV"] },
  { name: "GST_B2C_Summary", desc: "B2C outward supplies aggregated by place of supply", formats: ["XLSX", "CSV"] },
  { name: "GST_Credit_Notes_Register", desc: "Issued credit note register with original invoice linkage", formats: ["XLSX", "CSV"] },
  { name: "GST_HSN_SAC_Summary", desc: "HSN/SAC wise summary of outward supplies", formats: ["XLSX", "CSV"] },
  { name: "GST_Invoice_Register_Detailed", desc: "Detailed invoice register for auditor review", formats: ["XLSX", "CSV"] },
  { name: "GST_Validation_Report", desc: "Pre-filing validation report with issues and suggested fixes", formats: ["XLSX", "CSV"] },
  { name: "GST_Statewise_Summary", desc: "State-wise outward supply summary", formats: ["XLSX", "CSV"] },
];

export function GSTExportsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">Export files are generated from the same SQL views displayed in the dashboard tabs. Full export functionality is coming in <strong>Phase 3</strong>.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map((exp) => (
          <Card key={exp.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{exp.name.replace(/_/g, " ")}</CardTitle>
                  <CardDescription className="text-xs mt-1">{exp.desc}</CardDescription>
                </div>
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {exp.formats.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" disabled className="text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Phase 3
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
