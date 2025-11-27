import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ImportInvoices() {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [itemsFile, setItemsFile] = useState<File | null>(null);
  const [invoicesPreview, setInvoicesPreview] = useState<any[]>([]);
  const [itemsPreview, setItemsPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (file: File, setter: Function) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setter(results.data);
      },
      error: (error) => {
        toast({
          title: "Parse Error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };

  const handleSubmit = async () => {
    if (!invoiceFile || !itemsFile) {
      toast({
        title: "Missing Files",
        description: "Please upload both CSV files.",
        variant: "destructive",
      });
      return;
    }

    if (invoicesPreview.length === 0 || itemsPreview.length === 0) {
      toast({
        title: "No Data",
        description: "CSV files appear to be empty or invalid.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-finance-data', {
        body: {
          invoices: invoicesPreview,
          items: itemsPreview
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `Imported ${data?.invoices_created || 0} invoices with ${data?.items_created || 0} line items.`,
      });

      // Reset form
      setInvoiceFile(null);
      setItemsFile(null);
      setInvoicesPreview([]);
      setItemsPreview([]);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileSpreadsheet className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Import Invoices</h1>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload two CSV files: one for invoice headers and one for invoice line items.
          Make sure the invoice IDs match between both files.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Upload FY25-26 Invoices</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Invoice Headers (invoices_import.csv)
            </label>
            <input
              type="file"
              accept=".csv"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setInvoiceFile(file);
                if (file) parseCSV(file, setInvoicesPreview);
              }}
            />
            {invoiceFile && (
              <p className="text-sm text-muted-foreground">
                {invoiceFile.name} ({invoicesPreview.length} records)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Invoice Line Items (invoice_items_import.csv)
            </label>
            <input
              type="file"
              accept=".csv"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setItemsFile(file);
                if (file) parseCSV(file, setItemsPreview);
              }}
            />
            {itemsFile && (
              <p className="text-sm text-muted-foreground">
                {itemsFile.name} ({itemsPreview.length} records)
              </p>
            )}
          </div>

          {invoicesPreview.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">Invoice Headers Preview (first 5)</p>
              <pre className="text-xs max-h-48 overflow-auto bg-background p-2 rounded">
                {JSON.stringify(invoicesPreview.slice(0, 5), null, 2)}
              </pre>
            </div>
          )}

          {itemsPreview.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">Line Items Preview (first 5)</p>
              <pre className="text-xs max-h-48 overflow-auto bg-background p-2 rounded">
                {JSON.stringify(itemsPreview.slice(0, 5), null, 2)}
              </pre>
            </div>
          )}

          <Button 
            disabled={loading || !invoiceFile || !itemsFile} 
            onClick={handleSubmit}
            className="w-full"
            size="lg"
          >
            {loading ? "Importing…" : "Import Invoices"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
