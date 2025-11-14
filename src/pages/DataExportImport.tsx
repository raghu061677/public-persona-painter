import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/activityLogger';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileJson, 
  Calendar as CalendarIcon,
  Settings,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const modules = [
  { id: 'media_assets', label: 'Media Assets', table: 'media_assets' },
  { id: 'clients', label: 'Clients', table: 'clients' },
  { id: 'plans', label: 'Plans', table: 'plans' },
  { id: 'campaigns', label: 'Campaigns', table: 'campaigns' },
  { id: 'invoices', label: 'Invoices', table: 'invoices' },
  { id: 'expenses', label: 'Expenses', table: 'expenses' },
  { id: 'operations_photos', label: 'Operations Photos', table: 'operations_photos' },
];

export default function DataExportImport() {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('excel');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const handleModuleSelect = async (moduleId: string) => {
    setSelectedModule(moduleId);
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    try {
      const { data, error } = await supabase.from(module.table as any).select('*').limit(1);
      if (error) throw error;
      
      if (data && data.length > 0) {
        const fields = Object.keys(data[0]);
        setAvailableFields(fields);
        setSelectedFields(fields);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available fields',
        variant: 'destructive',
      });
    }
  };

  const fetchModuleData = async (tableName: string) => {
    try {
      let query = supabase.from(tableName as any).select('*');

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    if (!selectedModule) {
      toast({
        title: 'Error',
        description: 'Please select a module to export',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const module = modules.find((m) => m.id === selectedModule);
      if (!module) throw new Error('Module not found');

      const data = await fetchModuleData(module.table);
      
      // Filter selected fields
      const filteredData = data.map((row) => {
        const filtered: any = {};
        selectedFields.forEach((field) => {
          filtered[field] = row[field];
        });
        return filtered;
      });

      if (exportFormat === 'csv' || exportFormat === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, module.label);
        
        const fileName = `${module.id}_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
        XLSX.writeFile(workbook, fileName, { bookType: exportFormat === 'csv' ? 'csv' : 'xlsx' });
      } else if (exportFormat === 'json') {
        const json = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${module.id}_${format(new Date(), 'yyyy-MM-dd')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }

      await logActivity('export', selectedModule as any, undefined, module.label, {
        format: exportFormat,
        record_count: filteredData.length,
        fields: selectedFields,
      });

      toast({
        title: 'Success',
        description: `Exported ${filteredData.length} records successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModule) return;

    setImporting(true);
    try {
      const module = modules.find((m) => m.id === selectedModule);
      if (!module) throw new Error('Module not found');

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let parsedData: any[] = [];

          if (file.name.endsWith('.json')) {
            parsedData = JSON.parse(e.target?.result as string);
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            parsedData = XLSX.utils.sheet_to_json(firstSheet);
          }

          // Apply field mapping
          const mappedData = parsedData.map((row) => {
            const mapped: any = {};
            Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
              if (row[sourceField] !== undefined) {
                mapped[targetField] = row[sourceField];
              }
            });
            return mapped;
          });

          // Import data in batches
          const batchSize = 100;
          let imported = 0;
          
          for (let i = 0; i < mappedData.length; i += batchSize) {
            const batch = mappedData.slice(i, i + batchSize);
            const { error } = await supabase.from(module.table as any).insert(batch);
            if (error) throw error;
            imported += batch.length;
          }

          await logActivity('upload', selectedModule as any, undefined, module.label, {
            record_count: imported,
            file_name: file.name,
          });

          toast({
            title: 'Success',
            description: `Imported ${imported} records successfully`,
          });

          event.target.value = '';
        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: 'Error',
            description: 'Failed to import data',
            variant: 'destructive',
          });
        } finally {
          setImporting(false);
        }
      };

      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Export / Import Center</h1>
        <p className="text-muted-foreground mt-1">
          Export and import data across all modules with advanced field mapping and scheduling
        </p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Export Configuration</CardTitle>
                <CardDescription>Select module, format, and fields to export</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-module">Module</Label>
                  <Select value={selectedModule} onValueChange={handleModuleSelect}>
                    <SelectTrigger id="export-module">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                    <SelectTrigger id="export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel (.xlsx)
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          CSV (.csv)
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON (.json)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd, y')} -{' '}
                              {format(dateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={!selectedModule || exporting}
                  className="w-full"
                >
                  {exporting ? (
                    <>Exporting...</>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field Selection</CardTitle>
                <CardDescription>Choose which fields to include in export</CardDescription>
              </CardHeader>
              <CardContent>
                {availableFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a module to view available fields
                  </p>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={selectedFields.length === availableFields.length}
                          onCheckedChange={(checked) => {
                            setSelectedFields(checked ? availableFields : []);
                          }}
                        />
                        <Label className="font-semibold">Select All</Label>
                      </div>
                      {availableFields.map((field) => (
                        <div key={field} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedFields.includes(field)}
                            onCheckedChange={(checked) => {
                              setSelectedFields(
                                checked
                                  ? [...selectedFields, field]
                                  : selectedFields.filter((f) => f !== field)
                              );
                            }}
                          />
                          <Label className="font-mono text-sm">{field}</Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Import Configuration</CardTitle>
                <CardDescription>Upload and map data to import</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-module">Target Module</Label>
                  <Select value={selectedModule} onValueChange={handleModuleSelect}>
                    <SelectTrigger id="import-module">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-file">Import File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.xlsx,.json"
                    onChange={handleFileImport}
                    disabled={!selectedModule || importing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV, Excel (.xlsx), JSON
                  </p>
                </div>

                {importing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Importing data...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field Mapping</CardTitle>
                <CardDescription>Map source fields to target fields</CardDescription>
              </CardHeader>
              <CardContent>
                {availableFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a module to configure field mapping
                  </p>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {availableFields.map((field) => (
                        <div key={field} className="grid grid-cols-2 gap-2 items-center">
                          <Input
                            placeholder="Source field"
                            defaultValue={field}
                            onChange={(e) => {
                              setFieldMapping({
                                ...fieldMapping,
                                [e.target.value]: field,
                              });
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono text-sm">{field}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Exports</CardTitle>
              <CardDescription>Configure automatic data exports for BI and reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Scheduled Exports</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically export data on a recurring schedule
                  </p>
                </div>
                <Checkbox
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => setScheduleEnabled(checked as boolean)}
                />
              </div>

              {scheduleEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={scheduleFrequency} onValueChange={(v: any) => setScheduleFrequency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Export Module</Label>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" disabled>
                    <Settings className="h-4 w-4 mr-2" />
                    Save Schedule (Coming Soon)
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Note: Scheduled exports will be saved to your configured storage location and can be
                    accessed via email notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
