import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplateExportImportProps {
  currentSettings: any;
  onImport: (config: any) => void;
}

export function TemplateExportImport({ currentSettings, onImport }: TemplateExportImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const templateConfig = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      template: {
        ppt_template_name: currentSettings.ppt_template_name,
        ppt_primary_color: currentSettings.ppt_primary_color,
        ppt_secondary_color: currentSettings.ppt_secondary_color,
        ppt_accent_color: currentSettings.ppt_accent_color,
        ppt_layout_style: currentSettings.ppt_layout_style,
        ppt_include_company_logo: currentSettings.ppt_include_company_logo,
        ppt_watermark_enabled: currentSettings.ppt_watermark_enabled,
        ppt_footer_text: currentSettings.ppt_footer_text,
        auto_generate_ppt_on_completion: currentSettings.auto_generate_ppt_on_completion,
        notify_manager_on_ppt_generation: currentSettings.notify_manager_on_ppt_generation,
      },
    };

    const blob = new Blob([JSON.stringify(templateConfig, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppt-template-${currentSettings.ppt_template_name.toLowerCase().replace(/\s+/g, '-')}-${
      new Date().toISOString().split('T')[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Template Exported',
      description: 'Template configuration downloaded successfully',
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);

        if (!config.version || !config.template) {
          throw new Error('Invalid template file format');
        }

        onImport(config.template);

        toast({
          title: 'Template Imported',
          description: 'Template configuration loaded successfully',
        });
      } catch (error: any) {
        console.error('Error importing template:', error);
        toast({
          title: 'Import Failed',
          description: error.message || 'Invalid template file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export & Import Templates</CardTitle>
        <CardDescription>
          Share template configurations across teams or organizations
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Current Template
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import Template
        </Button>
      </CardContent>
    </Card>
  );
}
