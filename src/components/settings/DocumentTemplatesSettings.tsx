import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, FileSpreadsheet, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentTemplatesSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({
    ppt_terms: "",
    excel_terms: "",
    general_terms: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("plan_terms_settings")
      .select("*")
      .single();

    if (data) {
      setSettings({
        ppt_terms: (data as any).ppt_terms || "",
        excel_terms: (data as any).excel_terms || "",
        general_terms: (data as any).general_terms || "",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("plan_terms_settings")
        .upsert({
          id: 1,
          ppt_terms: settings.ppt_terms,
          excel_terms: settings.excel_terms,
          general_terms: settings.general_terms,
        } as any);

      if (error) throw error;

      toast({
        title: "Terms & conditions saved",
        description: "Document template settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">
            <FileText className="h-4 w-4 mr-2" />
            General Terms
          </TabsTrigger>
          <TabsTrigger value="ppt">
            <Download className="h-4 w-4 mr-2" />
            PPT Template
          </TabsTrigger>
          <TabsTrigger value="excel">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div>
            <Label htmlFor="generalTerms">General Terms & Conditions</Label>
            <Textarea
              id="generalTerms"
              value={settings.general_terms}
              onChange={(e) => setSettings({ ...settings, general_terms: e.target.value })}
              placeholder="Enter general terms & conditions that apply to all documents"
              className="mt-2 min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              These terms will be displayed on plans and quotations
            </p>
          </div>
        </TabsContent>

        <TabsContent value="ppt" className="space-y-4">
          <div>
            <Label htmlFor="pptTerms">PPT Export Terms & Conditions</Label>
            <Textarea
              id="pptTerms"
              value={settings.ppt_terms}
              onChange={(e) => setSettings({ ...settings, ppt_terms: e.target.value })}
              placeholder="Enter terms & conditions for PowerPoint exports"
              className="mt-2 min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be included in the final slide of PPT exports
            </p>
          </div>
        </TabsContent>

        <TabsContent value="excel" className="space-y-4">
          <div>
            <Label htmlFor="excelTerms">Excel Export Terms & Conditions</Label>
            <Textarea
              id="excelTerms"
              value={settings.excel_terms}
              onChange={(e) => setSettings({ ...settings, excel_terms: e.target.value })}
              placeholder="Enter terms & conditions for Excel exports"
              className="mt-2 min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be included in a separate sheet in Excel exports
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Saving..." : "Save All Terms"}
      </Button>
    </div>
  );
}
