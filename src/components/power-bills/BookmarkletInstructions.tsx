import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BookmarkletInstructions() {
  const bookmarkletCode = `javascript:(function(){
    const data = {
      consumerName: document.querySelector('input[name="ConsumerName"]')?.value || 
                    document.querySelector('td:contains("Consumer Name")')?.nextElementSibling?.textContent?.trim() ||
                    Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Consumer Name'))?.nextElementSibling?.textContent?.trim(),
      serviceNumber: document.querySelector('input[name="ServiceConnectionNo"]')?.value ||
                     Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Service Connection No'))?.nextElementSibling?.textContent?.trim(),
      uniqueServiceNumber: document.querySelector('input[name="UniqueServiceNumber"]')?.value ||
                          Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Unique Service'))?.nextElementSibling?.textContent?.trim(),
      eroName: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('ERO'))?.nextElementSibling?.textContent?.trim(),
      sectionName: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Section'))?.nextElementSibling?.textContent?.trim(),
      units: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Units'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9]/g, ''),
      billMonth: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Bill Month'))?.nextElementSibling?.textContent?.trim(),
      billDate: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Bill Date'))?.nextElementSibling?.textContent?.trim(),
      dueDate: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Due Date'))?.nextElementSibling?.textContent?.trim(),
      currentMonthBill: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Current Month'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g, ''),
      acdAmount: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('ACD'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g, ''),
      arrears: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Arrear'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g, ''),
      totalAmount: Array.from(document.querySelectorAll('td')).find(td => td.textContent.includes('Total Amount'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g, '')
    };
    localStorage.setItem('tgspdcl_bill_data', JSON.stringify(data));
    localStorage.setItem('tgspdcl_bill_timestamp', Date.now().toString());
    alert('✅ Bill data captured! Opening Go-Ads...');
    window.open('${window.location.origin}/admin/power-bills', '_blank');
  })();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    toast({
      title: "Copied!",
      description: "Bookmarklet code copied to clipboard",
    });
  };

  const bookmarkletLink = `javascript:(function(){const data={consumerName:document.querySelector('input[name="ConsumerName"]')?.value||document.querySelector('td:contains("Consumer Name")')?.nextElementSibling?.textContent?.trim()||Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Consumer Name'))?.nextElementSibling?.textContent?.trim(),serviceNumber:document.querySelector('input[name="ServiceConnectionNo"]')?.value||Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Service Connection No'))?.nextElementSibling?.textContent?.trim(),uniqueServiceNumber:document.querySelector('input[name="UniqueServiceNumber"]')?.value||Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Unique Service'))?.nextElementSibling?.textContent?.trim(),eroName:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('ERO'))?.nextElementSibling?.textContent?.trim(),sectionName:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Section'))?.nextElementSibling?.textContent?.trim(),units:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Units'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9]/g,''),billMonth:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Bill Month'))?.nextElementSibling?.textContent?.trim(),billDate:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Bill Date'))?.nextElementSibling?.textContent?.trim(),dueDate:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Due Date'))?.nextElementSibling?.textContent?.trim(),currentMonthBill:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Current Month'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g,''),acdAmount:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('ACD'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g,''),arrears:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Arrear'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g,''),totalAmount:Array.from(document.querySelectorAll('td')).find(td=>td.textContent.includes('Total Amount'))?.nextElementSibling?.textContent?.trim()?.replace(/[^0-9.]/g,'')};localStorage.setItem('tgspdcl_bill_data',JSON.stringify(data));localStorage.setItem('tgspdcl_bill_timestamp',Date.now().toString());alert('✅ Bill data captured! Opening Go-Ads...');window.open('${window.location.origin}/admin/power-bills','_blank');})();`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Quick Bill Import Bookmarklet
        </CardTitle>
        <CardDescription>
          One-click bill data extraction from TGSPDCL portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This bookmarklet allows you to instantly capture bill data from the TGSPDCL portal and import it into Go-Ads with one click.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold">How to Install:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Drag the button below to your browser's bookmarks bar</li>
            <li>Or right-click it and select "Bookmark this link"</li>
            <li>Name it "Capture TGSPDCL Bill"</li>
          </ol>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={bookmarkletLink}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            onClick={(e) => {
              e.preventDefault();
              alert('Drag this button to your bookmarks bar, or right-click and select "Bookmark this link"');
            }}
          >
            📋 Capture TGSPDCL Bill
          </a>
          <Button variant="outline" size="icon" onClick={copyBookmarklet}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">How to Use:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Go to <a href="https://tgsouthernpower.org/paybillonline" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TGSPDCL Portal</a></li>
            <li>Enter your Unique Service Number and view the bill</li>
            <li>Click the bookmarklet in your bookmarks bar</li>
            <li>Bill data will be automatically captured and Go-Ads will open</li>
            <li>Go to any asset's power bills section and click "Fetch Bill"</li>
            <li>The captured data will auto-fill - just verify and save!</li>
          </ol>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Note: The captured data is stored temporarily in your browser and expires after 5 minutes for security.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
