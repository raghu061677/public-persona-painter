import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock, Link as LinkIcon } from "lucide-react";

interface SendPortalInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  defaultEmail?: string;
}

export function SendPortalInviteDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  defaultEmail = "",
}: SendPortalInviteDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const handleSendInvite = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-client-portal-invite', {
        body: {
          clientId,
          email,
          expiresInHours,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      setMagicLink(response.data.magicLink);

      toast({
        title: "✅ Invite sent successfully",
        description: `Portal access email sent to ${email}`,
      });
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      toast({
        title: "Link copied",
        description: "Magic link copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    setEmail(defaultEmail);
    setExpiresInHours(72);
    setMagicLink(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Portal Invite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Input value={clientName} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Link Expires In (hours)</Label>
            <Input
              id="expires"
              type="number"
              min={1}
              max={168}
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Default: 72 hours (3 days)
            </p>
          </div>

          {magicLink && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label>Magic Link (Share Directly)</Label>
              <div className="flex gap-2">
                <Input value={magicLink} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can also share this link directly with the client via WhatsApp or other channels.
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">📧 What happens next?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Client receives a secure email with access link</li>
              <li>• They can view campaigns, proofs, and invoices</li>
              <li>• No password required - magic link authentication</li>
              <li>• Link expires after {expiresInHours} hours for security</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendInvite} disabled={loading || !email}>
            {loading ? "Sending..." : "Send Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
