import { Share2, Download, FileText, FileSpreadsheet, FileImage, Copy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface PublicPlanShareProps {
  plan: any;
  publicUrl: string;
}

export function PublicPlanShare({ plan, publicUrl }: PublicPlanShareProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard",
    });
  };

  const handleWhatsAppShare = () => {
    const message = `View Media Plan: ${plan.plan_name}\n\nClient: ${plan.client_name}\nTotal Investment: ₹${plan.grand_total.toLocaleString()}\n\n${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmailShare = () => {
    const subject = `Media Plan: ${plan.plan_name}`;
    const body = `Hi,\n\nPlease review the media plan for ${plan.client_name}.\n\nPlan Details:\n- Plan Name: ${plan.plan_name}\n- Plan ID: ${plan.id}\n- Total Investment: ₹${plan.grand_total.toLocaleString()}\n- Campaign Period: ${new Date(plan.start_date).toLocaleDateString()} to ${new Date(plan.end_date).toLocaleDateString()}\n\nView the complete plan with interactive map and asset details:\n${publicUrl}\n\nBest regards,\nGo-Ads 360° Team`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleDownload = (type: 'ppt' | 'excel' | 'pdf') => {
    const exportLinks = plan.export_links || {};
    const url = exportLinks[`${type}_url`];
    
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Not available",
        description: `${type.toUpperCase()} export is not available for this plan`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Share Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Link
        </Button>
        <Button variant="outline" size="sm" onClick={handleWhatsAppShare} className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
          <Share2 className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>
        <Button variant="outline" size="sm" onClick={handleEmailShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Email
        </Button>
      </div>

      {/* Download Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleDownload('ppt')}>
          <FileImage className="mr-2 h-4 w-4" />
          Download PPT
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleDownload('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleDownload('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
