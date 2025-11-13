import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateEstimatePDF } from '@/lib/plans/generateEstimatePDF';

interface EstimatePDFButtonProps {
  planId: string;
  planName?: string;
}

export function EstimatePDFButton({ planId, planName }: EstimatePDFButtonProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await generateEstimatePDF(planId);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Estimate_${planId}_${planName || 'Plan'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Estimate PDF downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error generating Estimate PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate Estimate PDF',
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
          Download Estimate (PDF)
        </>
      )}
    </Button>
  );
}
