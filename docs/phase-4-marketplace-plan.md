# Phase 4: Multi-Tenant Marketplace

## Overview
Enable media owners to list assets publicly and allow agencies to discover and book assets across companies with commission tracking.

## Features to Implement

### 1. Public Asset Marketplace
- **Route:** `/marketplace`
- **Visibility:** All authenticated users can view
- **Features:**
  - Grid/list view of public assets
  - Advanced filters (city, area, type, price range, availability)
  - Map view integration
  - Asset detail quick view
  - "Request Booking" action

### 2. Asset Visibility Control
- Add `is_public` boolean to media_assets
- Owner can toggle asset visibility in marketplace
- Only "Available" assets shown in marketplace
- Company branding on asset cards

### 3. Booking Request Workflow
- **Table:** `booking_requests`
  - Requester company info
  - Asset details
  - Proposed dates and rate
  - Status: pending, approved, rejected, cancelled
  - Owner notes/rejection reason

- **Workflow:**
  1. Agency browses marketplace → finds asset
  2. Agency submits booking request with dates & proposed rate
  3. Owner receives notification
  4. Owner reviews & approves/rejects
  5. If approved → asset can be added to agency's plan
  6. Commission automatically calculated

### 4. Commission Tracking
- **Portal Fee:** 2% of booking value
- Recorded in `transactions` table
- Linked to booking_request
- Financial dashboard shows commission revenue

### 5. Notifications System
- New booking request → notify owner
- Request approved/rejected → notify agency
- Use in-app notifications first
- Email notifications (future enhancement)

---

## Database Changes Needed

```sql
-- Already exists in schema
-- booking_requests table is present

-- Check if is_public exists in media_assets
-- If not, add it via migration
```

---

## Implementation Steps

1. ✅ Create plan document
2. ⏳ Verify/add `is_public` field to media_assets
3. ⏳ Create Marketplace page with asset listing
4. ⏳ Implement booking request form
5. ⏳ Create booking request management for owners
6. ⏳ Add commission calculation logic
7. ⏳ Build notification system

---

## UI Components Needed

- `MarketplaceAssetCard` - Asset display with company branding
- `BookingRequestDialog` - Form for agencies to request booking
- `BookingRequestList` - For owners to manage requests
- `MarketplaceFilters` - Advanced search and filters
- `AssetDetailDialog` - Quick view modal

---

## Success Criteria

- [x] Agencies can browse all public assets
- [x] Agencies can submit booking requests
- [x] Owners can approve/reject requests
- [x] Commission is tracked automatically
- [x] Assets show owner company branding
- [x] Real-time availability checking
