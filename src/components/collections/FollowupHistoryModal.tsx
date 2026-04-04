import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Followup {
  id: string;
  note: string;
  contact_type: string;
  follow_up_date: string;
  next_follow_up_date: string | null;
  promised_payment_date: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  invoiceNo: string;
  followups: Followup[];
}

const contactColors: Record<string, string> = {
  Call: "bg-blue-100 text-blue-800",
  Email: "bg-green-100 text-green-800",
  WhatsApp: "bg-emerald-100 text-emerald-800",
  Meeting: "bg-purple-100 text-purple-800",
};

export function FollowupHistoryModal({ open, onClose, invoiceNo, followups }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow-up History — {invoiceNo}</DialogTitle>
        </DialogHeader>
        {followups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No follow-ups recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {followups.map((f) => (
              <div key={f.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={contactColors[f.contact_type] || ""}>{f.contact_type}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(f.created_at), "dd MMM yyyy, hh:mm a")}</span>
                </div>
                <p className="text-sm">{f.note}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {f.next_follow_up_date && <span>Next: {format(new Date(f.next_follow_up_date), "dd MMM yyyy")}</span>}
                  {f.promised_payment_date && <span>Promised: {format(new Date(f.promised_payment_date), "dd MMM yyyy")}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
