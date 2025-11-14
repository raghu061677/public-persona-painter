# Phase 1 Refactoring - Migration Guide

## ✅ Completed Tasks

### 1. Database Migration ✅
- ✅ Added `photo_type` enum to `media_photos` table
- ✅ Migrated all data from `operations_photos` to `media_photos`
- ✅ Updated RLS policies for unified photo access control
- ✅ Created performance indexes
- ✅ Deleted `campaign-photos` storage bucket
- ⚠️ **operations_photos table NOT dropped yet** (safety - verify migration first)

### 2. Type Transformers ✅
- ✅ Created `src/utils/typeTransformers.ts` with full type safety
- Functions available:
  - `transformKeys()` - snake_case → camelCase (with recursion)
  - `transformKeysToSnake()` - camelCase → snake_case
  - `transformSupabaseResponse()` - Auto-transform Supabase queries
  - `prepareForSupabase()` - Prepare data for insert/update

### 3. Unified Photo Upload System ✅
- ✅ Created `src/lib/photos/` module structure:
  - `types.ts` - Shared TypeScript interfaces
  - `core.ts` - Unified upload/delete logic
  - `assetProofs.ts` - Asset-specific wrappers
  - `operationsProofs.ts` - Operations-specific wrappers
  - `index.ts` - Clean exports

### 4. Unified Photo Gallery Component ✅
- ✅ Created `src/components/common/UnifiedPhotoGallery.tsx`
- Features:
  - Displays both asset proofs and operations proofs
  - Validation badges with tooltips
  - GPS indicators
  - Delete functionality with confirmation
  - Photo viewer modal
  - Slideshow support

---

## 📋 Next Steps (Manual Tasks)

### Step 1: Update Component Imports

Replace old photo gallery components with the new unified one:

#### Files to Update:

**1. `src/pages/MediaAssetEdit.tsx`**
```typescript
// OLD:
import { PhotoGallery } from "@/components/media-assets/PhotoGallery";

// NEW:
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";

// In render:
// OLD:
<PhotoGallery 
  assetId={id!} 
  photos={formData.images.photos} 
  onPhotoDeleted={fetchAsset}
/>

// NEW:
<UnifiedPhotoGallery
  photos={formData.images.photos}
  onPhotoDeleted={fetchAsset}
  canDelete={isAdmin}
  bucket="media-assets"
  title="Asset Photos"
/>
```

**2. `src/pages/CampaignAssetProofs.tsx`**
```typescript
// OLD:
import { OperationsPhotoGallery } from "@/components/operations/OperationsPhotoGallery";

// NEW:
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";

// In render:
// OLD:
<OperationsPhotoGallery
  photos={photos}
  onPhotoDeleted={handlePhotoDeleted}
  canDelete={isAdmin}
/>

// NEW:
<UnifiedPhotoGallery
  photos={photos}
  onPhotoDeleted={handlePhotoDeleted}
  canDelete={isAdmin}
  bucket="operations-photos"
  title="Campaign Proof Photos"
  description="Installation verification photos"
/>
```

### Step 2: Update Photo Upload Imports

Replace old upload functions with new unified system:

#### Files to Update:

**1. `src/components/media-assets/PhotoUploadSection.tsx`**
```typescript
// OLD:
import { uploadProofPhoto } from "@/lib/media-assets/uploadProofs";

// NEW:
import { uploadAssetProof } from "@/lib/photos";

// In upload handler:
// OLD:
const result = await uploadProofPhoto(assetId, file, onProgress);

// NEW:
const result = await uploadAssetProof(assetId, file, onProgress);
```

**2. `src/components/operations/PhotoUploadSection.tsx`**
```typescript
// OLD:
import { uploadOperationsProofs } from "@/lib/operations/uploadProofs";

// NEW:
import { uploadOperationsProofBatch } from "@/lib/photos";

// In upload handler:
// OLD:
await uploadOperationsProofs(campaignId, assetId, files, onProgress);

// NEW:
await uploadOperationsProofBatch(campaignId, assetId, files, onProgress);
```

**3. `src/pages/MobileOpsUpload.tsx`**
```typescript
// OLD:
import { uploadProofPhoto } from "@/lib/media-assets/uploadProofs";

// NEW:
import { uploadAssetProof } from "@/lib/photos";
```

### Step 3: Update Database Queries

Update all queries that reference `operations_photos` to use `media_photos`:

#### Example Pattern:
```typescript
// OLD:
const { data } = await supabase
  .from('operations_photos')
  .select('*')
  .eq('campaign_id', campaignId);

// NEW:
const { data } = await supabase
  .from('media_photos')
  .select('*')
  .eq('campaign_id', campaignId)
  .eq('photo_type', 'operations_proof');
```

#### Files to Search & Update:
- `src/pages/CampaignAssetProofs.tsx`
- `src/components/campaigns/ExportProofPDFDialog.tsx`
- `src/lib/operations/generateProofPPT.ts`
- `src/pages/PhotoGallery.tsx`

### Step 4: Verify Migration

Before dropping `operations_photos`:

```sql
-- Run these verification queries:

-- 1. Check migration count
SELECT COUNT(*) FROM operations_photos;
SELECT COUNT(*) FROM media_photos WHERE photo_type = 'operations_proof';
-- These should match!

-- 2. Check data integrity
SELECT 
  photo_type, 
  COUNT(*) as count,
  MIN(uploaded_at) as earliest,
  MAX(uploaded_at) as latest
FROM media_photos 
GROUP BY photo_type;

-- 3. Spot check sample records
SELECT * FROM operations_photos LIMIT 5;
SELECT * FROM media_photos WHERE photo_type = 'operations_proof' LIMIT 5;
```

