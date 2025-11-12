import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportUser {
  email: string;
  username: string;
  password: string;
  role: string;
}

export default function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const template = [
      { email: "user@example.com", username: "John Doe", password: "SecurePass123!", role: "sales" },
      { email: "user2@example.com", username: "Jane Smith", password: "SecurePass456!", role: "operations" },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "user_import_template.xlsx");

    toast({
      title: "Template downloaded",
      description: "Fill in the template and upload to import users",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ImportUser>(worksheet);

      if (jsonData.length === 0) {
        throw new Error("No data found in file");
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process users one by one
      for (const user of jsonData) {
        try {
          // Validate required fields
          if (!user.email || !user.username || !user.password || !user.role) {
            throw new Error(`Missing required fields for ${user.email || 'unknown user'}`);
          }

          // Create user via Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              username: user.username,
            },
          });

          if (authError) throw authError;

          if (!authData.user) {
            throw new Error("User creation failed");
          }

          // Update profile
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ username: user.username })
            .eq("id", authData.user.id);

          if (profileError) throw profileError;

          // Assign role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert([{
              user_id: authData.user.id,
              role: user.role as 'admin' | 'sales' | 'operations' | 'finance' | 'user',
            }]);

          if (roleError) throw roleError;

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${user.email}: ${error.message}`);
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${results.success} users. ${results.failed} failed.`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Download the template, fill in user details (email, username, password, role), and upload the completed file.
              Valid roles: admin, sales, operations, finance
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div>
            <Label htmlFor="file-upload">Upload Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
              className="mt-2"
            />
          </div>

          {importing && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Importing users...</p>
            </div>
          )}

          {importResults && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Success</p>
                  <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="mt-4">
                  <Label>Errors:</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {importResults.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
