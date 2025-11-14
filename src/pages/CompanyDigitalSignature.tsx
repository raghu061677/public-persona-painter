import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FileSignature, Save, Upload, Download } from "lucide-react";

export default function CompanyDigitalSignature() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [signatureUploaded, setSignatureUploaded] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "Digital signature settings have been updated.",
    });
    setLoading(false);
  };

  const handleUpload = () => {
    setSignatureUploaded(true);
    toast({
      title: "Signature Uploaded",
      description: "Your digital signature has been uploaded successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Digital Signature</h1>
        <p className="text-sm text-muted-foreground">
          Add digital signatures to your invoices and documents
        </p>
      </div>

      <InfoAlert>
        <strong>Professional Touch:</strong> Digital signatures add authenticity and professionalism to your business documents.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="Signature Configuration"
          description="Upload and manage your digital signature"
        />

        <InputRow label="Enable Digital Signature" description="Add signature to generated documents">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </InputRow>

        {enabled && (
          <>
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/50">
                <div className="flex flex-col items-center justify-center space-y-4">
                  {signatureUploaded ? (
                    <>
                      <div className="w-full h-32 bg-white rounded border-2 border-dashed flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Signature Preview</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Replace
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">Upload Signature Image</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          PNG or JPG, transparent background recommended
                        </p>
                        <Button onClick={handleUpload} size="sm">
                          Choose File
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <InputRow label="Authorized Signatory Name" description="Name to display under signature">
                <Input placeholder="e.g., Managing Director" />
              </InputRow>

              <InputRow label="Designation" description="Title of the authorized person">
                <Input placeholder="e.g., CEO / Director" />
              </InputRow>
            </div>
          </>
        )}
      </SettingsCard>

      {enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="Signature Placement"
              description="Configure where signature appears on documents"
            />

            <InputRow label="Add to Invoices" description="Show signature on all invoices">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Add to Estimates" description="Show signature on quotations">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Add to Work Orders" description="Show signature on work orders">
              <Switch />
            </InputRow>

            <InputRow label="Add to Agreements" description="Show signature on client agreements">
              <Switch />
            </InputRow>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="Signature Format"
              description="Customize signature appearance"
            />

            <InputRow label="Position" description="Signature placement on document">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
              </select>
            </InputRow>

            <InputRow label="Size" description="Signature size on document">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </InputRow>
          </SettingsCard>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
