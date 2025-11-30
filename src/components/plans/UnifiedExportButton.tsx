import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { generateUnifiedPDF } from '@/lib/exports/unifiedPDFExport';
import { generateUnifiedExcel } from '@/lib/exports/unifiedExcelExport';
import { ExportOptions, ExportOptionsDialog } from './ExportOptionsDialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedExportButtonProps {
  planId: string;
  planName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function UnifiedExportButton({
  planId,
  planName,
  variant = "default",
  size = "default",
  className,
}: UnifiedExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);

  const handleExport = async (options: ExportOptions) => {
    setShowOptionsDialog(false);
    
    try {
      setIsExporting(true);

      // Fetch plan and plan items
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const { data: planItems, error: itemsError } = await supabase
        .from('plan_items')
        .select(`
          *,
          media_assets!inner(
            total_sqft,
            dimensions,
            illumination_type,
            qr_code_url
          )
        `)
        .eq('plan_id', planId)
        .order('created_at');

      if (itemsError) throw itemsError;

      // Flatten data
      const items = (planItems || []).map(item => ({
        ...item,
        total_sqft: item.media_assets?.total_sqft,
        dimensions: item.media_assets?.dimensions,
        illumination_type: item.media_assets?.illumination_type,
        qr_code_url: item.media_assets?.qr_code_url,
      }));

      let blob: Blob;
      let filename: string;

      if (options.exportType === 'excel') {
        blob = await generateUnifiedExcel({ plan, planItems: items, options });
        filename = `${options.optionType}_${planId}_${planName || 'Export'}.xlsx`;
      } else {
        blob = await generateUnifiedPDF({ plan, planItems: items, options });
        filename = `${options.optionType}_${planId}_${planName || 'Export'}.pdf`;
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `${options.exportType.toUpperCase()} file downloaded successfully`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to generate export file',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setShowOptionsDialog(true);
        }}
        disabled={isExporting}
        className={className}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 mr-2" />
        )}
        {isExporting ? "Exporting..." : "Export Document"}
      </Button>

      <ExportOptionsDialog
        open={showOptionsDialog}
        onClose={() => setShowOptionsDialog(false)}
        onExport={handleExport}
        clientName={planName || ''}
      />
    </>
  );
}
