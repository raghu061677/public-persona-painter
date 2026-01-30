import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Receipt, 
  Building2, 
  Calendar, 
  CreditCard, 
  FileText,
  History,
  Paperclip,
  ExternalLink,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { formatINR } from "@/utils/finance";
import { supabase } from "@/integrations/supabase/client";
import type { Expense, ExpenseApprovalLog, ExpenseAttachment } from "@/types/expenses";
import { cn } from "@/lib/utils";

interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

const getApprovalStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-blue-100 text-blue-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
    Paid: "bg-emerald-100 text-emerald-700",
  };
  return variants[status] || "bg-gray-100 text-gray-700";
};

export function ExpenseDetailDialog({ 
  open, 
  onOpenChange, 
  expense 
}: ExpenseDetailDialogProps) {
  const [auditLog, setAuditLog] = useState<ExpenseApprovalLog[]>([]);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense?.id && open) {
      loadAuditLog();
      loadAttachments();
    }
  }, [expense?.id, open]);

  const loadAuditLog = async () => {
    if (!expense?.id) return;
    
    const { data } = await supabase
      .from("expense_approvals_log")
      .select("*")
      .eq("expense_id", expense.id)
      .order("created_at", { ascending: false });
    
    setAuditLog(data || []);
  };

  const loadAttachments = async () => {
    if (!expense?.id) return;
    
    const { data } = await supabase
      .from("expense_attachments")
      .select("*")
      .eq("expense_id", expense.id)
      .order("uploaded_at", { ascending: false });
    
    setAttachments(data || []);
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {expense.expense_no || expense.id}
            </DialogTitle>
            <Badge className={cn("ml-2", getApprovalStatusBadge(expense.approval_status))}>
              {expense.approval_status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tax">Tax Details</TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments ({attachments.length})
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {expense.expense_date 
                      ? format(new Date(expense.expense_date), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{expense.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice No:</span>
                  <p className="font-medium">{expense.invoice_no || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <p className="font-medium">
                    {expense.invoice_date 
                      ? format(new Date(expense.invoice_date), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor Name:</span>
                  <p className="font-medium">{expense.vendor_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">GSTIN:</span>
                  <p className="font-medium font-mono">{expense.vendor_gstin || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Allocation */}
            {expense.allocation_type !== "General" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Allocation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <Badge variant="outline">{expense.allocation_type}</Badge>
                  {expense.campaigns && (
                    <p className="mt-2">
                      Campaign: <strong>{expense.campaigns.campaign_name}</strong>
                    </p>
                  )}
                  {expense.plans && (
                    <p className="mt-2">
                      Plan: <strong>{expense.plans.name}</strong>
                    </p>
                  )}
                  {expense.media_assets && (
                    <p className="mt-2">
                      Asset: <strong>{expense.media_assets.media_asset_code}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <p className="font-medium">{expense.payment_mode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Status:</span>
                  <p className="font-medium">{expense.payment_status}</p>
                </div>
                {expense.paid_date && (
                  <div>
                    <span className="text-muted-foreground">Paid Date:</span>
                    <p className="font-medium">
                      {format(new Date(expense.paid_date), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {expense.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tax" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Tax Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Amount Before Tax</span>
                    <p className="text-lg font-semibold">
                      {formatINR(expense.amount_before_tax || expense.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">GST Type</span>
                    <p className="text-lg font-semibold">{expense.gst_type_enum || "CGST+SGST"}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">CGST</span>
                    <p className="font-medium">{formatINR(expense.cgst)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">SGST</span>
                    <p className="font-medium">{formatINR(expense.sgst)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">IGST</span>
                    <p className="font-medium">{formatINR(expense.igst)}</p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Tax:</span>
                    <span className="font-medium">
                      {formatINR(expense.total_tax || expense.gst_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatINR(expense.total_amount)}</span>
                  </div>
                  
                  {expense.tds_applicable && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-red-600">
                        <span>TDS ({expense.tds_percent}%):</span>
                        <span>-{formatINR(expense.tds_amount)}</span>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Net Payable:</span>
                    <span>{formatINR(expense.net_payable || expense.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No attachments uploaded
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div 
                        key={att.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{att.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {att.uploaded_at 
                                ? format(new Date(att.uploaded_at), "dd MMM yyyy HH:mm")
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => window.open(att.file_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = att.file_url;
                              a.download = att.file_name;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No audit history
                  </p>
                ) : (
                  <div className="space-y-4">
                    {auditLog.map((log) => (
                      <div key={log.id} className="flex gap-4 items-start">
                        <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {log.action}: {log.from_status} → {log.to_status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {log.user_name || "System"} • {" "}
                            {log.created_at 
                              ? format(new Date(log.created_at), "dd MMM yyyy HH:mm")
                              : ""}
                          </p>
                          {log.remarks && (
                            <p className="text-sm mt-1 text-muted-foreground italic">
                              "{log.remarks}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
