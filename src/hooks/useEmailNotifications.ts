import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type NotificationType = 'proof_upload' | 'invoice_reminder' | 'payment_confirmation' | 'campaign_milestone';

interface NotificationData {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
}

export function useEmailNotifications() {
  const { toast } = useToast();

  const sendNotification = async (notification: NotificationData) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: notification,
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        variant: "destructive",
        title: "Notification Failed",
        description: error.message || "Failed to send notification",
      });
      throw error;
    }
  };

  const sendProofUploadNotification = async (
    clientEmail: string,
    clientName: string,
    campaignId: string,
    campaignName: string,
    assetLocation: string,
    photoCount: number,
    portalUrl: string = window.location.origin + '/portal'
  ) => {
    return sendNotification({
      type: 'proof_upload',
      recipientEmail: clientEmail,
      recipientName: clientName,
      data: {
        campaignId,
        campaignName,
        assetLocation,
        photoCount,
        uploadedAt: new Date().toISOString(),
        portalUrl,
      },
    });
  };

  const sendInvoiceReminder = async (
    clientEmail: string,
    clientName: string,
    invoiceId: string,
    balanceDue: number,
    dueDate: string,
    isOverdue: boolean = false,
    portalUrl: string = window.location.origin + '/portal'
  ) => {
    const now = new Date();
    const due = new Date(dueDate);
    const daysOverdue = isOverdue ? Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return sendNotification({
      type: 'invoice_reminder',
      recipientEmail: clientEmail,
      recipientName: clientName,
      data: {
        invoiceId,
        balanceDue,
        dueDate,
        status: isOverdue ? 'overdue' : 'due_soon',
        daysOverdue,
        portalUrl,
      },
    });
  };

  const sendPaymentConfirmation = async (
    clientEmail: string,
    clientName: string,
    invoiceId: string,
    amountPaid: number,
    paymentMethod?: string,
    transactionId?: string,
    portalUrl: string = window.location.origin + '/portal'
  ) => {
    return sendNotification({
      type: 'payment_confirmation',
      recipientEmail: clientEmail,
      recipientName: clientName,
      data: {
        invoiceId,
        amountPaid,
        paymentDate: new Date().toISOString(),
        paymentMethod,
        transactionId,
        portalUrl,
      },
    });
  };

  const sendCampaignMilestone = async (
    clientEmail: string,
    clientName: string,
    campaignId: string,
    campaignName: string,
    milestone: string,
    completionPercentage: number,
    assetsInstalled: number,
    totalAssets: number,
    portalUrl: string = window.location.origin + '/portal'
  ) => {
    return sendNotification({
      type: 'campaign_milestone',
      recipientEmail: clientEmail,
      recipientName: clientName,
      data: {
        campaignId,
        campaignName,
        milestone,
        completionPercentage,
        assetsInstalled,
        totalAssets,
        portalUrl,
      },
    });
  };

  return {
    sendProofUploadNotification,
    sendInvoiceReminder,
    sendPaymentConfirmation,
    sendCampaignMilestone,
  };
}
