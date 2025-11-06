import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Trash2, Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSignedUrl } from "@/utils/storage";
import { logAudit } from "@/utils/auditLog";
import { Badge } from "@/components/ui/badge";

interface ClientDocument {
  id: string;
  client_id: string;
  document_type: string;
  document_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  notes: string | null;
}

interface ClientDocumentsProps {
  clientId: string;
  clientName: string;
}

const DOCUMENT_TYPES = [
  { value: "KYC", label: "KYC Document" },
  { value: "GST_Certificate", label: "GST Certificate" },
  { value: "PAN_Card", label: "PAN Card" },
  { value: "Aadhar_Card", label: "Aadhar Card" },
  { value: "Company_Registration", label: "Company Registration" },
  { value: "Contract", label: "Contract" },
  { value: "Agreement", label: "Agreement" },
  { value: "Invoice", label: "Invoice" },
  { value: "Other", label: "Other" },
];

export function ClientDocuments({ clientId, clientName }: ClientDocumentsProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<ClientDocument | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("KYC");
  const [documentName, setDocumentName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (clientId) {
      fetchDocuments();
    }
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      if (!documentName) {
        setDocumentName(file.name.split(".")[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !documentName) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Generate unique file path
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${clientId}/${Date.now()}_${documentType}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from("client_documents")
        .insert({
          client_id: clientId,
          document_type: documentType as any,
          document_name: documentName,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user.id,
          notes: notes || null,
        } as any);

      if (dbError) throw dbError;

      // Log audit
      await logAudit({
        action: "document_upload",
        resourceType: "client_documents",
        resourceId: null,
        details: {
          client_id: clientId,
          client_name: clientName,
          document_type: documentType,
          document_name: documentName,
          file_size: selectedFile.size,
        },
      });

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      // Reset form
      setSelectedFile(null);
      setDocumentName("");
      setNotes("");
      setShowUploadDialog(false);
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: ClientDocument) => {
    try {
      const signedUrl = await getSignedUrl("client-documents", doc.file_path, 3600);
      if (signedUrl) {
        setPreviewUrl(signedUrl);
        setPreviewDocument(doc);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate preview URL",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc: ClientDocument) => {
    try {
      const signedUrl = await getSignedUrl("client-documents", doc.file_path, 3600);
      if (signedUrl) {
        const link = document.createElement("a");
        link.href = signedUrl;
        link.download = doc.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await logAudit({
          action: "document_download",
          resourceType: "client_documents",
          resourceId: doc.id,
          details: {
            client_id: clientId,
            client_name: clientName,
            document_name: doc.document_name,
          },
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: ClientDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.document_name}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      await logAudit({
        action: "document_delete",
        resourceType: "client_documents",
        resourceId: doc.id,
        details: {
          client_id: clientId,
          client_name: clientName,
          document_name: doc.document_name,
        },
      });

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Documents</h3>
          <p className="text-sm text-muted-foreground">
            KYC documents, contracts, and agreements
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowUploadDialog(true)}>
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base">{doc.document_name}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mr-2">
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      {formatFileSize(doc.file_size)}
                    </CardDescription>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    {doc.notes && <p className="mt-1 text-xs italic">{doc.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(doc)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload KYC documents, contracts, or agreements for {clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-name">Document Name *</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., GST Certificate 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Select File * (Max 10MB)</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this document"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewDocument?.document_name}</DialogTitle>
            <DialogDescription>
              {previewDocument && getDocumentTypeLabel(previewDocument.document_type)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {previewDocument?.mime_type.startsWith("image/") ? (
              <img src={previewUrl || ""} alt={previewDocument.document_name} className="w-full" />
            ) : previewDocument?.mime_type === "application/pdf" ? (
              <iframe src={previewUrl || ""} className="w-full h-[70vh]" />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Preview not available for this file type
                </p>
                <Button
                  className="mt-4"
                  onClick={() => previewDocument && handleDownload(previewDocument)}
                >
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
