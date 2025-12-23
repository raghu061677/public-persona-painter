import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BulkQRGenerationButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-all-asset-qr', { body: {} });

      if (error) {
        throw error;
      }

      const result = data as {
        success: boolean;
        total: number;
        succeeded: number;
        failed: number;
        message: string;
        errors?: string[];
      };

      if (result.success) {
        toast({
          title: 'QR Codes Generated',
          description: `${result.succeeded} QR codes generated successfully${result.failed > 0 ? `. ${result.failed} failed.` : ''}`,
          variant: result.failed > 0 ? 'default' : 'default',
        });

        if (result.errors && result.errors.length > 0) {
          console.error('QR generation errors:', result.errors);
        }
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      console.error('Bulk QR generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <QrCode className="mr-2 h-4 w-4" />
              Generate All QR Codes
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate QR Codes for All Assets?</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate QR codes for all media assets that don't have one yet.
            The process may take a few moments depending on the number of assets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkGenerate}>
            Generate QR Codes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}