import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ProofPhoto {
  url: string;
  tag: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
}

interface CampaignAsset {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  photos?: ProofPhoto[];
}

interface CampaignData {
  id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
  assets: CampaignAsset[];
}

interface OrganizationSettings {
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [30, 64, 175]; // Default blue
};

export async function generateProofPDF(
  campaign: CampaignData,
  selectedPhotos: Set<string>,
  orgSettings: OrganizationSettings
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const primaryColor = hexToRgb(orgSettings.primary_color || '#1e40af');

  // Helper to add header on each page
  const addHeader = (pageNumber: number, totalPages: number) => {
    // Logo (if available)
    if (orgSettings.logo_url) {
      try {
        doc.addImage(orgSettings.logo_url, 'PNG', margin, margin, 30, 10);
      } catch (error) {
        console.error('Failed to add logo:', error);
      }
    }

    // Organization name
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(orgSettings.organization_name || 'Go-Ads 360°', pageWidth - margin, margin + 7, {
      align: 'right',
    });

    // Line separator
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 12, pageWidth - margin, margin + 12);

    // Page number
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
  };

  // Helper to add footer
  const addFooter = () => {
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');

    if (orgSettings.address || orgSettings.phone || orgSettings.email) {
      const footerText = [
        orgSettings.address,
        orgSettings.phone && `Tel: ${orgSettings.phone}`,
        orgSettings.email && `Email: ${orgSettings.email}`,
        orgSettings.gstin && `GSTIN: ${orgSettings.gstin}`,
      ]
        .filter(Boolean)
        .join(' | ');
      doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
    }
  };

  let currentPage = 1;
  const totalPages = 1 + campaign.assets.length; // Cover + asset pages

  // ===== COVER PAGE =====
  addHeader(currentPage, totalPages);

  // Title
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PROOF OF PERFORMANCE', pageWidth / 2, 60, { align: 'center' });

  // Campaign details box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, 80, pageWidth - 2 * margin, 70, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Details', margin + 5, 88);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const detailsY = 95;
  const lineHeight = 7;

  const details = [
    ['Campaign ID:', campaign.id],
    ['Campaign Name:', campaign.campaign_name],
    ['Client:', campaign.client_name],
    ['Period:', `${format(new Date(campaign.start_date), 'dd MMM yyyy')} - ${format(new Date(campaign.end_date), 'dd MMM yyyy')}`],
    ['Status:', campaign.status],
    ['Total Assets:', campaign.assets.length.toString()],
    ['Report Date:', format(new Date(), 'dd MMM yyyy HH:mm')],
  ];

  details.forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 10, detailsY + index * lineHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 50, detailsY + index * lineHeight);
  });

  // Summary box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, 160, pageWidth - 2 * margin, 30, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const selectedAssets = campaign.assets.filter((asset) =>
    asset.photos?.some((photo) => selectedPhotos.has(photo.url))
  );
  doc.text(`${selectedAssets.length} Assets with Proof Photos`, pageWidth / 2, 172, {
    align: 'center',
  });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Photos: ${selectedPhotos.size}`, pageWidth / 2, 182, {
    align: 'center',
  });

  addFooter();

  // ===== ASSET PAGES =====
  for (const asset of selectedAssets) {
    if (!asset.photos) continue;

    const assetPhotos = asset.photos.filter((photo) => selectedPhotos.has(photo.url));
    if (assetPhotos.length === 0) continue;

    doc.addPage();
    currentPage++;
    addHeader(currentPage, totalPages);

    let yPos = margin + 20;

    // Asset header
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 15, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(asset.asset_id, margin + 5, yPos + 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${asset.location}, ${asset.area}, ${asset.city}`, pageWidth - margin - 5, yPos + 10, {
      align: 'right',
    });

    yPos += 20;

    // Asset details table
    autoTable(doc, {
      startY: yPos,
      head: [['Property', 'Value']],
      body: [
        ['Location', `${asset.location}, ${asset.area}`],
        ['City', asset.city],
        ['Media Type', asset.media_type],
        ['Total Photos', assetPhotos.length.toString()],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Photos grid (2 per row)
    const photoWidth = (pageWidth - 3 * margin) / 2;
    const photoHeight = 60;
    let photoX = margin;
    let photoY = yPos;

    for (let i = 0; i < assetPhotos.length; i++) {
      const photo = assetPhotos[i];

      if (photoY + photoHeight + 20 > pageHeight - 20) {
        doc.addPage();
        currentPage++;
        addHeader(currentPage, totalPages);
        photoY = margin + 20;
      }

      try {
        // Add photo
        doc.addImage(photo.url, 'JPEG', photoX, photoY, photoWidth, photoHeight);

        // Photo caption box with semi-transparent background
        doc.setFillColor(0, 0, 0);
        doc.rect(photoX, photoY + photoHeight - 12, photoWidth, 12, 'F');

        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(photo.tag, photoX + 3, photoY + photoHeight - 7);

        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(photo.uploaded_at), 'dd MMM yyyy HH:mm'), photoX + 3, photoY + photoHeight - 3);

        // GPS badge
        if (photo.latitude && photo.longitude) {
          doc.setFillColor(16, 185, 129);
          doc.roundedRect(photoX + photoWidth - 35, photoY + 3, 32, 8, 1, 1, 'F');
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text('📍 GPS', photoX + photoWidth - 33, photoY + 8);

          // GPS coordinates below photo
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `GPS: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`,
            photoX + 3,
            photoY + photoHeight + 4
          );
        }
      } catch (error) {
        console.error('Failed to add photo:', error);
        // Add placeholder
        doc.setFillColor(200, 200, 200);
        doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
        doc.setTextColor(100, 100, 100);
        doc.text('Image unavailable', photoX + photoWidth / 2, photoY + photoHeight / 2, {
          align: 'center',
        });
      }

      // Move to next position
      if ((i + 1) % 2 === 0) {
        photoX = margin;
        photoY += photoHeight + 8;
      } else {
        photoX += photoWidth + margin;
      }
    }

    addFooter();
  }

  // Generate blob
  return doc.output('blob');
}
