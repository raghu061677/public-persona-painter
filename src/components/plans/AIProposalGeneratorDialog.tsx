import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface AIProposalGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  planId: string;
}

export function AIProposalGeneratorDialog({ open, onClose, planId }: AIProposalGeneratorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-proposal-generator', {
        body: { planId }
      });

      if (error) throw error;

      if (data?.proposal) {
        setProposal(data.proposal);
        toast({
          title: "Proposal Generated",
          description: "AI created professional proposals in 3 formats",
        });
      }
    } catch (error: any) {
      console.error('Proposal generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate proposal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (format: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    toast({
      title: "Copied!",
      description: `${format} proposal copied to clipboard`,
    });
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Proposal Generator
          </DialogTitle>
          <DialogDescription>Generate AI-powered proposals for your media plan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!proposal && (
            <div className="text-center space-y-4 py-8">
              <p className="text-muted-foreground">
                Generate professional, persuasive proposals in 3 formats:
              </p>
              <ul className="text-sm space-y-1 text-left max-w-md mx-auto">
                <li>• <strong>Markdown</strong> - Editable format for customization</li>
                <li>• <strong>WhatsApp</strong> - Mobile-friendly, under 1000 chars</li>
                <li>• <strong>Email HTML</strong> - Formatted for professional emails</li>
              </ul>
              <Button onClick={handleGenerate} disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Proposals
                  </>
                )}
              </Button>
            </div>
          )}

          {proposal && (
            <Tabs defaultValue="markdown" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="email">Email HTML</TabsTrigger>
              </TabsList>
              
              <TabsContent value="markdown" className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('Markdown', proposal.markdown)}
                  >
                    {copiedFormat === 'Markdown' ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={proposal.markdown}
                  readOnly
                  rows={15}
                  className="font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('WhatsApp', proposal.whatsapp)}
                  >
                    {copiedFormat === 'WhatsApp' ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={proposal.whatsapp}
                  readOnly
                  rows={15}
                />
              </TabsContent>

              <TabsContent value="email" className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('Email HTML', proposal.email)}
                  >
                    {copiedFormat === 'Email HTML' ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={proposal.email}
                  readOnly
                  rows={15}
                  className="font-mono text-sm"
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
