import jsPDF from 'jspdf';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';

interface CompanyInfo {
  name: string;
  gstin?: string;
}

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

/**
 * Renders the Authorized Signatory block (bottom-right aligned)
 * Includes company stamp image if available
 */
export async function renderAuthorizedSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = 14;
  const x = pageWidth - rightMargin - 50;

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // "For," text
  doc.text('For,', x, yPos);
  
  // Company name (bold)
  doc.setFont('NotoSans', 'bold');
  doc.text(company.name, x, yPos + 5);
  
  // Stamp image
  const stampBase64 = await loadStampImage();
  if (stampBase64) {
    try {
      const stampSize = 22;
      doc.addImage(stampBase64, 'PNG', x + 25, yPos + 6, stampSize, stampSize);
    } catch (e) {
      console.warn('Failed to embed stamp in signatory:', e);
    }
  }

  // Signature line/space
  doc.setFont('NotoSans', 'normal');
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(x, yPos + 20, x + 50, yPos + 20);
  
  // "Authorized Signatory" label
  doc.setFontSize(8);
  doc.text('Authorized Signatory', x, yPos + 25);
}

/**
 * Renders ONLY the authorized signatory block (right side)
 * Footer must NOT contain seller GST/PAN
 */
export async function renderSellerFooterWithSignatory(
  doc: jsPDF,
  company: CompanyInfo,
  yPos: number
): Promise<void> {
  await renderAuthorizedSignatory(doc, company, yPos);
}
