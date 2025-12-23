import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Eye, Merge, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DuplicateGroup {
  group_id: string;
  asset_ids: string[];
  duplicate_count: number;
  city: string;
  area: string;
  location: string;
  media_type: string;
}

interface AssetDetail {
  id: string;
  media_asset_code: string | null;
  location: string;
  area: string;
  city: string;
  media_type: string;
  created_at: string;
  card_rate: number | null;
}

export default function MediaAssetDuplicates() {
  const navigate = useNavigate();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupAssets, setGroupAssets] = useState<Record<string, AssetDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mergeDialog, setMergeDialog] = useState<{ masterId: string; duplicateIds: string[] } | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_media_asset_duplicates');
      
      if (error) {
        console.error('Error fetching duplicates:', error);
        toast.error('Failed to fetch duplicate assets');
        return;
      }

      setDuplicateGroups((data || []) as DuplicateGroup[]);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to fetch duplicate assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchGroupAssets = async (groupId: string, assetIds: string[]) => {
    if (groupAssets[groupId]) return;

    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, media_asset_code, location, area, city, media_type, created_at, card_rate')
        .in('id', assetIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setGroupAssets(prev => ({
        ...prev,
        [groupId]: data as AssetDetail[],
      }));
    } catch (err) {
      console.error('Error fetching group assets:', err);
      toast.error('Failed to load asset details');
    }
  };

  const handleExpand = async (group: DuplicateGroup) => {
    if (expandedGroup === group.group_id) {
      setExpandedGroup(null);
      return;
    }
    setExpandedGroup(group.group_id);
    await fetchGroupAssets(group.group_id, group.asset_ids);
  };

  const handleMerge = async () => {
    if (!mergeDialog) return;

    setActionLoading('merge');
    try {
      const { masterId, duplicateIds } = mergeDialog;
      const now = new Date().toISOString();

      // Update duplicates with remarks and deactivate
      for (const dupId of duplicateIds) {
        await supabase
          .from('media_assets')
          .update({
            is_active: false,
            remarks: `Merged into ${masterId} on ${now}`,
            duplicate_group_id: null,
          })
          .eq('id', dupId);
      }

      toast.success(`Merged ${duplicateIds.length} duplicate(s) into master asset`);
      setMergeDialog(null);
      fetchDuplicates();
    } catch (err) {
      console.error('Error merging assets:', err);
      toast.error('Failed to merge assets');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSoftDelete = async (assetId: string) => {
    setActionLoading(assetId);
    try {
      const now = new Date().toISOString();
      
      await supabase
        .from('media_assets')
        .update({
          is_active: false,
          remarks: `Soft deleted as duplicate on ${now}`,
        })
        .eq('id', assetId);

      toast.success('Asset marked as inactive');
      fetchDuplicates();
    } catch (err) {
      console.error('Error deleting asset:', err);
      toast.error('Failed to delete asset');
    } finally {
      setActionLoading(null);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicate_count - 1, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/media-assets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Duplicate Media Assets</h1>
            <p className="text-muted-foreground">
              Detect and manage duplicate assets based on location attributes
            </p>
          </div>
        </div>
        <Button onClick={fetchDuplicates} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Duplicate Summary
          </CardTitle>
          <CardDescription>
            Assets with matching location, media type, and coordinates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{duplicateGroups.length}</div>
              <div className="text-sm text-muted-foreground">Duplicate Groups</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{totalDuplicates}</div>
              <div className="text-sm text-muted-foreground">Total Duplicates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : duplicateGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-green-600 text-lg font-medium">No duplicates found!</div>
            <p className="text-muted-foreground mt-2">
              All your media assets are unique based on location attributes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group) => (
            <Card key={group.group_id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleExpand(group)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="destructive">{group.duplicate_count} duplicates</Badge>
                    <div>
                      <div className="font-medium">{group.location}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.area}, {group.city} • {group.media_type}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedGroup === group.group_id ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </div>

              {expandedGroup === group.group_id && groupAssets[group.group_id] && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Asset Code</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Card Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupAssets[group.group_id].map((asset, idx) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            {idx === 0 ? (
                              <Badge variant="default" className="bg-green-600">MASTER</Badge>
                            ) : (
                              <Badge variant="secondary">DUPLICATE</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {asset.media_asset_code || asset.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>{asset.location}</TableCell>
                          <TableCell>
                            {format(new Date(asset.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>₹{asset.card_rate?.toLocaleString() || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/media-assets/${asset.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {idx === 0 && groupAssets[group.group_id].length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMergeDialog({
                                      masterId: asset.id,
                                      duplicateIds: groupAssets[group.group_id]
                                        .slice(1)
                                        .map((a) => a.id),
                                    });
                                  }}
                                >
                                  <Merge className="h-4 w-4 mr-1" />
                                  Merge All
                                </Button>
                              )}
                              {idx > 0 && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={actionLoading === asset.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSoftDelete(asset.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={!!mergeDialog} onOpenChange={() => setMergeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Duplicate Assets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {mergeDialog?.duplicateIds.length} duplicate asset(s) as inactive
              and add a merge note to their remarks. The master asset will remain active.
              <br /><br />
              <strong>Note:</strong> Plans and campaigns linked to duplicates will NOT be affected.
              You may need to manually update them if required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={actionLoading === 'merge'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading === 'merge' ? 'Merging...' : 'Confirm Merge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
