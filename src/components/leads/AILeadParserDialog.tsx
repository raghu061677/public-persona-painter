import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AILeadParserDialogProps {
  open: boolean;
  onClose: () => void;
  onParsedData: (data: any) => void;
}

export function AILeadParserDialog({ open, onClose, onParsedData }: AILeadParserDialogProps) {
  const [rawMessage, setRawMessage] = useState("");
  const [source, setSource] = useState("manual");
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!rawMessage.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a message to parse",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-parser', {
        body: { rawMessage, source }
      });

      if (error) throw error;

      if (data?.parsedData) {
        toast({
          title: "Lead Parsed Successfully",
          description: "AI extracted structured data from your message",
        });
        onParsedData(data.parsedData);
        onClose();
      }
    } catch (error: any) {
      console.error('AI parsing error:', error);
      toast({
        title: "AI Parsing Failed",
        description: error.message || "Failed to parse lead data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Lead Parser
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source">Lead Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., whatsapp, email, manual"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message / Description</Label>
            <Textarea
              id="message"
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              placeholder="Paste WhatsApp message, email content, or manual notes here..."
              rows={8}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleParse} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Parse with AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
