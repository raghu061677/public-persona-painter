import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface WaLog {
  id: string;
  message_type: "incoming" | "outgoing";
  message_body: string | null;
  created_at: string;
  status: string | null;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  company_name?: string | null;
  requirement?: string | null;
  target_locations?: string | null;
  status?: string | null;
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onMessageSent?: () => void;
}

export function ConversationDrawer({ lead, open, onOpenChange, onMessageSent }: Props) {
  const [messages, setMessages] = useState<WaLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!lead?.phone) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_logs")
      .select("id, message_type, message_body, created_at, status")
      .eq("phone_number", lead.phone)
      .order("created_at", { ascending: true })
      .limit(200);
    if (!error && data) setMessages(data as WaLog[]);
    setLoading(false);
    setTimeout(
      () => scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }),
      50,
    );
  };

  useEffect(() => {
    if (open && lead) {
      fetchMessages();
      const channel = supabase
        .channel(`wa-${lead.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "whatsapp_logs",
            filter: `phone_number=eq.${lead.phone}`,
          },
          () => fetchMessages(),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  const handleSend = async () => {
    if (!lead?.phone || !reply.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-whatsapp-message",
        { body: { to: lead.phone, message: reply.trim(), lead_id: lead.id } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setReply("");
      toast.success("Message sent");
      await fetchMessages();
      onMessageSent?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {lead?.name || lead?.phone || "Conversation"}
          </SheetTitle>
          <SheetDescription>
            {lead?.phone}
            {lead?.company_name ? ` · ${lead.company_name}` : ""}
          </SheetDescription>
          {(lead?.requirement || lead?.target_locations) && (
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              {lead?.requirement && <div><b>Requirement:</b> {lead.requirement}</div>}
              {lead?.target_locations && (
                <div><b>Locations:</b> {lead.target_locations}</div>
              )}
            </div>
          )}
        </SheetHeader>

        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/20"
        >
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No messages yet
            </div>
          )}
          {messages.map((m) => {
            const out = m.message_type === "outgoing";
            return (
              <div
                key={m.id}
                className={`flex ${out ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    out
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.message_body || <i className="opacity-70">(empty)</i>}
                  </div>
                  <div className="text-[10px] opacity-70 mt-1 flex gap-2 items-center">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    {out && m.status && (
                      <Badge variant="secondary" className="h-4 text-[9px]">
                        {m.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-3 space-y-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply…"
            rows={2}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !reply.trim()}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}