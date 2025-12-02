import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { MapPin, Upload, CheckCircle, Camera } from 'lucide-react';
import { formatDate } from '@/utils/plans';

export default function MounterTasks() {
  const [operations, setOperations] = useState<any[]>([]);
  const [currentMounter, setCurrentMounter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);

  useEffect(() => {
    fetchMounterData();
  }, []);

  const fetchMounterData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get current mounter record
    const { data: mounter } = await supabase
      .from('mounters')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (mounter) {
      setCurrentMounter(mounter);

      // Fetch assigned operations
      const { data: opsData } = await supabase
        .from('operations')
        .select(
          `
          *,
          media_assets (*),
          campaigns (campaign_name, client_name)
        `
        )
        .eq('mounter_id', mounter.id)
        .in('status', ['Assigned', 'In Progress'])
        .order('assigned_at', { ascending: false });

      setOperations(opsData || []);
    }

    setLoading(false);
  };

  const handleCheckIn = async (operationId: string) => {
    try {
      const { error } = await supabase
        .from('operations')
        .update({
          status: 'In Progress',
          check_in_time: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) throw error;

      toast({
        title: 'Checked In',
        description: 'You have successfully checked in for this task',
      });

      fetchMounterData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUploadPhoto = async (
    operationId: string,
    photoType: string,
    file: File
  ) => {
    try {
      const filePath = `operations/${operationId}/${photoType}-${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('campaign-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('campaign-proofs').getPublicUrl(filePath);

      // Insert photo record
      const { error: insertError } = await supabase.from('operation_photos').insert({
        operation_id: operationId,
        file_path: publicUrl,
        photo_type: photoType,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Photo Uploaded',
        description: `${photoType} photo uploaded successfully`,
      });

      fetchMounterData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async (operationId: string) => {
    if (!confirm('Mark this task as completed?')) return;

    try {
      const { error } = await supabase
        .from('operations')
        .update({
          status: 'Completed',
          verified_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) throw error;

      toast({
        title: 'Task Completed',
        description: 'Installation marked as completed',
      });

      fetchMounterData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (!currentMounter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">No mounter profile found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your administrator to set up your mounter profile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">My Tasks</h1>
          <p className="text-muted-foreground">
            Welcome, {currentMounter.name} • {operations.length} active tasks
          </p>
        </div>

        <div className="space-y-4">
          {operations.map((operation) => (
            <Card key={operation.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {operation.media_assets?.id || 'N/A'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {operation.campaigns?.campaign_name} • {operation.campaigns?.client_name}
                    </p>
                  </div>
                  <Badge
                    className={
                      operation.status === 'In Progress' ? 'bg-yellow-500' : 'bg-blue-500'
                    }
                  >
                    {operation.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Location */}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {operation.media_assets?.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {operation.media_assets?.city}, {operation.media_assets?.area}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Date */}
                  <p className="text-sm">
                    <span className="text-muted-foreground">Assigned:</span>{' '}
                    {formatDate(operation.assigned_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {operation.status === 'Assigned' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCheckIn(operation.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                    )}

                    {operation.status === 'In Progress' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOperation(operation.id)}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photos
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkCompleted(operation.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Completed
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Photo upload section */}
                  {selectedOperation === operation.id && (
                    <div className="pt-4 border-t space-y-3">
                      <p className="text-sm font-medium">Upload Required Photos:</p>
                      {['geotag', 'traffic_left', 'traffic_right', 'newspaper'].map(
                        (photoType) => (
                          <div key={photoType} className="flex items-center gap-2">
                            <span className="text-sm capitalize min-w-[120px]">
                              {photoType.replace('_', ' ')}:
                            </span>
                            <Input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadPhoto(operation.id, photoType, file);
                                }
                              }}
                            />
                          </div>
                        )
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOperation(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {operations.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No active tasks assigned</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
