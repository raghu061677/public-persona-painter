
# Fix Campaign Delete Functionality on Detail Page

## Problem Analysis

The Campaign Detail page (`/admin/campaigns/[id]`) has two critical issues:

1. **Uses hard delete instead of soft delete** - The `handleDelete` function uses `supabase.delete()` instead of the `soft_delete_campaign` RPC function
2. **Shows deleted campaigns** - No check prevents viewing/interacting with already-deleted campaigns
3. **CAM-2026-1394** is already soft-deleted (deleted on 2026-01-22 with reason "assets are not fetching")

## Implementation Plan

### Phase 1: Replace Hard Delete with Soft Delete

Update `src/pages/CampaignDetail.tsx` to use the `DeleteCampaignDialog` component:

**Changes:**
- Import `DeleteCampaignDialog` component
- Add state for delete dialog visibility
- Replace inline `handleDelete` with dialog-based soft delete
- Pass proper callback to navigate after successful deletion

```text
File: src/pages/CampaignDetail.tsx

1. Add import:
   import { DeleteCampaignDialog } from "@/components/campaigns/DeleteCampaignDialog";

2. Add state:
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);

3. Replace handleDelete function:
   - Remove the current implementation (lines 142-163)
   - Add simple handler: const openDeleteDialog = () => setShowDeleteDialog(true);

4. Update delete button onClick to use openDeleteDialog

5. Add DeleteCampaignDialog component to JSX:
   <DeleteCampaignDialog
     open={showDeleteDialog}
     onOpenChange={setShowDeleteDialog}
     campaignId={campaign.id}
     campaignName={campaign.campaign_name}
     onDeleted={() => navigate('/admin/campaigns')}
   />
```

### Phase 2: Handle Already-Deleted Campaigns

Add a check in the campaign fetch to detect and handle soft-deleted campaigns:

**Option A: Redirect away from deleted campaigns**
```text
In fetchCampaign, after setting campaign data:
if (data.is_deleted) {
  toast({
    title: "Campaign Deleted",
    description: "This campaign has been deleted and is no longer accessible",
    variant: "destructive"
  });
  navigate('/admin/campaigns');
  return;
}
```

**Option B: Show read-only archive view (better for audit)**
```text
- Add a banner at the top indicating campaign is deleted
- Show deletion details (who, when, why)
- Disable all action buttons (delete, edit, export)
- Keep data visible for reference/audit purposes
```

I recommend **Option B** for audit compliance.

### Phase 3: UI for Deleted Campaign State

Add a visual indicator when viewing a deleted campaign:

```text
{campaign.is_deleted && (
  <Alert variant="destructive" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Archived Campaign</AlertTitle>
    <AlertDescription>
      This campaign was deleted on {formatDate(campaign.deleted_at)}.
      Reason: {campaign.deletion_reason || 'No reason provided'}
    </AlertDescription>
  </Alert>
)}
```

Disable action buttons when `campaign.is_deleted` is true.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CampaignDetail.tsx` | Import DeleteCampaignDialog, add state, replace hard delete, add deleted campaign banner, disable actions for deleted campaigns |

## Technical Notes

- The `soft_delete_campaign` RPC function already:
  - Validates campaign is not already deleted
  - Checks for invoices/payments that block deletion
  - Releases booked media assets
  - Records audit trail (who/when/why)
  
- The CORS error mentioned is a Lovable platform issue unrelated to this functionality

## Testing Checklist

1. Navigate to an active campaign - Delete button should open dialog
2. Enter reason and confirm - Campaign should soft-delete, assets released, redirect to list
3. Navigate to a deleted campaign (via direct URL) - Should show deleted banner, actions disabled
4. Deleted campaigns should not appear in main campaigns list
5. Audit trail should be preserved
