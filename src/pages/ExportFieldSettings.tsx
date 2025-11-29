import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExportFieldSetting {
  id: string;
  export_type: string;
  module: string;
  field_key: string;
  label: string;
  is_visible: boolean;
  order_index: number;
}

const EXPORT_TYPES = [
  { value: 'EstimatePDF', label: 'Estimate PDF' },
  { value: 'WorkOrderPDF', label: 'Work Order PDF' },
  { value: 'InvoicePDF', label: 'Invoice PDF' },
  { value: 'PlanPPT', label: 'Plan PowerPoint' },
  { value: 'ProofPPT', label: 'Proof PowerPoint' },
  { value: 'PlanExcel', label: 'Plan Excel' },
  { value: 'WorkOrderExcel', label: 'Work Order Excel' },
  { value: 'InvoiceExcel', label: 'Invoice Excel' },
];

const MODULE_COLORS: Record<string, string> = {
  media_assets: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  plan: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  campaign: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  client: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  operations: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function ExportFieldSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState('EstimatePDF');
  const [fields, setFields] = useState<ExportFieldSetting[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [selectedExportType]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('export_field_settings')
        .select('*')
        .eq('export_type', selectedExportType)
        .order('order_index');

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (fieldId: string) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, is_visible: !f.is_visible } : f
    ));
    setHasChanges(true);
  };

  const updateLabel = (fieldId: string, newLabel: string) => {
    setFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, label: newLabel } : f
    ));
    setHasChanges(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    // Update order_index
    newFields.forEach((f, i) => f.order_index = i + 1);
    setFields(newFields);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    // Update order_index
    newFields.forEach((f, i) => f.order_index = i + 1);
    setFields(newFields);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all fields
      for (const field of fields) {
        const { error } = await supabase
          .from('export_field_settings')
          .update({
            label: field.label,
            is_visible: field.is_visible,
            order_index: field.order_index,
          })
          .eq('id', field.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Export field settings saved successfully",
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group fields by module
  const fieldsByModule = fields.reduce((acc, field) => {
    if (!acc[field.module]) acc[field.module] = [];
    acc[field.module].push(field);
    return acc;
  }, {} as Record<string, ExportFieldSetting[]>);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/settings')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Export Field Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure which fields appear in each export type (PDF, Excel, PowerPoint)
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Export Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedExportType} onValueChange={setSelectedExportType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading fields...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {Object.entries(fieldsByModule).map(([module, moduleFields]) => (
              <Card key={module} className="mb-4">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MODULE_COLORS[module] || 'bg-gray-100'}`}>
                      {module.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({moduleFields.filter(f => f.is_visible).length} of {moduleFields.length} visible)
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Order</TableHead>
                        <TableHead className="w-[80px]">Visible</TableHead>
                        <TableHead>Field Key</TableHead>
                        <TableHead>Display Label</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleFields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-mono text-xs">{field.order_index}</TableCell>
                          <TableCell>
                            <Switch
                              checked={field.is_visible}
                              onCheckedChange={() => toggleVisibility(field.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{field.field_key}</TableCell>
                          <TableCell>
                            <Input
                              value={field.label}
                              onChange={(e) => updateLabel(field.id, e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveUp(fields.indexOf(field))}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveDown(fields.indexOf(field))}
                                disabled={index === moduleFields.length - 1}
                              >
                                ↓
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  fetchFields();
                  setHasChanges(false);
                }}
                disabled={!hasChanges}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
