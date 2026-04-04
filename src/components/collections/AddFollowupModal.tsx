import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { note: string; contact_type: string; follow_up_date: string; next_follow_up_date: string; promised_payment_date: string }) => void;
  invoiceNos?: string[];
  loading?: boolean;
}

export function AddFollowupModal({ open, onClose, onSave, invoiceNos, loading }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [note, setNote] = useState("");
  const [contactType, setContactType] = useState("Call");
  const [followUpDate, setFollowUpDate] = useState(today);
  const [nextDate, setNextDate] = useState("");
  const [promisedDate, setPromisedDate] = useState("");

  const handleSave = () => {
    onSave({ note, contact_type: contactType, follow_up_date: followUpDate, next_follow_up_date: nextDate, promised_payment_date: promisedDate });
    setNote(""); setNextDate(""); setPromisedDate("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Follow-up{invoiceNos && invoiceNos.length > 1 ? ` (${invoiceNos.length} invoices)` : ""}</DialogTitle>
        </DialogHeader>
        {invoiceNos && invoiceNos.length <= 3 && (
          <p className="text-xs text-muted-foreground">{invoiceNos.join(", ")}</p>
        )}
        <div className="space-y-4">
          <div>
            <Label>Contact Type</Label>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Call">Call</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Follow-up Date</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div>
            <Label>Note</Label>
            <Textarea placeholder="Details of the follow-up..." value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Next Follow-up Date (optional)</Label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
          <div>
            <Label>Promised Payment Date (optional)</Label>
            <Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!note.trim() || loading}>{loading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
