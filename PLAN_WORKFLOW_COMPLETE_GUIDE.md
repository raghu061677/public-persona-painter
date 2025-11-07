# Complete Plan Workflow Guide - Go-Ads 360°

## ✅ All Issues Fixed

### 1. Plan Details Page - Action Buttons Visibility ✅
**Location**: `/admin/plans/[id]`

**Visible Buttons** (Top Right):
- **Edit Plan** button (outline, visible)
- **Convert to Campaign** button (green, only if status is 'Approved')
- **... (More Options)** dropdown menu with:
  - Copy ID
  - Public Link
  - Download PPTx
  - Download Excel
  - Quotation / PI / WO
  - Activity
  - Block
  - Delete

All buttons are now CLEARLY VISIBLE on the plan details page.

---

### 2. Duration Field - Auto-Calculate End Date ✅
**Location**: `/admin/plans/edit/[id]` - Campaign Period section

**How It Works**:
- **Duration (Days)** field is now EDITABLE
- When you change the duration:
  - End date automatically updates
  - Calculation: End Date = Start Date + Duration Days
  - Prorata pricing recalculates for all assets

**Example**:
- Start Date: Jan 1, 2025
- Enter Duration: 15 days
- End Date auto-updates to: Jan 16, 2025
- All asset prices recalculate to prorata (15 days)

---

### 3. Prorata Calculations - Fixed ✅
**Location**: Plan Edit page - Selected Assets table

**Prorata Logic**:
```
If Duration >= 30 days:
  → Use Monthly Rate (no prorata)
  
If Duration < 30 days:
  → Prorata Rate = (Monthly Rate ÷ 30) × Duration Days
  → Example: ₹30,000/month for 15 days = ₹15,000
```

**Visual Indicators**:
- Monthly Rate column shows: "₹30,000 per month"
- Prorata column shows: "₹15,000 (15d)" with tooltip showing calculation
- Hover over Monthly Rate to see breakdown:
  - Monthly: ₹30,000
  - Per Day: ₹1,000
  - 15 days: ₹15,000

---

### 4. Bulk Plan Actions ✅
**Location**: `/admin/plans` - Plans List page

**Bulk Operations**:
1. **Select Multiple Plans**: Checkbox in each row
2. **Bulk Actions Toolbar** appears showing:
   - Number of selected plans
   - **Update Status** dropdown:
     - Draft
     - Sent
     - Approved
     - Rejected
   - **Delete Selected** button
   - **Clear Selection** button
   - **Compare Selected Plans** (if 2+ selected)

**How to Use**:
1. Click checkboxes to select plans
2. Choose action from toolbar
3. Confirm deletion or status change
4. Selected plans update immediately

---

## Complete Plan Workflow

### Step 1: Create New Plan
**Path**: Plans List → Add Plan

1. Select Client
2. Enter Plan Name
3. Choose Plan Type (Quotation/Proposal/Estimate)
4. **Set Campaign Period**:
   - Start Date
   - **Duration (days)** - EDITABLE field
   - End Date - auto-calculates
5. Select Assets → Prorata pricing auto-applies

### Step 2: Rate Negotiation
**On Plan Edit page**:

1. **Selected Assets Table** shows:
   - Monthly Rate
   - Prorata Rate (auto-calculated)
   - Sales Price (editable)
   - AI Suggestion button (✨)
   - Discount (% or Flat)
   - Printing Charges
   - Mounting Charges
   - Total

2. **AI Rate Suggester**:
   - Click sparkles icon
   - Gets historical data
   - Shows price range
   - Auto-fills suggested rate

3. **Real-time Summary**:
   - Subtotal
   - Discounts
   - Net Total
   - GST (18%)
   - Grand Total
   - Profit Margin

### Step 3: Review Plan
**On Plan Details Page**:

1. View all information
2. Check asset list
3. Review financials
4. Use action buttons:
   - **Edit Plan** - make changes
   - **Copy ID** - copy plan ID
   - **Public Link** - generate shareable link
   - **Download PPTx** - media plan presentation
   - **Download Excel** - financial summary
   - **Quotation/PI/WO** - formal documents
   - **Activity** - view audit trail

### Step 4: Convert to Campaign
**When plan is Approved**:

1. Click **Convert to Campaign** button
2. Review/edit campaign details:
   - Campaign Name
   - Start/End Dates
   - Notes
3. Click Create Campaign
4. Assets auto-updated to "Booked" status
5. Campaign assets created
6. Redirects to campaign page

---

## Key Features Summary

### ✅ Fixed Issues
1. ✅ All action buttons visible on plan details
2. ✅ Duration field editable with auto-end-date calculation
3. ✅ Prorata calculations working correctly (<30 days)
4. ✅ Bulk delete and status update in plans list

