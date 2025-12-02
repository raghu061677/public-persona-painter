import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface GenerateProofPPTButtonNewProps {
  campaignId: string;
  companyId: string;
  onSuccess?: () => void;
}

export function GenerateProofPPTButtonNew({
  campaignId,
  companyId,
  onSuccess,
}: GenerateProofPPTButtonNewProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-proof-ppt', {
        body: {
          campaign_id: campaignId,
          company_id: companyId,
        },
      });

      if (error) {
        throw error;
      }

      if (data.file_url) {
        toast({
          title: 'Success',
          description: 'Proof PPT generated successfully',
        });

        // Open the file in a new tab
        window.open(data.file_url, '_blank');

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Generate proof PPT error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate proof PPT',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="default" size="sm" onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate Proof PPT
        </>
      )}
    </Button>
  );
}
