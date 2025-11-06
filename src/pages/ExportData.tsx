import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, File, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ExportData() {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [exportFormat, setExportFormat] = useState<"excel" | "csv" | "pdf">("excel");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const modules = [
    { id: "media_assets", label: "Media Assets", icon: Database, table: "media_assets" },
    { id: "clients", label: "Clients", icon: FileText, table: "clients" },
    { id: "plans", label: "Plans", icon: FileSpreadsheet, table: "plans" },
    { id: "campaigns", label: "Campaigns", icon: File, table: "campaigns" },
    { id: "invoices", label: "Invoices", icon: FileText, table: "invoices" },
    { id: "expenses", label: "Expenses", icon: FileSpreadsheet, table: "expenses" },
  ];

  const toggleModule = (moduleId: string) => {
    const newSelection = new Set(selectedModules);
    if (newSelection.has(moduleId)) {
      newSelection.delete(moduleId);
    } else {
      newSelection.add(moduleId);
    }
    setSelectedModules(newSelection);
  };

  const toggleAllModules = () => {
    if (selectedModules.size === modules.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(modules.map(m => m.id)));
    }
  };

  const fetchModuleData = async (tableName: string) => {
    let query = supabase.from(tableName as any).select('*');

    if (dateRange.start) {
      query = query.gte('created_at', dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte('created_at', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }

    return data || [];
  };

  const exportToExcel = async (allData: Record<string, any[]>) => {
    const wb = XLSX.utils.book_new();

    Object.entries(allData).forEach(([moduleName, data]) => {
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        const maxWidth = data.reduce((w, r) => 
          Math.max(w, ...Object.values(r).map(v => String(v || "").length)), 10);
        ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: Math.min(maxWidth, 50) }));
        XLSX.utils.book_append_sheet(wb, ws, moduleName);
      }
    });

    const filename = `export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportToCSV = async (allData: Record<string, any[]>) => {
    Object.entries(allData).forEach(([moduleName, data]) => {
      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${moduleName}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  };

  const exportToPDF = async (allData: Record<string, any[]>) => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.text("Data Export Report", 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
    yPosition += 5;

    if (dateRange.start || dateRange.end) {
      doc.text(`Date Range: ${dateRange.start || 'N/A'} to ${dateRange.end || 'N/A'}`, 14, yPosition);
      yPosition += 10;
    } else {
      yPosition += 10;
    }

    Object.entries(allData).forEach(([moduleName, data], index) => {
      if (data.length > 0) {
        if (index > 0) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(moduleName.toUpperCase(), 14, yPosition);
        yPosition += 10;

        const headers = Object.keys(data[0]);
        const rows = data.map(item => headers.map(h => String(item[h] || '-')));

        doc.autoTable({
          startY: yPosition,
          head: [headers],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 64, 175] },
        });
      }
    });

    doc.save(`export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExport = async () => {
    if (selectedModules.size === 0) {
      toast({
        title: "No Modules Selected",
        description: "Please select at least one module to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const allData: Record<string, any[]> = {};
      const selectedModulesList = modules.filter(m => selectedModules.has(m.id));
      const progressIncrement = 100 / selectedModulesList.length;

      for (const module of selectedModulesList) {
        const data = await fetchModuleData(module.table);
        allData[module.label] = data;
        setProgress(prev => Math.min(prev + progressIncrement, 90));
      }

      if (exportFormat === "excel") {
        await exportToExcel(allData);
      } else if (exportFormat === "csv") {
        await exportToCSV(allData);
      } else if (exportFormat === "pdf") {
        await exportToPDF(allData);
      }

      setProgress(100);

      const totalRecords = Object.values(allData).reduce((sum, data) => sum + data.length, 0);
      
      toast({
        title: "Export Successful",
        description: `Exported ${totalRecords} records from ${selectedModules.size} module(s)`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Center</h1>
          <p className="text-muted-foreground mt-1">
            Export data from multiple modules with custom filters and formats
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Modules</CardTitle>
                <CardDescription>Choose which modules to export</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAllModules}>
                {selectedModules.size === modules.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedModules.has(module.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => toggleModule(module.id)}
                  >
                    <Checkbox
                      checked={selectedModules.has(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{module.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Date Range (Optional)</CardTitle>
              <CardDescription>Filter by creation date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>Choose your preferred export format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Excel:</strong> Best for data analysis with multiple sheets<br />
                  <strong>CSV:</strong> Lightweight, one file per module<br />
                  <strong>PDF:</strong> Print-friendly format
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected Modules:</span>
                <span className="font-medium">{selectedModules.size} / {modules.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date Range:</span>
                <span className="font-medium">
                  {dateRange.start || dateRange.end 
                    ? `${dateRange.start || 'All'} to ${dateRange.end || 'All'}`
                    : "All Time"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium uppercase">{exportFormat}</span>
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">
                    Exporting... {Math.round(progress)}%
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleExport}
                disabled={isExporting || selectedModules.size === 0}
              >
                <Download className="mr-2 h-5 w-5" />
                {isExporting ? "Exporting..." : "Export Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