### 🎯 Working Features
- Plan CRUD operations
- Asset selection with prorata
- AI rate suggestions
- Real-time calculations
- Multiple export formats (PPT, Excel, PDF)
- Public sharing links
- Campaign conversion
- Audit trail/activity logs
- Bulk operations
- Template saving

---

## Calculation Examples

### Example 1: Full Month Campaign
- Duration: 30 days
- Monthly Rate: ₹30,000
- **Sales Price**: ₹30,000 (no prorata)

### Example 2: Half Month Campaign
- Duration: 15 days
- Monthly Rate: ₹30,000
- Per Day: ₹1,000
- **Sales Price**: ₹15,000 (prorated)

### Example 3: With Discount
- Duration: 15 days
- Prorata Rate: ₹15,000
- Discount: 10% = ₹1,500
- Printing: ₹2,000
- Mounting: ₹1,000
- **Subtotal**: ₹16,500
- GST (18%): ₹2,970
- **Grand Total**: ₹19,470

---

## Troubleshooting

### Issue: Can't see action buttons
**Solution**: Buttons are now visible in top-right. Look for "Edit Plan", "Convert to Campaign", and "..." dropdown.

### Issue: Duration not updating end date
**Solution**: Use the Duration field (middle column). End date auto-calculates when you change it.

### Issue: Prorata not calculating
**Solution**: Prorata auto-calculates when duration < 30 days. Check the tooltip on Monthly Rate column.

### Issue: Bulk actions not working
**Solution**: Select plans using checkboxes. Bulk toolbar appears at top of list.

---

## All Screens in Plan Workflow

1. **Plans List** (`/admin/plans`)
   - View all plans
   - Search & filter
   - Bulk actions
   - Templates

2. **Plan New** (`/admin/plans/new`)
   - Create new plan
   - Select client
   - Choose assets
   - Set pricing

3. **Plan Edit** (`/admin/plans/edit/[id]`)
   - Modify plan details
   - Add/remove assets
   - Adjust pricing
   - Rate negotiation

4. **Plan Details** (`/admin/plans/[id]`)
   - View complete plan
   - Action buttons
   - Export options
   - Convert to campaign

5. **Plan Share** (`/admin/plans/[id]/share/[token]`)
   - Public view for clients
   - No login required
   - Clean presentation

---

## Database Schema

### plans Table
- id, plan_name, plan_type
- client_id, client_name
- start_date, end_date, duration_days
- total_amount, gst_percent, gst_amount, grand_total
- status, share_token, notes
- created_by, created_at, updated_at

### plan_items Table
- plan_id, asset_id
- location, city, area, media_type, dimensions
- card_rate, base_rent, sales_price
- discount_type, discount_value, discount_amount
- printing_charges, mounting_charges
- subtotal, gst_amount, total_with_gst

---

## Status Flow

1. **Draft** → Initial creation
2. **Sent** → Shared with client
3. **Approved** → Client accepts
4. **Rejected** → Client declines
5. **Converted** → Becomes campaign

---

## Export Formats

### PowerPoint (PPT)
- Title slide
- Plan summary
- 2 images per asset
- Client branding

### Excel (XLSX)
- Summary sheet
- Detailed assets sheet
- GST calculations
- Totals and breakdowns

### PDF Documents
- **Quotation**: Commercial proposal
- **Proforma Invoice**: Pre-invoice
- **Work Order**: Installation instructions
- **Estimate**: Budget estimation

---

## Security & Permissions

### Admin Users Can:
- Create, edit, delete plans
- Convert to campaigns
- Access all export options
- View activity logs
- Bulk operations

### Sales Users Can:
- Create and edit own plans
- View all plans
- Limited export access

### Operations Users Can:
- View plans (read-only)
- No edit access

### Finance Users Can:
- View plans for invoicing
- Read-only access

---

## Performance Optimizations

1. **Real-time Updates**: Supabase subscriptions for live data
2. **Auto-refresh**: Configurable intervals
3. **Column Preferences**: Saved in localStorage
4. **Batch Operations**: Efficient bulk actions
5. **Cached Calculations**: Reduced re-computation

---

## Future Enhancements (Not Yet Implemented)

- [ ] AI Plan Creation
- [ ] Plan Comparison View
- [ ] Advanced Analytics
- [ ] Custom Templates
- [ ] Multi-currency Support
- [ ] Approval Workflows
- [ ] Email Notifications
- [ ] WhatsApp Integration

---

## Support & Documentation

For issues or questions:
1. Check this guide
2. Review audit logs
3. Contact system administrator
4. Check database for data integrity

---

**Last Updated**: Current Version
**Status**: ✅ All Core Features Working
**Platform**: Go-Ads 360° - OOH Media Management
