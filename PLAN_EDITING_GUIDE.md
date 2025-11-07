# Plan Editing & Rate Negotiation Guide

## Where to Find Plan Edit Buttons

### 1. Plans List Page (`/admin/plans`)
- **Location**: In the Actions column of the table
- **Edit Button**: Pencil icon (Edit) - visible for each plan row
- **View Button**: Eye icon - opens plan details
- **More Actions**: Three-dot menu for Delete, Reject, Share, Copy ID

### 2. Plan Detail Page (`/admin/plans/{id}`)
- **Location**: Top right corner, next to "Convert to Campaign" button
- **Edit Plan Button**: Primary button with Edit icon
- **Dropdown Menu**: Also contains "Edit Plan" option in the Actions dropdown

## Rate Negotiations Feature

### Where: Plan Edit Page (`/admin/plans/edit/{id}`)

The rate negotiation happens when editing a plan. Here's the workflow:

1. **Navigate to Edit**:
   - From Plans List: Click the Edit (pencil) icon
   - From Plan Detail: Click "Edit Plan" button

2. **Rate Negotiation Features**:
   
   **Selected Assets Table** (`SelectedAssetsTable` component):
   - Shows all selected assets for the plan
   - Editable columns:
     - **Sales Price**: Manually enter negotiated price
     - **AI Rate Suggestion**: Click sparkles (✨) icon to get AI-powered rate recommendations
     - **Discount Type**: Choose between Percentage or Flat discount
     - **Discount Value**: Enter discount amount
     - **Printing Charges**: Enter printing costs
     - **Mounting Charges**: Enter mounting costs
   - Auto-calculated **Total** column shows final price per asset

3. **AI Rate Recommender**:
   - Located in the Sales Price column
   - Click the sparkles icon next to any asset's rate
   - Calls Supabase Edge Function `rate-suggester`
   - Analyzes historical rates for similar assets
   - Provides suggested price range
   - Option to auto-fill the suggested rate

4. **Plan Summary Card**:
   - Located on the right side
   - Live updates as you adjust rates
   - Shows:
     - Subtotal
     - Total Discount
     - Net Total
     - GST Amount (18%)
     - Grand Total
     - Profit Margin

## Key Components

### PlanEdit.tsx
- Main edit page with form
- Asset selection
- Date range selection
- Client selection

### SelectedAssetsTable.tsx
- Rate negotiation interface
- AI suggestions integration
- Discount calculations
- Real-time pricing updates

### AssetSelectionTable.tsx
- Browse available media assets
- Add/remove assets from plan
- Auto-calculates prorata rates based on campaign duration

### PlanSummaryCard.tsx
- Financial summary
- Real-time calculations
- Profit margin tracking

## Rate Calculation Logic

1. **Base Rate**: Monthly card rate from media asset
2. **Prorata Calculation**: `(Monthly Rate / 30) × Duration Days`
3. **Discount**: Applied to sales price (percentage or flat)
4. **Additional Charges**: Printing + Mounting
5. **GST**: Applied to final subtotal (default 18%)
6. **Grand Total**: Net Total + GST

## Navigation Flow

```
Plans List → Edit Icon → Plan Edit Page
              ↓
    Rate Negotiation (Sales Price column)
              ↓
    AI Suggestions (Click ✨ icon)
              ↓
    Apply discounts & charges
              ↓
    Review in Summary Card
              ↓
    Save → Plan Detail Page
```

## Tips

- Use AI suggestions for market-competitive pricing
- Prorata rates are auto-calculated based on campaign duration
- All changes update the summary card in real-time
- Save updates the plan and recalculates all plan_items in database
