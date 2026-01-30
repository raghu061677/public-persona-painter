import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { renderReceiptPDF } from "@/lib/receipts/templates/registry";
import type { ReceiptData } from "@/lib/receipts/templates/types";

interface Receipt {
  id: string;
  receipt_no: string;
  company_id: string | null;
  client_id: string | null;
  invoice_id: string | null;
  payment_record_id: string | null;
  receipt_date: string;
  amount_received: number;
  payment_method: string | null;
  reference_no: string | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string | null;
  created_by: string | null;
}

export function useReceiptGeneration() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  /**
   * Fetch receipt by payment record ID
   */
  const getReceiptByPaymentId = async (paymentRecordId: string): Promise<Receipt | null> => {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("payment_record_id", paymentRecordId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching receipt:", error);
      return null;
    }

    return data as Receipt | null;
  };

  /**
   * Fetch all receipts for an invoice
   */
  const getReceiptsByInvoiceId = async (invoiceId: string): Promise<Receipt[]> => {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("receipt_date", { ascending: false });

    if (error) {
      console.error("Error fetching receipts:", error);
      return [];
    }

    return (data || []) as Receipt[];
  };

  /**
   * Generate and download receipt PDF
   */
  const downloadReceiptPDF = async (
    receiptId: string,
    templateKey: string = "receipt_default"
  ): Promise<void> => {
    setGenerating(true);

    try {
      // Fetch receipt with related data
      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", receiptId)
        .single();

      if (receiptError || !receipt) {
        throw new Error("Receipt not found");
      }

      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_no, invoice_date, total_amount, balance_due")
        .eq("id", receipt.invoice_id)
        .single();

      if (invoiceError || !invoice) {
        throw new Error("Invoice not found");
      }

      // Fetch client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, name, gst_number, billing_address_line1, billing_city, billing_state, billing_pincode")
        .eq("id", receipt.client_id)
        .single();

      if (clientError) {
        console.warn("Client not found, using defaults");
      }

      // Fetch company settings
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("organization_name, gstin, logo_url")
        .limit(1)
        .maybeSingle();

      // Fetch logo if available
      let logoBase64: string | undefined;
      if (orgSettings?.logo_url) {
        try {
          const response = await fetch(orgSettings.logo_url);
          const blob = await response.blob();
          logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn("Could not load logo:", e);
        }
      }

      // Build receipt data
      const receiptData: ReceiptData = {
        receipt: {
          id: receipt.id,
          receipt_no: receipt.receipt_no,
          receipt_date: receipt.receipt_date,
          amount_received: Number(receipt.amount_received) || 0,
          payment_method: receipt.payment_method || "N/A",
          reference_no: receipt.reference_no || undefined,
          notes: receipt.notes || undefined,
        },
        invoice: {
          id: invoice.id,
          invoice_no: invoice.invoice_no || invoice.id,
          invoice_date: invoice.invoice_date,
          total_amount: Number(invoice.total_amount) || 0,
          balance_due: Number(invoice.balance_due) || 0,
        },
        client: {
          id: client?.id || "",
          name: client?.name || "Client",
          gst_number: client?.gst_number || undefined,
          billing_address_line1: client?.billing_address_line1 || undefined,
          billing_city: client?.billing_city || undefined,
          billing_state: client?.billing_state || undefined,
          billing_pincode: client?.billing_pincode || undefined,
        },
        company: {
          name: orgSettings?.organization_name || "Matrix Network Solutions",
          gstin: orgSettings?.gstin || "36AATFM4107H2Z3",
        },
        orgSettings,
        logoBase64,
      };

      // Generate PDF
      const pdfBlob = await renderReceiptPDF(receiptData, templateKey);

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt-${receipt.receipt_no}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Receipt Downloaded",
        description: `Receipt ${receipt.receipt_no} has been downloaded`,
      });
    } catch (error: any) {
      console.error("Error generating receipt PDF:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to generate receipt PDF",
      });
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Download receipt by payment record ID (convenience method)
   */
  const downloadReceiptByPaymentId = async (
    paymentRecordId: string,
    templateKey: string = "receipt_default"
  ): Promise<void> => {
    const receipt = await getReceiptByPaymentId(paymentRecordId);
    if (!receipt) {
      toast({
        variant: "destructive",
        title: "Receipt Not Found",
        description: "No receipt found for this payment",
      });
      return;
    }
    await downloadReceiptPDF(receipt.id, templateKey);
  };

  return {
    generating,
    getReceiptByPaymentId,
    getReceiptsByInvoiceId,
    downloadReceiptPDF,
    downloadReceiptByPaymentId,
  };
}
