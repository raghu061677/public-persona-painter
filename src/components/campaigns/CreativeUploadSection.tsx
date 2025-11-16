import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Creative {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  status: string;
  created_at: string;
}

interface CreativeUploadSectionProps {
  campaignId: string;
  onUploadComplete?: () => void;
}

export function CreativeUploadSection({ campaignId, onUploadComplete }: CreativeUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatives();
  }, [campaignId]);

  const fetchCreatives = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_creatives')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error) {
      console.error('Error fetching creatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload JPG, PNG, or PDF files only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${campaignId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('campaign-creatives')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-creatives')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('campaign_creatives')
        .insert({
          campaign_id: campaignId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Creative uploaded",
        description: "Creative has been uploaded successfully",
      });

      fetchCreatives();
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload creative",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (creativeId: string, fileUrl: string) => {
    try {
      // Delete from storage
      const fileName = fileUrl.split('/').slice(-2).join('/');
      await supabase.storage
        .from('campaign-creatives')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('campaign_creatives')
        .delete()
        .eq('id', creativeId);

      if (error) throw error;

      toast({
        title: "Creative deleted",
        description: "Creative has been deleted successfully",
      });

      fetchCreatives();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete creative",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Creatives</CardTitle>
        <CardDescription>Upload and manage creative files for this campaign</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Input
            id="creative-upload"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Label
            htmlFor="creative-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Uploading...' : 'Click to upload creative'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or PDF (max 10MB)
              </p>
            </div>
          </Label>
        </div>

        {/* Creatives List */}
        {creatives.length > 0 ? (
          <div className="space-y-2">
            {creatives.map((creative) => (
              <div
                key={creative.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{creative.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(creative.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(creative.status)}>
                    {creative.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(creative.file_url, '_blank')}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(creative.id, creative.file_url)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No creatives uploaded yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
