import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, RefreshCw, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ShareTrackingLinkDialogProps {
  campaignId: string;
  publicToken: string;
  isEnabled: boolean;
  onUpdate?: () => void;
}

export function ShareTrackingLinkDialog({
  campaignId,
  publicToken,
  isEnabled,
  onUpdate,
}: ShareTrackingLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const publicUrl = `${window.location.origin}/campaign-track/${publicToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: 'Link Copied',
      description: 'Tracking link copied to clipboard',
    });
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate tracking link? The old link will stop working.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ public_tracking_token: crypto.randomUUID() })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'New tracking link generated',
      });

      if (onUpdate) onUpdate();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSharing = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ public_share_enabled: !isEnabled })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: isEnabled ? 'Public sharing disabled' : 'Public sharing enabled',
      });

      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share Tracking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Public Tracking Link</DialogTitle>
          <DialogDescription>
            Share this link with your client to track campaign progress in real-time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Public URL</label>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleRegenerateToken}
              disabled={loading || !isEnabled}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Link
            </Button>

            <Button
              variant={isEnabled ? 'destructive' : 'default'}
              onClick={handleToggleSharing}
              disabled={loading}
            >
              {isEnabled ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Disable Sharing
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Enable Sharing
                </>
              )}
            </Button>
          </div>

          {!isEnabled && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Public sharing is currently disabled. Enable it to allow clients to track this
                campaign.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
