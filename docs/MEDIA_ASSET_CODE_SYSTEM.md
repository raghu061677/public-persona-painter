# Media Asset Code Generation System

## Overview

The Go-Ads 360° system uses a standardized code format for media assets: **MNS-{CITY}-{MEDIA_TYPE}-{SEQUENCE}**

Example: `MNS-HYD-BQS-0032`

## Code Structure

```
MNS - HYD - BQS - 0032
 │     │     │      │
 │     │     │      └─ 4-digit sequence (auto-incremented per city+type)
 │     │     └──────── Media type code (BQS, BB, UNP, CNT, etc.)
 │     └────────────── City code (3 letters: HYD, KNR, HSB, etc.)
 └──────────────────── Prefix (Matrix Network Solutions)
```

## Media Type Codes

| Media Type | Code | Example |
|------------|------|---------|
| Bus Shelter | BQS | MNS-HYD-BQS-0001 |
| Billboard | BB | MNS-HYD-BB-0001 |
| Unipole | UNP | MNS-HYD-UNP-0001 |
| Cantilever | CNT | MNS-HYD-CNT-0001 |

## City Codes

| City | Code | Example |
|------|------|---------|
| Hyderabad | HYD | MNS-HYD-BQS-0001 |
| Karimnagar | KNR | MNS-KNR-BQS-0001 |
| Husnabad | HSB | MNS-HSB-BQS-0001 |
| Sircilla | SRL | MNS-SRL-BQS-0001 |

## Database Schema

### media_asset_sequences Table

```sql
CREATE TABLE public.media_asset_sequences (
  prefix TEXT NOT NULL DEFAULT 'MNS',
  city TEXT NOT NULL,
  media_type TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (prefix, city, media_type)
);
```

### media_assets Table

- `id` (TEXT, PK) - Legacy asset ID (e.g., HYD-BQS-0011)
- `media_asset_code` (TEXT) - New MNS code (e.g., MNS-HYD-BQS-0032)

## Code Generation Function

```sql
CREATE OR REPLACE FUNCTION public.generate_mns_code(
  p_city TEXT,
  p_media_type TEXT
)
RETURNS TEXT
```

**How it works:**
1. Extracts 3-letter city code from city name
2. Maps media type to standard abbreviation
3. Gets next sequence number from `media_asset_sequences` table
4. Auto-increments sequence
5. Returns formatted code: `MNS-{CITY}-{TYPE}-{SEQ}`

## Frontend Implementation

### MediaAssetNew.tsx

**Workflow:**
1. User selects city and media type
2. User fills in asset details
3. On form submit:
   - Asset is created in `media_assets` table
   - `generate_mns_code()` function is called
   - Generated code is updated in `media_asset_code` column
4. User can then upload photos

**Key Code:**
```typescript
// Generate MNS code after successful asset creation
const { data: mnsCode, error: codeError } = await supabase.rpc('generate_mns_code', {
  p_city: formData.city,
  p_media_type: formData.media_type,
});

if (mnsCode) {
  await supabase
    .from('media_assets')
    .update({ media_asset_code: mnsCode })
    .eq('id', formData.id);
}
```

### MediaAssetEdit.tsx

**Read-Only Display:**
```typescript
{formData.media_asset_code && (
  <div className="input-group">
    <Label>MNS Code</Label>
    <Input 
      value={formData.media_asset_code} 
      readOnly 
      disabled 
      className="font-mono" 
    />
  </div>
)}
```

## Duplicate Detection

### Edge Function: check-duplicate-asset-codes

```bash
# Call via:
supabase functions invoke check-duplicate-asset-codes
```

**Returns:**
```json
{
  "success": true,
  "summary": {
    "total_assets_checked": 20,
    "duplicates_found": 0,
    "assets_without_code": 0,
    "duplicates": [],
    "missing_codes": []
  }
}
```

## Rules & Best Practices

### ✅ DO

- Use `generate_mns_code()` function for all new assets
- Keep existing legacy `id` field intact
- Display MNS code in UI alongside legacy ID
- Make MNS code read-only in edit forms

### ❌ DON'T

- Don't regenerate codes during edit
- Don't allow manual code entry
- Don't change the format (always MNS-{CITY}-{TYPE}-{SEQ})
- Don't modify existing sequences manually

## Migration Path

### For Existing Assets

Existing assets keep their legacy IDs (e.g., `HYD-BQS-0011`). New MNS codes are generated only for:
- New assets created after migration
- Existing assets when explicitly requested

### Coexistence

Both `id` and `media_asset_code` fields exist:
- `id` - Original UUID or legacy code (used in URLs, QR codes, relationships)
- `media_asset_code` - New MNS code (used for human-readable reference)

## Testing

### Check for Duplicates

```sql
SELECT media_asset_code, COUNT(*)
FROM media_assets
WHERE media_asset_code IS NOT NULL
GROUP BY media_asset_code
HAVING COUNT(*) > 1;
```

### Verify Sequences

```sql
SELECT * FROM media_asset_sequences
ORDER BY city, media_type;
```

### Test Code Generation

```sql
SELECT generate_mns_code('Hyderabad', 'Bus Shelter');
-- Expected: MNS-HYD-BQS-0001 (or next available number)
```

## Troubleshooting

### Issue: Duplicate codes appearing

**Solution:**
```sql
-- Reset sequence to max existing
UPDATE media_asset_sequences
SET next_value = (
  SELECT MAX(CAST(SUBSTRING(media_asset_code FROM '[0-9]+$') AS INTEGER)) + 1
  FROM media_assets
  WHERE media_asset_code LIKE 'MNS-' || city || '-' || media_type || '-%'
)
WHERE prefix = 'MNS';
```

### Issue: Missing MNS code for new asset

**Check:**
1. Verify function was called after insert
2. Check for errors in browser console
3. Verify RLS policies allow update
4. Check sequence table has entry for city+type

## Security

### RLS Policies

```sql
-- Users can read all sequences
CREATE POLICY "Users can read sequences"
  ON public.media_asset_sequences
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update sequences (via function only)
CREATE POLICY "Users can update sequences"
  ON public.media_asset_sequences
  FOR ALL
  TO authenticated
  USING (true);
```

### Function Security

The `generate_mns_code()` function is defined with:
- `SECURITY DEFINER` - Runs with creator privileges
- `SET search_path = public` - Prevents search path attacks

## Future Enhancements

- [ ] Batch code generation for existing assets
- [ ] Code format customization per company
- [ ] Automatic code assignment on import
- [ ] Code history/audit trail
- [ ] QR code integration with MNS code