### Step 5: Drop Old Table (ONLY AFTER VERIFICATION)

```sql
-- Only run this after confirming the above steps!
DROP TABLE IF EXISTS operations_photos CASCADE;
```

### Step 6: Delete Old Files

After confirming everything works:

```bash
# Delete duplicate components
rm src/components/media-assets/PhotoGallery.tsx
rm src/components/operations/OperationsPhotoGallery.tsx

# Delete old upload functions (after updating all references)
rm src/lib/media-assets/uploadProofs.ts
rm src/lib/operations/uploadProofs.ts

# Delete gallery folder (empty after PhotoApprovalDialog/PhotoExportDialog moved)
# Only if these are moved to src/components/common/
# rm -rf src/components/gallery/
```

---

## 🎯 Usage Examples

### Using Type Transformers

```typescript
import { transformSupabaseResponse, prepareForSupabase } from '@/utils/typeTransformers';

// Fetching data (database → frontend)
const { data } = await supabase.from('campaigns').select('*');
const campaigns = transformSupabaseResponse(data);
// Now use: campaigns[0].clientId instead of campaigns[0].client_id

// Inserting data (frontend → database)
const frontendData = {
  assetId: 'HYD-001',
  clientName: 'ABC Corp',
  campaignDate: new Date()
};
await supabase.from('campaigns').insert(prepareForSupabase(frontendData));
```

### Using New Photo Upload System

```typescript
import { 
  uploadAssetProof, 
  uploadOperationsProofBatch,
  deletePhoto 
} from '@/lib/photos';

// Upload asset proof
const result = await uploadAssetProof(
  'HYD-BSQ-001',
  imageFile,
  (progress) => console.log(`${progress.stage}: ${progress.progress}%`)
);

// Upload operations proofs
const results = await uploadOperationsProofBatch(
  'CAM-2025-001',
  'HYD-BSQ-001',
  [file1, file2, file3],
  (fileIndex, progress) => console.log(`File ${fileIndex + 1}: ${progress.stage}`)
);

// Delete photo
await deletePhoto(photoId, photoUrl, 'media-assets');
```

### Using Unified Photo Gallery

```typescript
import { UnifiedPhotoGallery } from '@/components/common/UnifiedPhotoGallery';

// In component:
<UnifiedPhotoGallery
  photos={photos}
  onPhotoDeleted={refetchPhotos}
  canDelete={hasRole('admin')}
  bucket="media-assets"
  title="Installation Photos"
  description="Proof of installation with validation"
/>
```

---

## ⚠️ Breaking Changes

### 1. Photo Upload Function Signatures

**Old:**
```typescript
uploadProofPhoto(assetId: string, file: File, onProgress?: (n: number) => void)
```

**New:**
```typescript
uploadAssetProof(assetId: string, file: File, onProgress?: (p: UploadProgress) => void)
```

**Migration:** Update progress callbacks to use `UploadProgress` object instead of number.

### 2. Database Schema

- `operations_photos` table replaced by `media_photos` with `photo_type` filter
- All queries must filter by `photo_type = 'operations_proof'`

### 3. Photo Gallery Props

**Old (OperationsPhotoGallery):**
```typescript
{ photos, onPhotoDeleted, canDelete }
```

**New (UnifiedPhotoGallery):**
```typescript
{ photos, onPhotoDeleted, canDelete, bucket, title?, description? }
```

---

## 🐛 Troubleshooting

### Issue: Photos not showing after migration
**Solution:** Check RLS policies. Ensure user has proper role for `photo_type`.

### Issue: Upload fails with "table not found"
**Solution:** Old code still references `operations_photos`. Update to `media_photos`.

### Issue: TypeScript errors on transformed data
**Solution:** Ensure you're using `transformSupabaseResponse()` on all Supabase queries.

### Issue: Slideshow not working
**Solution:** Photos need `uploaded_at` field. Make sure it's included in SELECT.

---

## 📊 Impact Analysis

### Code Reduction:
- **Before:** 2 upload functions (347 + 179 lines) = 526 lines
- **After:** 1 unified system (294 lines) = **44% reduction**

### Component Consolidation:
- **Before:** 2 PhotoGallery components
- **After:** 1 UnifiedPhotoGallery = **50% reduction**

### Database Optimization:
- **Before:** Photos stored in 2 tables (duplicate storage)
- **After:** Single source of truth = **No duplicate storage**

### Storage Cleanup:
- **Deleted:** 1 unused bucket (`campaign-photos`)

---

## ✅ Testing Checklist

- [ ] Asset photo upload works
- [ ] Operations photo upload works  
- [ ] Photo gallery displays correctly for both types
- [ ] Photo deletion works (with RLS check)
- [ ] Validation badges show correctly
- [ ] GPS indicators appear when available
- [ ] Slideshow functionality works
- [ ] Old queries updated to new table structure
- [ ] Type transformers work on all Supabase queries
- [ ] No references to `operations_photos` in code
- [ ] No references to old upload functions

---

**Next Phase:** Power Bills Consolidation (7 pages → 4 pages)
