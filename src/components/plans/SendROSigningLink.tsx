import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, Copy, Loader2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SendROSigningLinkProps {
  planId: string;
  planName?: string;
  clientName?: string;
  disabled?: boolean;
}

export function SendROSigningLink({ planId, planName, clientName, disabled }: SendROSigningLinkProps) {
  const [generating, setGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [signingLink, setSigningLink] = useState("");

  async function generateLink() {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create token
      const { data: tokenData, error } = await supabase
        .from("plan_ro_tokens")
        .insert({
          plan_id: planId,
          created_by: user.id,
        } as any)
        .select("token")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/ro-sign/${planId}/${tokenData.token}`;
      setSigningLink(link);
      setShowDialog(true);
    } catch (err: any) {
      console.error("Token generation error:", err);
      toast({
        title: "Failed to generate link",
        description: err.message,
        variant: "destructive",
      });
    }
    setGenerating(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(signingLink).then(() => {
      toast({
        title: "Link Copied!",
        description: "RO signing link has been copied to clipboard.",
      });
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={generateLink}
        disabled={generating || disabled}
      >
        {generating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Send RO Signing Link
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              RO Signing Link Generated
            </DialogTitle>
            <DialogDescription>
              Share this link with {clientName || "the client"} to digitally sign the Release Order
              for <strong>{planName || planId}</strong>. The link expires in 72 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={signingLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button onClick={copyLink} size="icon" variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⏳ This link will expire after 72 hours or once the client signs.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
