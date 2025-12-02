import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import PptxGenJS from 'pptxgenjs';

interface ProofPPTv2Props {
  campaignId: string;
  companyId: string;
  onSuccess?: () => void;
}

export function ProofPPTv2({
  campaignId,
  companyId,
  onSuccess,
}: ProofPPTv2Props) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      // Fetch data from edge function
      const { data, error } = await supabase.functions.invoke('generate-proof-ppt-v2', {
        body: {
          campaign_id: campaignId,
          company_id: companyId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to fetch PPT data');

      const pptData = data.data;

      // Create PowerPoint using pptxgenjs
      const pptx = new PptxGenJS();
      pptx.author = pptData.company.name;
      pptx.company = pptData.company.name;
      pptx.title = `${pptData.campaign.name} - Proof of Performance`;

      // Slide 1: Cover Page
      const coverSlide = pptx.addSlide();
      coverSlide.background = { color: '1E40AF' };

      if (pptData.company.logo_url) {
        try {
          coverSlide.addImage({
            path: pptData.company.logo_url,
            x: 4.0,
            y: 0.5,
            w: 2.0,
            h: 0.8,
          });
        } catch (e) {
          console.warn('Could not add logo:', e);
        }
      }

      coverSlide.addText('PROOF OF PERFORMANCE', {
        x: 1.0,
        y: 2.5,
        w: 8.0,
        h: 1.0,
        fontSize: 44,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
      });

      coverSlide.addText(pptData.campaign.name, {
        x: 1.0,
        y: 3.6,
        w: 8.0,
        h: 0.6,
        fontSize: 32,
        color: 'FFFFFF',
        align: 'center',
      });

      coverSlide.addText(`Client: ${pptData.campaign.client_name}`, {
        x: 1.0,
        y: 4.4,
        w: 8.0,
        h: 0.5,
        fontSize: 20,
        color: 'E0E7FF',
        align: 'center',
      });

      coverSlide.addText(
        `Campaign Period: ${new Date(pptData.campaign.start_date).toLocaleDateString('en-IN')} - ${new Date(pptData.campaign.end_date).toLocaleDateString('en-IN')}`,
        {
          x: 1.0,
          y: 5.0,
          w: 8.0,
          h: 0.4,
          fontSize: 16,
          color: 'E0E7FF',
          align: 'center',
        }
      );

      // Add public tracking QR code
      if (pptData.campaign.public_tracking_token) {
        const trackingUrl = `${window.location.origin}/campaign-track/${pptData.campaign.public_tracking_token}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`;
        
        try {
          coverSlide.addImage({
            path: qrUrl,
            x: 4.0,
            y: 5.7,
            w: 1.5,
            h: 1.5,
          });
          coverSlide.addText('Scan for Client Tracking', {
            x: 3.5,
            y: 7.3,
            w: 2.5,
            h: 0.3,
            fontSize: 10,
            color: 'E0E7FF',
            align: 'center',
          });
        } catch (e) {
          console.warn('Could not add tracking QR:', e);
        }
      }

      // Slide 2: Campaign Summary
      const summarySlide = pptx.addSlide();
      summarySlide.addText('Campaign Summary', {
        x: 0.5,
        y: 0.5,
        w: 9.0,
        h: 0.6,
        fontSize: 32,
        bold: true,
        color: '1E40AF',
      });

      const stats = [
        { label: 'Total Assets', value: pptData.summary.total_assets.toString() },
        { label: 'Completed Installations', value: pptData.summary.completed_assets.toString() },
        { label: 'Pending Installations', value: pptData.summary.pending_assets.toString() },
        { label: 'Total Photos', value: pptData.summary.total_photos.toString() },
      ];

      stats.forEach((stat, i) => {
        const y = 1.8 + i * 1.0;
        summarySlide.addShape(pptx.ShapeType.roundRect, {
          x: 1.5,
          y,
          w: 7.0,
          h: 0.7,
          fill: { color: 'F8FAFC' },
          line: { color: '1E40AF', width: 1 },
        });

        summarySlide.addText(stat.label, {
          x: 2.0,
          y: y + 0.15,
          w: 4.0,
          h: 0.4,
          fontSize: 18,
          color: '666666',
        });

        summarySlide.addText(stat.value, {
          x: 6.0,
          y: y + 0.1,
          w: 2.0,
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '1E40AF',
          align: 'right',
        });
      });

      // City-wise distribution
      const cities = Object.entries(pptData.summary.city_distribution);
      if (cities.length > 0) {
        summarySlide.addText('City-wise Distribution:', {
          x: 1.5,
          y: 5.8,
          w: 7.0,
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: '333333',
        });
        summarySlide.addText(
          cities.map(([city, count]) => `${city}: ${count}`).join(' | '),
          {
            x: 1.5,
            y: 6.2,
            w: 7.0,
            h: 0.3,
            fontSize: 12,
            color: '666666',
          }
        );
      }

      // Slide 3: Timeline
      if (pptData.timeline_events.length > 0) {
        const timelineSlide = pptx.addSlide();
        timelineSlide.addText('Campaign Timeline', {
          x: 0.5,
          y: 0.5,
          w: 9.0,
          h: 0.6,
          fontSize: 32,
          bold: true,
          color: '1E40AF',
        });

        pptData.timeline_events.slice(0, 8).forEach((event: any, i: number) => {
          const y = 1.5 + i * 0.7;
          
          // Event time
          const eventDate = new Date(event.event_time).toLocaleString('en-IN');
          timelineSlide.addText(`${eventDate}`, {
            x: 0.7,
            y: y + 0.1,
            w: 3.0,
            h: 0.4,
            fontSize: 10,
            color: '666666',
          });

          // Event title
          timelineSlide.addText(event.event_title || event.event_type, {
            x: 4.0,
            y: y + 0.1,
            w: 5.0,
            h: 0.4,
            fontSize: 11,
            bold: true,
            color: '333333',
          });
        });
      }

      // Asset Slides
      for (const asset of pptData.assets) {
        const assetSlide = pptx.addSlide();

        // A. Media Asset Snapshot
        assetSlide.addText(`Media Code: ${asset.asset_code}`, {
          x: 0.5,
          y: 0.5,
          w: 4.5,
          h: 0.3,
          fontSize: 14,
          bold: true,
        });
        assetSlide.addText(`Media Type: ${asset.media_type}`, { x: 0.5, y: 0.9, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`Direction: ${asset.direction}`, { x: 0.5, y: 1.2, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`Illumination: ${asset.illumination_type}`, { x: 0.5, y: 1.5, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`Size: ${asset.dimensions} (${asset.area} sqft)`, { x: 0.5, y: 1.8, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`Location: ${asset.city} → ${asset.location}`, { x: 0.5, y: 2.1, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`GPS: ${asset.latitude}, ${asset.longitude}`, { x: 0.5, y: 2.4, w: 4.5, h: 0.3, fontSize: 12 });
        assetSlide.addText(`Installed on: ${new Date(asset.installed_at).toLocaleDateString('en-IN')}`, {
          x: 0.5,
          y: 2.7,
          w: 4.5,
          h: 0.3,
          fontSize: 12,
        });

        // B. Google Street View QR Code
        if (asset.google_street_view_url) {
          try {
            assetSlide.addImage({
              path: asset.google_street_view_qr_url,
              x: 5.5,
              y: 0.5,
              w: 2.0,
              h: 2.0,
            });
            assetSlide.addText('Google Street View – Scan to View Location', {
              x: 5.5,
              y: 2.5,
              w: 2.0,
              h: 0.3,
              fontSize: 10,
              align: 'center',
            });
          } catch (e) {
            console.warn('Could not add GSV QR:', e);
          }
        }

        // C. Map Thumbnail (Optional Enhancement)
        if (asset.map_thumbnail_url) {
          try {
            assetSlide.addImage({
              path: asset.map_thumbnail_url,
              x: 7.7,
              y: 0.5,
              w: 2.0,
              h: 2.0,
            });
          } catch (e) {
            console.warn('Could not add map thumbnail:', e);
          }
        }

        // D. Photos Section (4-Grid Layout)
        const photos = [
          { label: 'Newspaper', url: asset.photos?.newspaper },
          { label: 'Geo-tag', url: asset.photos?.geo },
          { label: 'Traffic Left', url: asset.photos?.traffic_left },
          { label: 'Traffic Right', url: asset.photos?.traffic_right },
        ];

        photos.forEach((photo, i) => {
          const row = Math.floor(i / 2);
          const col = i % 2;
          const x = 0.5 + col * 2.5;
          const y = 3.2 + row * 2.0;
          const w = 2.3;
          const h = 1.8;

          if (photo.url) {
            try {
              assetSlide.addImage({ path: photo.url, x, y, w, h });
            } catch (e) {
              console.warn(`Could not add ${photo.label} photo:`, e);
              assetSlide.addText('Photo Missing', { x, y, w, h, align: 'center', valign: 'middle' });
            }
          } else {
            assetSlide.addText('Photo Missing', { x, y, w, h, align: 'center', valign: 'middle' });
          }

          assetSlide.addText(photo.label, {
            x,
            y: y + h - 0.3,
            w,
            h: 0.3,
            fontSize: 10,
            align: 'center',
          });
        });
      }

      // Final Slide - Thank You
      const finalSlide = pptx.addSlide();
      finalSlide.background = { color: '1E40AF' };

      if (pptData.company.logo_url) {
        try {
          finalSlide.addImage({
            path: pptData.company.logo_url,
            x: 4.0,
            y: 1.5,
            w: 2.0,
            h: 0.8,
          });
        } catch (e) {
          console.warn('Could not add logo:', e);
        }
      }

      finalSlide.addText(pptData.company.name, {
        x: 1.0,
        y: 3.0,
        w: 8.0,
        h: 0.6,
        fontSize: 28,
        color: 'FFFFFF',
        align: 'center',
      });

      finalSlide.addText(pptData.company.contact_details || 'Contact Us', {
        x: 1.0,
        y: 3.7,
        w: 8.0,
        h: 0.4,
        fontSize: 16,
        color: 'E0E7FF',
        align: 'center',
      });

      finalSlide.addText('Powered by Go-Ads 360°', {
        x: 1.0,
        y: 6.0,
        w: 8.0,
        h: 0.4,
        fontSize: 14,
        color: 'E0E7FF',
        align: 'center',
      });

      // Save the Presentation
      pptx.writeFile({ fileName: `${pptData.campaign.name}-Proof.pptx` });

      toast({
        title: 'PPT Generated',
        description: 'Proof of Performance PPT has been generated.',
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error generating PPT:', error);
      toast({
        title: 'Error generating PPT',
        description: error.message || 'Failed to generate Proof of Performance PPT.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <>
          Generating PPT <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Export Proof PPT V2
        </>
      )}
    </Button>
  );
}
