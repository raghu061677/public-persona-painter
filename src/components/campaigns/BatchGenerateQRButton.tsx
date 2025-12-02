import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { QrCode, Loader2 } from 'lucide-react';

interface BatchGenerateQRButtonProps {
  companyId?: string;
}

export function BatchGenerateQRButton({ companyId }: BatchGenerateQRButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('batch-generate-qr-codes', {
        body: {
          company_id: companyId,
          force_regenerate: false,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'QR Codes Generated',
        description: `Successfully generated ${data.generated} QR codes${data.failed > 0 ? ` (${data.failed} failed)` : ''}`,
      });

      // Refresh the page to show updated QR codes
      window.location.reload();
    } catch (error: any) {
      console.error('Generate QR codes error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate QR codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <QrCode className="mr-2 h-4 w-4" />
          Generate QR Codes
        </>
      )}
    </Button>
  );
}
