# Power Bill Expense Splitting - Documentation

## Overview

The automatic expense splitting feature generates individual expense records for each asset sharing a power connection, based on configured percentage allocations. This ensures accurate cost tracking and financial reporting for shared electrical connections.

## How It Works

### 1. Detection of Shared Connections

When a power bill is created for an asset:
- The system checks if the asset's **Unique Service Number (USN)** is shared with other assets
- If multiple assets have the same USN, they are identified as sharing a power connection

### 2. Automatic Expense Generation

Upon saving a new power bill, the system automatically:
1. Checks for shared connections
2. Retrieves the sharing configuration (percentage splits)
3. Calls the `split-power-bill-expenses` edge function
4. Generates individual expense records for each asset

### 3. Expense Calculation

For each shared asset, expenses are calculated as:

```
Split Amount = (Bill Amount × Share Percentage) / 100
GST Amount = Split Amount × 18%
Total Expense = Split Amount + GST Amount
```

**Example:**
- Bill Amount: ₹10,000
- Asset A Share: 60% = ₹6,000 + ₹1,080 GST = ₹7,080
- Asset B Share: 40% = ₹4,000 + ₹720 GST = ₹4,720

## Configuration

### Setting Up Sharing Relationships

1. **Navigate to Power Bills Sharing Dashboard**
   - Go to `/admin/power-bills-sharing`
   - View all detected shared connections

2. **Configure Split Percentages**
   - Click "Configure Split" for any shared connection
   - Adjust percentage for each asset
   - Ensure total equals 100%
   - Save configuration

3. **Automatic Application**
   - The sharing configuration is stored with the bill record
   - New bills automatically use the configured splits
   - Expenses are generated immediately after bill creation

## Manual Expense Generation

If automatic generation fails or you need to regenerate expenses:

1. **From Asset Detail Page**
   - Go to the asset's Power Bills tab
   - Find the shared bill in the table
   - Click "Split Expenses" button
   - Confirm the action

2. **From Sharing Dashboard**
   - View shared connection details
   - Access bill history
   - Trigger manual expense generation

## Edge Function: `split-power-bill-expenses`

### Purpose
Generates split expense records for power bills with shared assets.

### Input Parameters
```json
{
  "bill_id": "uuid",
  "action": "create" | "update"
}
```

### Process Flow
1. Fetch bill details from `asset_power_bills`
2. Validate bill is primary and has sharing configuration
3. Calculate split amounts based on percentages
4. Delete old expenses if action is "update"
5. Insert new expense records in `expenses` table
6. Log activity for audit trail

### Response
```json
{
  "success": true,
  "message": "Expenses generated successfully",
  "expenses_created": 3,
  "expense_ids": ["uuid1", "uuid2", "uuid3"]
}
```

## Database Schema

### asset_power_bills
New columns for sharing:
- `is_primary_bill`: Boolean (true for master bill)
- `shared_with_assets`: JSONB array of `{asset_id, share_percentage}`
- `share_percentage`: Numeric (0-100)
- `primary_bill_id`: UUID reference to primary bill

### expenses
Expense records include:
- `bill_id`: Reference to source power bill
- `category`: "Electricity"
- `amount`: Base amount (without GST)
- `gst_amount`: 18% GST
- `total_amount`: Amount + GST
- `vendor_name`: "TGSPDCL"
- `bill_month`: Month name (e.g., "November 2024")
- `notes`: Details about sharing (asset ID and percentage)

## Best Practices

### 1. Configure Sharing Before Bills
- Set up sharing relationships when you first identify shared connections
- This ensures automatic expense generation for all future bills

### 2. Review Generated Expenses
- Check the Expenses module after bill creation
- Verify split amounts match configured percentages
- Reconcile with actual costs periodically

### 3. Handle Configuration Changes
- When updating sharing percentages:
  - Old expenses are NOT automatically updated
  - Only new bills use the updated configuration
  - Manually adjust historical expenses if needed

### 4. Monitor Shared Connections
- Regularly review the Sharing Dashboard
- Update configurations as assets are added/removed
- Maintain documentation of sharing rationale

## Troubleshooting

### Expenses Not Generated
**Symptom:** No expenses appear after bill creation

**Solutions:**
1. Check if asset has duplicate USN with other assets
2. Verify sharing configuration is set up
3. Ensure total percentages equal 100%
4. Try manual expense generation button
5. Check browser console for errors

### Incorrect Split Amounts
**Symptom:** Expense amounts don't match expected splits

**Solutions:**
1. Review sharing configuration percentages
2. Verify bill amount is correct
3. Check if GST calculation is included (18%)
4. Regenerate expenses if configuration was updated

### Multiple Expense Records
**Symptom:** Duplicate expenses for same bill

**Solutions:**
1. This should not happen - edge function deletes old expenses
2. Check if manual expenses were created separately
3. Delete duplicate records manually
4. Report issue for investigation

## Validation Rules

### Sharing Configuration
- Total percentages MUST equal 100%
- Each asset MUST have a percentage > 0
- Minimum 2 assets required for sharing

### Expense Generation
- Only primary bills generate expenses
- Bills without sharing configuration are skipped
- Failed generations log warnings but don't block bill save

## API Integration

### Calling the Function Programmatically

```typescript
const { data, error } = await supabase.functions.invoke(
  'split-power-bill-expenses',
  {
    body: {
      bill_id: 'bill-uuid',
      action: 'create'
    }
  }
);

if (error) {
  console.error('Split failed:', error);
} else {
  console.log(`Generated ${data.expenses_created} expenses`);
}
```

### Error Handling

The function returns structured errors:
```json
{
  "success": false,
  "error": "Invalid share percentages: total is 95%, must be 100%"
}
```

Always check the `success` field before proceeding.

## Future Enhancements

Planned improvements:
1. **Historical Recalculation:** Bulk update old expenses when configuration changes
2. **Approval Workflow:** Require approval before expense generation
3. **Notifications:** Alert finance team when expenses are generated
4. **Audit Trail:** Enhanced logging of all split calculations
5. **Report Generation:** Dedicated reports for shared connection costs

## Support

For issues or questions:
1. Check this documentation
2. Review the Sharing Dashboard
3. Check activity logs in Admin section
4. Contact system administrator
