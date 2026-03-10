/**
 * EmailSendConfirmDialog — Confirmation popup before sending client-facing emails.
 * Triggered when send_mode = 'confirm'.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Eye, X, Mail, User, FileText, Loader2 } from "lucide-react";
import { AUDIENCE_LABELS, CATEGORY_LABELS } from "@/services/notifications/emailEvents";
import type { EmailPreview } from "@/services/notifications/emailSender";
import { toast } from "sonner";

interface EmailSendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: EmailPreview | null;
  onSend: (preview: EmailPreview) => Promise<void>;
  onSkip?: () => void;
}

export function EmailSendConfirmDialog({
  open,
  onOpenChange,
  preview,
  onSend,
  onSkip,
}: EmailSendConfirmDialogProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [editTo, setEditTo] = useState('');
  const [editCc, setEditCc] = useState('');

  // Reset state when dialog opens with new preview
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && preview) {
      setEditTo(preview.recipients[0]?.to || '');
      setEditCc(preview.recipients[0]?.cc || '');
      setShowFullPreview(false);
      setSending(false);
    }
    onOpenChange(newOpen);
  };

  const handleSend = async () => {
    if (!preview) return;
    setSending(true);
    try {
      // Update recipients with edited values
      const updatedPreview: EmailPreview = {
        ...preview,
        recipients: [{
          ...preview.recipients[0],
          to: editTo || preview.recipients[0]?.to || '',
          cc: editCc || undefined,
        }],
      };
      await onSend(updatedPreview);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Confirm Email Send
          </DialogTitle>
          <DialogDescription>
            Review and confirm before sending this email to the client.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Event Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{CATEGORY_LABELS[preview.event.category]}</Badge>
              <Badge variant="secondary">{AUDIENCE_LABELS[preview.event.audience]}</Badge>
              <span className="text-sm font-medium">{preview.event.label}</span>
            </div>

            <Separator />

            {/* Recipients */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Recipients</Label>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    value={editTo}
                    onChange={e => setEditTo(e.target.value)}
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CC (optional)</Label>
                  <Input
                    value={editCc}
                    onChange={e => setEditCc(e.target.value)}
                    placeholder="cc@example.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Template & Subject */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Template: {preview.template_name}</Label>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="text-sm font-medium mt-1">{preview.subject}</p>
              </div>
            </div>

            {/* Body Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Email Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullPreview(!showFullPreview)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showFullPreview ? 'Collapse' : 'Full Preview'}
                </Button>
              </div>
              <div
                className={`border rounded-lg overflow-hidden bg-white ${
                  showFullPreview ? 'max-h-[400px]' : 'max-h-[150px]'
                } overflow-y-auto`}
              >
                <div
                  className="p-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: preview.body }}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip} disabled={sending}>
            <X className="h-4 w-4 mr-1" />
            Skip This Time
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
