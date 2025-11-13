import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateWorkOrderPDF } from '@/lib/plans/generateWorkOrderPDF';

interface WorkOrderPDFButtonProps {
  planId: string;
  planName?: string;
}

export function WorkOrderPDFButton({ planId, planName }: WorkOrderPDFButtonProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await generateWorkOrderPDF(planId);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkOrder_${planId}_${planName || 'Plan'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Work Order PDF downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error generating Work Order PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate Work Order PDF',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={generating} variant="outline">
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Download Work Order (PDF)
        </>
      )}
    </Button>
  );
}
