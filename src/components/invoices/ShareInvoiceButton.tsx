import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Share2, Copy, Ban, ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface ShareInvoiceButtonProps {
  invoiceId: string;
  invoiceNo?: string;
}

interface ShareToken {
  id: string;
  token: string;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  is_revoked: boolean;
  created_at: string;
}

export function ShareInvoiceButton({ invoiceId, invoiceNo }: ShareInvoiceButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxUses, setMaxUses] = useState(200);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTokens();
      setNewToken(null);
    }
  }, [open]);

  const fetchTokens = async () => {
    setLoadingTokens(true);
    const { data, error } = await supabase
      .from('invoice_share_tokens')
      .select('id, token, expires_at, max_uses, use_count, is_revoked, created_at')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setTokens(data as ShareToken[]);
    }
    setLoadingTokens(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-share-token', {
        body: { invoice_id: invoiceId, expires_days: expiresDays, max_uses: maxUses },
      });

      if (error) throw error;
      if (data?.token) {
        setNewToken(data.token);
        toast({ title: "Share link created", description: "Copy the link below to share this invoice." });
        fetchTokens();
      } else {
        throw new Error(data?.error || 'Failed to generate token');
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleRevoke = async (tokenId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('invoice_share_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString(), revoked_by: user?.id })
      .eq('id', tokenId);

    if (error) {
      toast({ title: "Error", description: "Failed to revoke token", variant: "destructive" });
    } else {
      toast({ title: "Token revoked", description: "The share link has been disabled." });
      fetchTokens();
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/portal/view-invoice/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Share link copied to clipboard." });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Invoice {invoiceNo || invoiceId}</DialogTitle>
            <DialogDescription>
              Generate a secure link for clients to view this invoice without logging in.
            </DialogDescription>
          </DialogHeader>

          {/* New token display */}
          {newToken && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium text-primary">New share link created!</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/portal/view-invoice/${newToken}`}
                  className="text-xs font-mono"
                />
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(newToken)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Copy this link now — the token won't be shown again in full.
              </p>
            </div>
          )}

          {/* Generate new token */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-medium">Create New Share Link</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Expires in (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Max views</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Generate Share Link
            </Button>
          </div>

          {/* Existing tokens */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Share Links</h4>
            {loadingTokens ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : tokens.length === 0 ? (
              <p className="text-xs text-muted-foreground">No share links created yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tokens.map((t) => {
                  const expired = isExpired(t.expires_at);
                  const revoked = t.is_revoked;
                  const active = !expired && !revoked;

                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-muted-foreground">
                            ...{t.token.slice(-8)}
                          </code>
                          {active && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground">Active</Badge>}
                          {revoked && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
                          {expired && !revoked && <Badge variant="secondary" className="text-[10px]">Expired</Badge>}
                        </div>
                        <p className="text-muted-foreground">
                          Views: {t.use_count}/{t.max_uses ?? '∞'} · Expires: {formatDate(t.expires_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {active && (
                          <>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(t.token)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRevoke(t.id)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
