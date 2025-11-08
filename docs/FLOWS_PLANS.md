# Go-Ads 360° - Plans Module Business Logic

Complete documentation of the Plans module workflows, calculations, and business rules.

---

## Table of Contents

1. [Overview](#overview)
2. [Plan Lifecycle](#plan-lifecycle)
3. [Core Workflows](#core-workflows)
4. [Pricing Calculations](#pricing-calculations)
5. [Prorata Logic](#prorata-logic)
6. [Approval Workflows](#approval-workflows)
7. [Export Functionality](#export-functionality)
8. [Templates System](#templates-system)
9. [Public Sharing](#public-sharing)
10. [AI Integration](#ai-integration)
11. [Data Model](#data-model)
12. [UI Components](#ui-components)

---

## Overview

The Plans module is the heart of the Go-Ads 360° platform, enabling sales teams to create, negotiate, and finalize media plans (quotations) for clients. It provides:

- **Interactive Plan Builder** with asset selection
- **Dynamic Pricing** with real-time calculations
- **Rate Negotiation** with AI-powered suggestions
- **Prorata Calculations** for partial month campaigns
- **Multi-format Exports** (PPT, Excel, PDF)
- **Public Share Links** for client review
- **Approval Workflows** for high-value plans
- **Template Management** for reusability

---

## Plan Lifecycle

### Status Flow

```
Draft → Sent → Approved → Converted
   ↓      ↓         ↓
   └── Rejected ───┘
```

**Status Definitions:**

1. **Draft** - Plan is being created or edited
   - Can be edited freely
   - Not visible to client
   - Can be deleted

2. **Sent** - Plan has been shared with client
   - Locked from editing (unless admin)
   - Public share link active
   - Awaiting client response

3. **Approved** - Client has approved the plan
   - Ready for campaign conversion
   - Cannot be edited
   - Can generate exports

4. **Rejected** - Client has declined the plan
   - Can be revised and resent
   - Audit trail maintained
   - Can be archived

5. **Converted** - Plan has been converted to campaign
   - Locked permanently
   - Linked to active campaign
   - Used for historical reporting

---

## Core Workflows

### 1. Create New Plan

**User Actions:**
1. Navigate to `/plans/new`
2. Fill basic plan information
3. Select client from dropdown
4. Set start and end dates
5. Add assets to plan
6. Negotiate rates per asset
7. Apply bulk actions if needed
8. Review summary
9. Save as draft or send to client

**System Actions:**
- Auto-generate Plan ID: `PLAN-YYYY-Month-XXX`
- Calculate duration in days
- Fetch available assets for selection
- Apply default rates from media_assets
- Calculate GST (18% default)
- Create plan record in database
- Create plan_items for each asset
- Update plan export_links

**Validation Rules:**
- Client is required
- Start date cannot be in the past
- End date must be after start date
- At least one asset must be selected
- Sales price must be > 0 for each item
- Discount cannot exceed 100%

---

### 2. Add Assets to Plan

**Asset Selection Process:**

```typescript
// User opens asset selection dialog
// System displays available assets with filters

Filters:
- City (dropdown)
- Area (dropdown)
- Media Type (dropdown)
- Status = 'Available'
- Date range availability check

// User selects assets
// System adds to selectedAssets array with:
{
  asset_id: string,
  card_rate: number,  // from media_assets
  sales_price: number,  // initially = card_rate
  printing_charges: number,  // from media_assets or 0
  mounting_charges: number,  // from media_assets or 0
  discount_type: 'Percent',
  discount_value: 0
}
```

**Availability Logic:**
- Check if asset.status = 'Available'
- Check campaigns table for date conflicts
- Exclude assets already in this plan
- Sort by relevance (area match, price range)

---

### 3. Negotiate Rates

**Rate Adjustment Flow:**

```typescript
// For each asset in plan:

Initial State:
- card_rate = media_assets.card_rate (read-only)
- sales_price = card_rate (editable)

User Actions:
1. Enter negotiated price directly
2. Apply discount percentage
3. Apply fixed discount amount
4. Use AI rate suggester

Calculations:
if (discount_type === 'Percent') {
  discount_amount = (card_rate * discount_value) / 100
  sales_price = card_rate - discount_amount
} else if (discount_type === 'Fixed') {
  discount_amount = discount_value
  sales_price = card_rate - discount_amount
} else {
  // Manual entry
  discount_amount = card_rate - sales_price
  discount_value = (discount_amount / card_rate) * 100
}
```

**Rate Validation:**
- sales_price must be > 0
- sales_price cannot exceed card_rate (no markup in discount mode)
- discount_value cannot be negative
- Warnings if margin < 10%

---

### 4. AI Rate Suggester

**Trigger:** User clicks "sparkles" icon next to rate field

**Process:**
1. Frontend calls `/api/rate-suggester` edge function
2. Backend queries historical rates:
   ```sql
   SELECT sales_price, card_rate, discount_value
   FROM plan_items
   WHERE media_type = ? AND area = ? AND city = ?
   ORDER BY created_at DESC
   LIMIT 10
   ```
3. AI model analyzes historical data + current market context
4. Returns suggested rate range with reasoning
5. Frontend displays suggestion in popover
6. User can accept or ignore

**AI Prompt Structure:**
```
You are a pricing expert for OOH advertising.
Asset: {media_type} in {area}, {city}
Card Rate: ₹{card_rate}
Historical rates: {historical_data}
Suggest optimal negotiated rate with reasoning.
```

---

## Pricing Calculations

### Line Item Calculation

For each asset in the plan:

```typescript
// Base calculation (no prorata)
const subtotal = sales_price;
const gst_amount = (subtotal * gst_percent) / 100;
const total_with_gst = subtotal + gst_amount;

// With printing and mounting
const item_total = sales_price + printing_charges + mounting_charges;
const item_gst = (item_total * gst_percent) / 100;
const item_final = item_total + item_gst;
```

### Plan-Level Totals

```typescript
// Sum all line items
const total_amount = sum(plan_items.subtotal);
const gst_amount = (total_amount * gst_percent) / 100;
const grand_total = total_amount + gst_amount;

// With additional charges
const total_printing = sum(plan_items.printing_charges);
const total_mounting = sum(plan_items.mounting_charges);
const total_base = total_amount + total_printing + total_mounting;
const total_gst = (total_base * gst_percent) / 100;
const final_grand_total = total_base + total_gst;
```

**GST Handling:**
- Default GST = 18% (configurable per plan)
- GST calculated on subtotal + charges
- GST breakdown shown separately in summary
- State-wise GST rules (CGST+SGST for intra-state, IGST for inter-state)

---

## Prorata Logic

### When Applied

Prorata pricing is applied when:
- Campaign does NOT start on 1st of month, OR
- Campaign does NOT end on last day of month

### Calculation Formula

```typescript
function calculateProrata(
  card_rate: number,
  start_date: Date,
  end_date: Date
): number {
  const days_in_period = getDaysInPeriod(start_date, end_date);
  let prorata_amount = 0;

  // Split into months
  const months = splitIntoMonths(start_date, end_date);
  
  for (const month of months) {
    const days_in_month = getDaysInMonth(month.year, month.month);
    const days_used = month.days_count;
    
    // If full month, use full rate
    if (days_used === days_in_month) {
      prorata_amount += card_rate;
    } else {
      // Partial month
      const daily_rate = card_rate / days_in_month;
      prorata_amount += daily_rate * days_used;
    }
  }
  
  return Math.round(prorata_amount * 100) / 100; // Round to 2 decimals
}
```

### Example

**Scenario:**
- Card Rate: ₹10,000/month
- Start Date: 15 Jan 2024
- End Date: 10 Feb 2024

**Calculation:**
- January: 17 days (15-31) of 31 total
  - Daily rate = 10,000 / 31 = ₹322.58
  - Prorata = 322.58 × 17 = ₹5,483.86

- February: 10 days (1-10) of 29 total
  - Daily rate = 10,000 / 29 = ₹344.83
  - Prorata = 344.83 × 10 = ₹3,448.30

**Total Prorata Price:** ₹8,932.16 (instead of ₹20,000 for 2 full months)

### UI Indicators

When prorata applies:
- Show "Prorata Applied" badge
- Display calculation breakdown in tooltip
- Highlight partial months in summary
- Show daily rate for transparency

---

## Approval Workflows

### Approval Configuration

**Setup in `approval_settings` table:**

```typescript
{
  plan_type: 'Quotation',
  min_amount: 100000,  // ₹1 lakh
  max_amount: 500000,  // ₹5 lakh
  approval_levels: [
    { level: 'l1', role: 'sales' },
    { level: 'l2', role: 'finance' }
  ],
  is_active: true
}
```

### Workflow Trigger

When plan status changes from Draft → Sent:

```typescript
// Check if plan amount requires approval
const approvalConfig = findApprovalConfig(plan.plan_type, plan.grand_total);

if (approvalConfig) {
  // Create approval records via DB function
  await createPlanApprovalWorkflow(plan.id);
  
  // Send notifications to approvers
  await notifyApprovers(plan.id);
}
```

### Approval Process

**For each approval level:**

1. Approver receives notification
2. Reviews plan details
3. Makes decision: Approve / Reject
4. Adds optional comments
5. System records decision

```typescript
// Process approval
const result = await processApprovalDecision({
  approval_id: uuid,
  status: 'approved' | 'rejected',
  comments: string
});

// If approved, check next level
if (status === 'approved') {
  const pending = getPendingApprovals(plan_id);
  if (pending.length === 0) {
    // All approvals complete
    updatePlanStatus(plan_id, 'Approved');
  } else {
    // Notify next approver
    notifyNextApprover(plan_id);
  }
} else {
  // If rejected, reject plan
  updatePlanStatus(plan_id, 'Rejected');
  notifyPlanCreator(plan_id, 'Plan rejected');
}
```

### Approval Bypass

Admins can bypass approval workflow:
- Direct status change to Approved
- Automatic approval flag in settings
- Emergency approval override

---

## Export Functionality

### Export Formats

1. **PowerPoint (PPT)**
2. **Excel (XLSX)**
3. **PDF (Work Order)**

### PowerPoint Export

**Generation Process:**

```typescript
// Using pptxgenjs library
import pptxgen from 'pptxgenjs';

async function generatePlanPPT(plan_id: string) {
  const ppt = new pptxgen();
  
  // Slide 1: Cover
  const slide1 = ppt.addSlide();
  slide1.background = { color: '1E40AF' };
  slide1.addText(plan.plan_name, { 
    x: 1, y: 2, fontSize: 44, color: 'FFFFFF', bold: true 
  });
  slide1.addText(plan.client_name, { 
    x: 1, y: 3, fontSize: 24, color: '10B981' 
  });
  
  // Slide 2: Summary
  const slide2 = ppt.addSlide();
  slide2.addText('Plan Summary', { x: 0.5, y: 0.5, fontSize: 32 });
  slide2.addTable([
    ['Duration', `${plan.duration_days} days`],
    ['Total Assets', `${plan_items.length}`],
    ['Subtotal', formatCurrency(plan.total_amount)],
    ['GST', formatCurrency(plan.gst_amount)],
    ['Grand Total', formatCurrency(plan.grand_total)]
  ], { x: 1, y: 1.5, w: 8 });
  
  // Slides 3+: Assets (2 per slide)
  for (let i = 0; i < plan_items.length; i += 2) {
    const slide = ppt.addSlide();
    
    // First asset
    const item1 = plan_items[i];
    slide.addText(item1.location, { x: 0.5, y: 0.5, fontSize: 18 });
    slide.addImage({ 
      path: item1.image_url, 
      x: 0.5, y: 1, w: 4, h: 3 
    });
    slide.addText(`Rate: ${formatCurrency(item1.sales_price)}`, 
      { x: 0.5, y: 4.5 });
    
    // Second asset (if exists)
    if (i + 1 < plan_items.length) {
      const item2 = plan_items[i + 1];
      slide.addText(item2.location, { x: 5.5, y: 0.5, fontSize: 18 });
      slide.addImage({ 
        path: item2.image_url, 
        x: 5.5, y: 1, w: 4, h: 3 
      });
      slide.addText(`Rate: ${formatCurrency(item2.sales_price)}`, 
        { x: 5.5, y: 4.5 });
    }
  }
  
  // Save and upload
  const buffer = await ppt.write('blob');
  const url = await uploadToStorage(buffer, `${plan_id}.pptx`);
  
  // Update plan.export_links
  await updatePlanExportLinks(plan_id, { ppt: url });
  
  return url;
}
```

**Customization Options:**
- Company logo on cover
- Custom color scheme
- Asset image quality
- Terms & conditions page
- Page numbering

### Excel Export

**Structure:**

```typescript
// Using xlsx library
import XLSX from 'xlsx';

async function generatePlanExcel(plan_id: string) {
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Summary
  const summaryData = [
    ['Plan Name', plan.plan_name],
    ['Client', plan.client_name],
    ['Start Date', formatDate(plan.start_date)],
    ['End Date', formatDate(plan.end_date)],
    ['Duration', `${plan.duration_days} days`],
    [],
    ['Total Amount', plan.total_amount],
    [`GST @ ${plan.gst_percent}%`, plan.gst_amount],
    ['Grand Total', plan.grand_total]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
  
  // Sheet 2: Line Items
  const itemsData = [
    ['Sr.', 'Asset ID', 'Location', 'Area', 'City', 'Media Type', 
     'Card Rate', 'Discount %', 'Sales Price', 'Printing', 'Mounting', 
     'Subtotal', 'GST', 'Total']
  ];
  
  plan_items.forEach((item, idx) => {
    itemsData.push([
      idx + 1,
      item.asset_id,
      item.location,
      item.area,
      item.city,
      item.media_type,
      item.card_rate,
      item.discount_value,
      item.sales_price,
      item.printing_charges,
      item.mounting_charges,
      item.subtotal,
      item.gst_amount,
      item.total_with_gst
    ]);
  });
  
  const ws2 = XLSX.utils.aoa_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Line Items');
  
  // Write and upload
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const url = await uploadToStorage(buffer, `${plan_id}.xlsx`);
  
  await updatePlanExportLinks(plan_id, { excel: url });
  
  return url;
}
```

### PDF Export

PDF generation for work orders using jsPDF:

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

async function generateWorkOrderPDF(plan_id: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Work Order', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Plan: ${plan.plan_name}`, 20, 40);
  doc.text(`Client: ${plan.client_name}`, 20, 50);
  
  // Table
  doc.autoTable({
    startY: 60,
    head: [['Asset', 'Location', 'Rate', 'Duration']],
    body: plan_items.map(item => [
      item.asset_id,
      `${item.location}, ${item.area}`,
      formatCurrency(item.sales_price),
      `${plan.duration_days} days`
    ]),
  });
  
  // Total
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Grand Total: ${formatCurrency(plan.grand_total)}`, 20, finalY);
  
  // Save
  const buffer = doc.output('arraybuffer');
  const url = await uploadToStorage(buffer, `${plan_id}.pdf`);
  
  await updatePlanExportLinks(plan_id, { pdf: url });
  
  return url;
}
```

---

## Templates System

### Save as Template

**User Flow:**
1. User creates a plan with desired assets
2. Clicks "Save as Template"
3. Enters template name and description
4. System saves to `plan_templates` table

**Data Structure:**

```typescript
{
  id: uuid,
  template_name: 'Hyderabad Bus Shelters - Standard',
  plan_type: 'Quotation',
  description: 'Standard package for 20 bus shelters in prime locations',
  duration_days: 30,
  gst_percent: 18,
  template_items: [
    {
      asset_id: 'HYD-BS-001',
      location: 'Ameerpet',
      sales_price: 15000,
      printing_charges: 2000,
      mounting_charges: 1000
    },
    // ... more items
  ],
  notes: 'Default rates, adjust per client',
  usage_count: 0,
  is_active: true,
  created_by: user_id
}
```

### Apply Template

**User Flow:**
1. User starts new plan
2. Clicks "Use Template"
3. Selects from template list
4. System pre-fills plan with template data

**Process:**

```typescript
async function applyTemplate(template_id: uuid, plan_id: string) {
  const template = await fetchTemplate(template_id);
  
  // Update plan
  await updatePlan(plan_id, {
    plan_type: template.plan_type,
    duration_days: template.duration_days,
    gst_percent: template.gst_percent,
    notes: template.notes
  });
  
  // Add template items to plan
  for (const item of template.template_items) {
    // Check if asset still available
    const asset = await fetchAsset(item.asset_id);
    if (asset && asset.status === 'Available') {
      await addAssetToPlan(plan_id, {
        asset_id: item.asset_id,
        sales_price: item.sales_price,
        printing_charges: item.printing_charges,
        mounting_charges: item.mounting_charges
      });
    }
  }
  
  // Increment usage count
  await incrementTemplateUsage(template_id);
}
```

---

## Public Sharing

### Generate Share Link

**Process:**

```typescript
async function generateShareLink(plan_id: string) {
  // Generate unique token
  const share_token = crypto.randomBytes(16).toString('hex');
  
  // Update plan
  await updatePlan(plan_id, {
    share_token,
    share_link_active: true
  });
  
  // Construct public URL
  const share_url = `${APP_URL}/plans/share/${share_token}`;
  
  return share_url;
}
```

### Public View Page

**Path:** `/plans/share/:shareToken`

**Features:**
- No authentication required
- Read-only view
- Asset gallery
- Pricing breakdown
- Contact form
- Download options (if enabled)

**Component Structure:**

```typescript
function PublicPlanShare() {
  const { shareToken } = useParams();
  const [plan, setPlan] = useState(null);
  
  useEffect(() => {
    // Fetch plan by share token (public endpoint)
    fetchPublicPlan(shareToken).then(setPlan);
  }, [shareToken]);
  
  if (!plan) return <Loading />;
  
  return (
    <div className="public-plan-view">
      <OrganizationBranding />
      <PlanHeader plan={plan} />
      <AssetGallery items={plan.items} />
      <PricingSummary plan={plan} />
      <ClientActions plan={plan} />
    </div>
  );
}
```

### Client Actions

On public share page:
- **Accept Plan** - Sends notification, updates status to Approved
- **Request Changes** - Opens feedback form
- **Download PDF** - Generates and downloads PDF quotation
- **Contact Sales** - Opens contact form

---

## AI Integration

### Rate Recommendation

**Edge Function:** `supabase/functions/rate-suggester/index.ts`

**Input:**
```typescript
{
  asset_id: string,
  media_type: string,
  area: string,
  city: string,
  card_rate: number
}
```

**Process:**
1. Query historical rates from database
2. Calculate statistics (avg, min, max, median)
3. Send to AI model with context
4. Parse AI response
5. Return recommendation

**Output:**
```typescript
{
  suggested_rate: number,
  confidence: 'high' | 'medium' | 'low',
  reasoning: string,
  historical_avg: number,
  discount_percent: number
}
```

---

## Data Model

### Database Tables

**plans:**
- Stores plan header information
- Links to client
- Tracks status and dates
- Holds totals

**plan_items:**
- One record per asset in plan
- Denormalizes asset details for stability
- Stores negotiated prices
- Calculates line totals

**plan_templates:**
- Reusable plan configurations
- JSON array of template items
- Usage tracking

**plan_approvals:**
- Approval workflow instances
- Links to plans
- Tracks approval hierarchy

**plan_terms_settings:**
- Default terms and conditions
- Customizable per organization

### Relationships

```
plans (1) ----< (many) plan_items
plans (1) ----< (many) plan_approvals
clients (1) ----< (many) plans
media_assets (1) ----< (many) plan_items
```

---

## UI Components

### Key Components

1. **PlanForm** - Basic plan details input
2. **AssetSelectionTable** - Available assets browser
3. **SelectedAssetsTable** - Selected assets with rate editing
4. **PlanSummaryCard** - Real-time totals display
5. **BulkActionsToolbar** - Bulk operations on selected items
6. **ExportOptionsDialog** - Export format selection
7. **ApprovalWorkflowDialog** - Approval status display
8. **PublicPlanShare** - Client-facing public view

### State Management

Uses Zustand store for plan editing:

```typescript
interface PlanStore {
  selectedAssets: PlanItem[];
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (asset_id: string) => void;
  updateAssetRate: (asset_id: string, rate: number) => void;
  applyBulkDiscount: (discount: number) => void;
  clearSelection: () => void;
}
```

---

This document covers the complete business logic for the Plans module. For implementation details, see the source code in `src/pages/Plan*.tsx` and `src/components/plans/`.
