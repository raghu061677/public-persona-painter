import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PhotoData {
  id: string;
  asset_id: string;
  campaign_id: string | null;
  client_id: string | null;
  photo_url: string;
  category: string;
  uploaded_at: string;
}

interface ExportOptions {
  groupBy: 'asset' | 'campaign' | 'client' | 'category';
  layout: 'grid' | 'list' | 'detailed';
  photosPerPage: number;
  includeMetadata: boolean;
  title: string;
}

export async function generatePhotoReportPDF(
  photos: PhotoData[],
  options: ExportOptions
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - (2 * margin);

  // Helper function to load image
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Add header
  const addHeader = (pageNum: number, totalPages: number) => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title || 'Photo Report', margin, margin);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 7);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 30, margin);
    
    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, margin + 10, pageWidth - margin, margin + 10);
  };

  // Group photos
  const groupedPhotos = groupPhotos(photos, options.groupBy);
  
  let currentY = margin + 15;
  let pageNum = 1;
  const totalPages = Math.ceil(photos.length / options.photosPerPage);

  addHeader(pageNum, totalPages);

  // Process each group
  for (const [groupKey, groupPhotos] of Object.entries(groupedPhotos)) {
    // Add group header
    if (currentY > pageHeight - 40) {
      doc.addPage();
      pageNum++;
      currentY = margin + 15;
      addHeader(pageNum, totalPages);
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(groupKey, margin, currentY);
    currentY += 8;

    // Render photos based on layout
    if (options.layout === 'grid') {
      currentY = await renderGridLayout(doc, groupPhotos, currentY, pageWidth, pageHeight, margin, usableWidth, loadImage);
    } else if (options.layout === 'list') {
      currentY = await renderListLayout(doc, groupPhotos, currentY, pageWidth, pageHeight, margin, usableWidth, options.includeMetadata, loadImage);
    } else if (options.layout === 'detailed') {
      currentY = await renderDetailedLayout(doc, groupPhotos, currentY, pageWidth, pageHeight, margin, usableWidth, loadImage);
    }

    currentY += 10; // Space between groups
  }

  // Add footer on last page
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Total Photos: ${photos.length} | Organized by: ${options.groupBy}`,
    margin,
    pageHeight - 10
  );

  return doc;
}

function groupPhotos(photos: PhotoData[], groupBy: string): Record<string, PhotoData[]> {
  const groups: Record<string, PhotoData[]> = {};

  photos.forEach(photo => {
    let key = 'Uncategorized';
    
    switch(groupBy) {
      case 'asset':
        key = photo.asset_id || 'No Asset';
        break;
      case 'campaign':
        key = photo.campaign_id || 'No Campaign';
        break;
      case 'client':
        key = photo.client_id || 'No Client';
        break;
      case 'category':
        key = photo.category || 'General';
        break;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(photo);
  });

  return groups;
}

async function renderGridLayout(
  doc: jsPDF,
  photos: PhotoData[],
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  usableWidth: number,
  loadImage: (url: string) => Promise<HTMLImageElement>
): Promise<number> {
  const cols = 3;
  const imgSize = (usableWidth - ((cols - 1) * 5)) / cols; // 5mm gap between images
  let currentY = startY;
  let col = 0;

  for (const photo of photos) {
    try {
      const img = await loadImage(photo.photo_url);
      const x = margin + (col * (imgSize + 5));

      if (currentY + imgSize > pageHeight - margin) {
        doc.addPage();
        currentY = margin + 15;
        col = 0;
      }

      // Draw image
      doc.addImage(img, 'JPEG', x, currentY, imgSize, imgSize, undefined, 'FAST');
      
      // Add small label below
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const label = photo.category;
      doc.text(label, x + (imgSize / 2), currentY + imgSize + 4, { align: 'center' });

      col++;
      if (col >= cols) {
        col = 0;
        currentY += imgSize + 8;
      }
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  if (col > 0) {
    currentY += imgSize + 8;
  }

  return currentY;
}

async function renderListLayout(
  doc: jsPDF,
  photos: PhotoData[],
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  usableWidth: number,
  includeMetadata: boolean,
  loadImage: (url: string) => Promise<HTMLImageElement>
): Promise<number> {
  const thumbnailSize = 30;
  let currentY = startY;

  for (const photo of photos) {
    try {
      if (currentY + thumbnailSize + 10 > pageHeight - margin) {
        doc.addPage();
        currentY = margin + 15;
      }

      const img = await loadImage(photo.photo_url);
      
      // Thumbnail
      doc.addImage(img, 'JPEG', margin, currentY, thumbnailSize, thumbnailSize, undefined, 'FAST');
      
      // Info next to thumbnail
      const textX = margin + thumbnailSize + 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(photo.asset_id, textX, currentY + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Category: ${photo.category}`, textX, currentY + 11);
      
      if (includeMetadata) {
        doc.text(`Uploaded: ${new Date(photo.uploaded_at).toLocaleDateString()}`, textX, currentY + 17);
      }

      currentY += thumbnailSize + 8;
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  return currentY;
}

async function renderDetailedLayout(
  doc: jsPDF,
  photos: PhotoData[],
  startY: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  usableWidth: number,
  loadImage: (url: string) => Promise<HTMLImageElement>
): Promise<number> {
  let currentY = startY;
  const imgWidth = usableWidth * 0.6;
  const imgHeight = imgWidth * 0.75; // 4:3 aspect ratio

  for (const photo of photos) {
    try {
      if (currentY + imgHeight + 40 > pageHeight - margin) {
        doc.addPage();
        currentY = margin + 15;
      }

      const img = await loadImage(photo.photo_url);
      
      // Center the image
      const imgX = margin + (usableWidth - imgWidth) / 2;
      doc.addImage(img, 'JPEG', imgX, currentY, imgWidth, imgHeight, undefined, 'MEDIUM');
      
      currentY += imgHeight + 5;

      // Metadata table
      const metadata = [
        ['Asset ID', photo.asset_id],
        ['Category', photo.category],
        ['Uploaded', new Date(photo.uploaded_at).toLocaleString()],
      ];

      if (photo.campaign_id) {
        metadata.push(['Campaign', photo.campaign_id]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: metadata,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 30 },
          1: { cellWidth: 'auto' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  return currentY;
}
