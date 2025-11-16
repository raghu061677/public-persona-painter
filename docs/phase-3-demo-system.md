# Phase 3: Demo Company System

## Overview
Complete demo mode implementation with sample data seeding, tutorial system, and reset functionality to help new users explore the platform.

## Implemented Features

### ✅ Demo Data Seeding System
- **Edge Function:** `seed-demo-data`
- **Comprehensive Sample Data:**
  - 3 Demo Clients (ABC Beverages, XYZ Electronics, Matrix Real Estate)
  - 4 Media Assets (Bus Shelters, Hoardings, Unipole) across Hyderabad
  - 1 Approved Plan (Summer Campaign 2025)
  - 1 Running Campaign with assigned assets
  - 2 Fresh Leads (New Startup and Fashion Brand)

### ✅ Demo Data Management
- **Edge Function:** `clear-demo-data`
- **Features:**
  - One-click demo data seeding
  - One-click demo data clearing
  - Proper cascading deletes respecting foreign key constraints
  - Activity logging for all demo operations
  - Clear visual indicators for demo mode status

### ✅ Demo Mode UI
- **Component:** `DemoModeSettings`
- **Location:** Settings → Demo Tab
- **Features:**
  - Toggle demo mode on/off
  - View demo data statistics
  - Clear breakdown of included demo data
  - Loading states and error handling
  - Success feedback with counts

### ✅ Guided Tutorial System
- **Component:** `GuidedTutorial`
- **Library:** react-joyride
- **Features:**
  - Step-by-step platform walkthrough
  - Covers all major modules:
    - Media Assets
    - Clients
    - Leads
    - Plans
    - Campaigns
    - Operations
    - Finance
    - Reports
    - Settings
  - Skip and restart options
  - Tutorial settings in Demo Mode

## Technical Implementation

### Edge Functions

#### seed-demo-data
**Path:** `supabase/functions/seed-demo-data/index.ts`

**Input:**
```typescript
{
  companyId: string,
  userId: string
}
```

**Output:**
```typescript
{
  success: boolean,
  message: string,
  data: {
    clients: number,
    assets: number,
    plans: number,
    campaigns: number,
    leads: number
  }
}
```

**Features:**
- Creates demo data with "DEMO" identifiers
- Links all data to specific company
- Sets realistic Indian business data
- Includes GST numbers, addresses, contacts
- Logs activity for audit trail

#### clear-demo-data
**Path:** `supabase/functions/clear-demo-data/index.ts`

**Input:**
```typescript
{
  companyId: string,
  userId: string
}
```

**Output:**
```typescript
{
  success: boolean,
  message: string,
  deleted: {
    campaigns: number,
    campaign_assets: number,
    plans: number,
    leads: number,
    clients: number,
    assets: number
  }
}
```

**Features:**
- Deletes in correct order (respects foreign keys)
- Only removes demo-labeled data
- Returns count of deleted records
- Logs cleanup activity

### Components

#### DemoModeSettings
**Path:** `src/components/demo/DemoModeSettings.tsx`

**Props:**
```typescript
interface DemoModeSettingsProps {
  companyId: string;
}
```

**Features:**
- Load/Clear demo data buttons
- Demo mode status indicator
- Detailed breakdown of demo data
- Tutorial toggle settings
- Loading and error states
- Success notifications

#### GuidedTutorial
**Path:** `src/components/demo/GuidedTutorial.tsx`

**Props:**
```typescript
interface GuidedTutorialProps {
  enabled: boolean;
  onComplete: () => void;
}
```

**Features:**
- Multi-step interactive tour
- Customizable steps
- Progress indicator
- Skip functionality
- Completion callback
- Themed styling

## Demo Data Details

### Clients
1. **ABC Beverages Ltd**
   - Contact: Rajesh Kumar
   - GST: 36AAACB1234C1Z5
   - Location: MG Road, Hyderabad

2. **XYZ Electronics Pvt Ltd**
   - Contact: Priya Sharma
   - GST: 36AABCX5678D1Z9
   - Location: Jubilee Hills, Hyderabad

3. **Matrix Real Estate**
   - Contact: Suresh Reddy
   - GST: 36AAACM9012E1Z3
   - Location: Banjara Hills, Hyderabad

### Media Assets
1. **HYD-BSQ-DEMO-001** - Bus Shelter, Kukatpally (Available)
2. **HYD-HRD-DEMO-002** - Hoarding, Madhapur (Available)
3. **HYD-UNI-DEMO-003** - Unipole, Gachibowli (Available)
4. **HYD-BSQ-DEMO-004** - Bus Shelter, Ameerpet (Booked)

### Plans & Campaigns
- **PLAN-DEMO-001 / CAM-DEMO-001**
  - Client: ABC Beverages Ltd
  - Campaign: Summer Campaign 2025
  - Duration: June 1 - August 31, 2025
  - Status: Approved / Running
  - Value: ₹1,41,600 (incl. GST)

### Leads
1. **Ravi Verma** - New Startup Pvt Ltd (Website source)
2. **Anjali Desai** - Fashion Brand Co (WhatsApp source)

## Security

### Access Control
- Demo mode only accessible to company admins
- RLS policies ensure data isolation per company
- Edge functions use service role key securely
- Activity logging for all demo operations

### Data Safety
- Demo data clearly labeled with DEMO identifiers
- Cannot accidentally delete production data
- Cascading deletes handled properly
- Transaction-based operations

## Usage Instructions

### For Users
1. Navigate to Settings → Demo tab
2. Click "Load Demo Data" to populate sample data
3. Explore the platform with realistic data
4. Enable "Show Tutorial on Login" for guided tour
5. Click "Clear Demo Data" when done exploring

### For Developers
1. Demo data follows production schema
2. All IDs contain "DEMO" for easy identification
3. Edge functions handle CORS properly
4. Extend demo data by adding to seed function
5. Tutorial steps can be customized in GuidedTutorial component

## Integration Points
- Settings page → Demo tab
- Edge functions → create-user, seed-demo-data, clear-demo-data
- Activity logs → tracks all demo operations
- Company users → links demo data to company

## Next Steps
1. Add more demo data variations (different industries)
2. Implement demo mode expiry (auto-cleanup after 7 days)
3. Add guided tooltips for specific features
4. Create video tutorials linked from help section
5. Build interactive demo playground for public site

## Status
**Phase 3 - COMPLETE** ✅

Ready to proceed to Phase 4: Onboarding Flow
