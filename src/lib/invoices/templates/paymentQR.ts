// Payment QR Code Generator for Invoice PDFs
// Generates UPI payment QR codes only for unpaid invoices

import QRCode from 'qrcode';
import jsPDF from 'jspdf';

interface PaymentQRConfig {
  upiId: string;
  upiName: string;
  amount: number;
  invoiceNo: string;
  invoiceStatus: string;
}

/**
 * Check if Payment QR should be displayed based on invoice status and balance
 */
export function shouldShowPaymentQR(status: string, balanceDue: number): boolean {
  // Only show QR for Sent or Partial invoices with outstanding balance
  const eligibleStatuses = ['Sent', 'Partial'];
  return eligibleStatuses.includes(status) && balanceDue > 0;
}

/**
 * Generate UPI payment URL string
 */
export function generateUPIPaymentURL(config: PaymentQRConfig): string {
  const { upiId, upiName, amount, invoiceNo } = config;
  
  // UPI URL format: upi://pay?pa=<upi_id>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>
  const params = new URLSearchParams({
    pa: upiId,
    pn: upiName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `Invoice ${invoiceNo}`,
  });
  
  return `upi://pay?${params.toString()}`;
}

/**
 * Generate QR code as base64 data URL
 */
export async function generatePaymentQRBase64(config: PaymentQRConfig): Promise<string | null> {
  try {
    const upiUrl = generateUPIPaymentURL(config);
    
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('Failed to generate payment QR:', error);
    return null;
  }
}

/**
 * Render Payment QR section on PDF document
 * Returns the height used so templates can adjust layout
 */
export async function renderPaymentQRSection(
  doc: jsPDF,
  config: {
    upiId?: string | null;
    upiName?: string | null;
    balanceDue: number;
    invoiceNo: string;
    invoiceStatus: string;
    x: number;
    y: number;
    maxWidth?: number;
  }
): Promise<number> {
  const { upiId, upiName, balanceDue, invoiceNo, invoiceStatus, x, y, maxWidth = 45 } = config;
  
  // Validate: UPI settings must exist
  if (!upiId || !upiName) {
    return 0; // No height used
  }
  
  // Validate: Only show for eligible invoices
  if (!shouldShowPaymentQR(invoiceStatus, balanceDue)) {
    return 0;
  }
  
  // Generate QR code
  const qrBase64 = await generatePaymentQRBase64({
    upiId,
    upiName,
    amount: balanceDue,
    invoiceNo,
    invoiceStatus,
  });
  
  if (!qrBase64) {
    return 0;
  }
  
  const qrSize = 28; // mm
  let currentY = y;
  
  // Title: "Scan to Pay (UPI)"
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 130);
  doc.text('Scan to Pay (UPI)', x + qrSize / 2, currentY, { align: 'center' });
  currentY += 4;
  
  // QR Code image
  try {
    doc.addImage(qrBase64, 'PNG', x, currentY, qrSize, qrSize);
  } catch (e) {
    console.error('Failed to add QR image to PDF:', e);
    return 0;
  }
  currentY += qrSize + 2;
  
  // Payment details below QR
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  // UPI ID
  doc.text(`UPI: ${upiId}`, x + qrSize / 2, currentY, { align: 'center' });
  currentY += 2.5;
  
  // Amount
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(balanceDue);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`Amount: ${formattedAmount}`, x + qrSize / 2, currentY, { align: 'center' });
  currentY += 2.5;
  
  // Invoice reference
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Ref: ${invoiceNo}`, x + qrSize / 2, currentY, { align: 'center' });
  
  // Return total height used
  return currentY - y + 3;
}
