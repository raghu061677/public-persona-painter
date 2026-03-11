import jsPDF from 'jspdf';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';

// Cache the stamp image base64 after first load
let cachedStampBase64: string | null = null;

async function loadStampImage(): Promise<string | undefined> {
  if (cachedStampBase64) return cachedStampBase64;
  try {
    const res = await fetch(stampImageUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedStampBase64 = base64;
    return base64;
  } catch {
    return undefined;
  }
}

interface ApprovalFooterOptions {
  companyName: string;
  leftTitle?: string;        // Default: "Client Approval"
  rightTitle?: string;       // Not rendered as title - right box uses "For," pattern
  stampBase64?: string;      // Pre-loaded stamp, if undefined will auto-load
  pageWidth: number;
  leftMargin: number;
  rightMargin: number;
}

/**
 * Renders TWO SIDE-BY-SIDE BORDERED BOXES for Client Approval + Authorized Signatory.
 * Matches the visual style of Bank Details / Subtotal boxes used in all Go-Ads PDFs.
 *
 * Left box:  Client Approval (Name, Designation, Signature, Date)
 * Right box: For, [Company Name], [stamp], signature line, Authorized Signatory
 *
 * Returns the Y position after the boxes.
 */
export async function renderApprovalFooter(
  doc: jsPDF,
  yPos: number,
  options: ApprovalFooterOptions
): Promise<number> {
  const { companyName, pageWidth, leftMargin, rightMargin } = options;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const boxGap = 6;
  const boxW = (contentWidth - boxGap) / 2;
  const boxH = 55;
  const leftBoxX = leftMargin;
  const rightBoxX = leftMargin + boxW + boxGap;
  const pad = 4; // inner padding

  // Border style matching Bank Details / Total boxes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  // ===== LEFT BOX: Client Approval =====
  doc.rect(leftBoxX, yPos, boxW, boxH, 'S');

  // Title
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(30, 58, 138); // Deep blue
  doc.text(options.leftTitle || 'Client Approval', leftBoxX + pad, yPos + 7);

  // Fields
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  let ly = yPos + 16;
  const fieldSpacing = 8;
  const lineW = boxW - pad * 2 - 25;

  const fields = ['Name', 'Designation', 'Signature', 'Date'];
  fields.forEach((field) => {
    doc.text(`${field}:`, leftBoxX + pad, ly);
    // Dotted underline
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(leftBoxX + pad + 22, ly + 0.5, leftBoxX + pad + 22 + lineW, ly + 0.5);
    ly += fieldSpacing;
  });

  // ===== RIGHT BOX: Authorized Signatory =====
  doc.rect(rightBoxX, yPos, boxW, boxH, 'S');

  // "For," text
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('For,', rightBoxX + pad, yPos + 7);

  // Company name (bold)
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.text(companyName, rightBoxX + pad, yPos + 13);

  // Stamp image (centered in right box middle area)
  let stampImg = options.stampBase64;
  if (!stampImg) {
    stampImg = await loadStampImage();
  }
  if (stampImg) {
    try {
      const stampSize = 22;
      const stampX = rightBoxX + boxW - stampSize - pad - 2;
      const stampY = yPos + 17;
      doc.addImage(stampImg, 'PNG', stampX, stampY, stampSize, stampSize);
    } catch (e) {
      console.warn('Failed to embed stamp in approval footer:', e);
    }
  }

  // Signature line
  const sigLineY = yPos + 40;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(rightBoxX + pad, sigLineY, rightBoxX + boxW - pad, sigLineY);

  // "Authorized Signatory" label
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Authorized Signatory', rightBoxX + pad, sigLineY + 5);

  // Date line
  doc.setTextColor(0, 0, 0);
  doc.text('Date: _______________', rightBoxX + pad, sigLineY + 11);

  return yPos + boxH + 5;
}
