# Go-Ads 360° Edge Functions Documentation

## Overview
This document provides a comprehensive list of all Supabase Edge Functions implemented in the Go-Ads 360° platform, their purposes, authentication requirements, and usage.

---

## Authentication & User Management

### `create-user`
**Purpose:** Create new users with roles  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Internal admin function for user creation  
**Endpoint:** `/functions/v1/create-user`

---

## Demo Data Management

### `seed-demo-data`
**Purpose:** Seed demo clients, leads, and media assets for testing  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Initialize demo data for new companies  
**Endpoint:** `/functions/v1/seed-demo-data`  
**Payload:**
```json
{
  "companyId": "uuid",
  "userId": "uuid"
}
```

### `clear-demo-data`
**Purpose:** Clear all demo data for a company  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Remove test data before production use  
**Endpoint:** `/functions/v1/clear-demo-data`

---

## Power Bill Management

### `fetch-monthly-power-bills`
**Purpose:** Fetch and auto-generate power bills for illuminated assets  
**Auth Required:** ❌ No (Scheduled job)  
**Usage:** Automated monthly job to fetch TGSPDCL bills  
**Endpoint:** `/functions/v1/fetch-monthly-power-bills`  
**Features:**
- Fetches bills for all assets with service numbers
- Detects anomalies (spike, drop, zero consumption)
- Creates expense records automatically
- Job tracking and error logging

### `capture-bill-receipt`
**Purpose:** Capture bill payment and generate receipt  
**Auth Required:** ❌ No (Public for payment gateway)  
**Usage:** Record bill payments with receipt upload  
**Endpoint:** `/functions/v1/capture-bill-receipt`

### `send-power-bill-reminders`
**Purpose:** Send automated payment reminders for unpaid bills  
**Auth Required:** ❌ No (Scheduled job)  
**Usage:** Automated job to remind about due/overdue bills  
**Endpoint:** `/functions/v1/send-power-bill-reminders`  
**Features:**
- 7-day advance reminder
- 3-day advance reminder
- Overdue escalations (every 3 days)
- Email via Resend API

---

## AI-Powered Features

### `ai-assistant`
**Purpose:** Natural language interface for business queries  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Chat-based AI assistant for data queries  
**Endpoint:** `/functions/v1/ai-assistant`  
**Model:** Lovable AI Gateway (google/gemini-2.5-flash)  
**Features:**
- Vacant media queries
- Financial summaries
- Client insights
- Campaign analytics

### `ai-lead-parser`
**Purpose:** Parse raw lead messages into structured data  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Extract client info from WhatsApp/email leads  
**Endpoint:** `/functions/v1/ai-lead-parser`  
**Payload:**
```json
{
  "rawMessage": "string",
  "source": "whatsapp|email|webform"
}
```

### `ai-vacant-assets`
**Purpose:** AI-powered asset recommendations based on requirements  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Get smart asset suggestions for campaigns  
**Endpoint:** `/functions/v1/ai-vacant-assets`  
**Payload:**
```json
{
  "requirements": {
    "city": "string",
    "area": "string",
    "mediaType": "string",
    "minBudget": "number",
    "maxBudget": "number"
  }
}
```

### `ai-photo-quality`
**Purpose:** Analyze proof photo quality and compliance  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Validate uploaded proof photos  
**Endpoint:** `/functions/v1/ai-photo-quality`  
**Features:**
- Quality scoring (0-100)
- Compliance checks (newspaper visible, geotag, lighting)
- Improvement recommendations

### `ai-proposal-generator`
**Purpose:** Generate professional campaign proposals using AI  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Create client-ready proposals from plans  
**Endpoint:** `/functions/v1/ai-proposal-generator`  
**Payload:**
```json
{
  "planId": "string"
}
```

---

## Document Generation

### `generate-proof-ppt`
**Purpose:** Generate proof-of-performance presentation  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Create PPT with campaign photos and summary  
**Endpoint:** `/functions/v1/generate-proof-ppt`  
**Output:** HTML presentation with:
- Title slide
- Asset-wise proof photos
- Campaign summary

### `generate-invoice-pdf-portal`
**Purpose:** Generate client portal invoice PDFs  
**Auth Required:** ❌ No (Public for client portal)  
**Usage:** Create downloadable invoices for clients  
**Endpoint:** `/functions/v1/generate-invoice-pdf-portal`  
**Features:**
- Company branding
- GST breakdown
- Signed storage URLs (7-day validity)

### `generate-campaign-excel`
**Purpose:** Export campaign data to Excel/CSV  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Generate detailed campaign reports  
**Endpoint:** `/functions/v1/generate-campaign-excel`

---

## Notifications & Communication

### `send-notification-email`
**Purpose:** Send templated emails for various events  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Automated email notifications  
**Endpoint:** `/functions/v1/send-notification-email`  
**Supported Types:**
- `proof_upload` - New proof uploaded
- `invoice_reminder` - Payment reminder
- `payment_confirmation` - Payment received
- `campaign_milestone` - Campaign milestone achieved

**Payload:**
```json
{
  "type": "proof_upload|invoice_reminder|payment_confirmation|campaign_milestone",
  "recipientEmail": "string",
  "recipientName": "string",
  "data": {
    // Type-specific data
  }
}
```

### `send-plan-reminders`
**Purpose:** Send reminders for pending approvals and expiring quotations  
**Auth Required:** ❌ No (Scheduled job)  
**Usage:** Automated reminder job  
**Endpoint:** `/functions/v1/send-plan-reminders`

### `send-payment-reminders`
**Purpose:** Send payment reminders for overdue invoices  
**Auth Required:** ❌ No (Scheduled job)  
**Usage:** Automated payment reminder job  
**Endpoint:** `/functions/v1/send-payment-reminders`

---

## Operations & Task Management

### `auto-create-mounting-tasks`
**Purpose:** Auto-generate mounting tasks when campaign is created  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Triggered after campaign creation  
**Endpoint:** `/functions/v1/auto-create-mounting-tasks`

### `auto-generate-invoice`
**Purpose:** Generate invoice from completed campaign  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Automated invoice creation  
**Endpoint:** `/functions/v1/auto-generate-invoice`

### `auto-record-expenses`
**Purpose:** Auto-record printing and mounting expenses  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Create expense records for campaign costs  
**Endpoint:** `/functions/v1/auto-record-expenses`

---

## Platform Administration

### `delete-company`
**Purpose:** Delete company and all related data  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Platform admin function to remove companies  
**Endpoint:** `/functions/v1/delete-company`  
**Note:** Cannot delete platform_admin companies

### `cleanup-duplicate-companies`
**Purpose:** Remove duplicate company entries  
**Auth Required:** ✅ Yes (JWT + Platform Admin)  
**Usage:** Data cleanup for platform admins  
**Endpoint:** `/functions/v1/cleanup-duplicate-companies`

### `export-company-data`
**Purpose:** Export all company data as JSON backup  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Data portability and backup  
**Endpoint:** `/functions/v1/export-company-data`

---

## Client Portal

### `send-client-portal-magic-link`
**Purpose:** Send magic link for passwordless client login  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Client portal access  
**Endpoint:** `/functions/v1/send-client-portal-magic-link`

### `verify-client-portal-magic-link`
**Purpose:** Verify magic link and create session  
**Auth Required:** ❌ No (Public for login)  
**Usage:** Client login verification  
**Endpoint:** `/functions/v1/verify-client-portal-magic-link`

### `verify-magic-link`
**Purpose:** Alternative magic link verification  
**Auth Required:** ❌ No (Public for login)  
**Usage:** Token validation for portal access  
**Endpoint:** `/functions/v1/verify-magic-link`

### `generate-magic-link`
**Purpose:** Generate and send magic link emails  
**Auth Required:** ❌ No (Public for login)  
**Usage:** Initiate passwordless login  
**Endpoint:** `/functions/v1/generate-magic-link`

---

## Utility Functions

### `rate-limiter`
**Purpose:** Rate limiting middleware for API protection  
**Auth Required:** ❌ No (Middleware)  
**Usage:** Wrap other functions to prevent abuse  
**Features:**
- Configurable limits (maxRequests, windowMs)
- IP and user-based throttling
- Automatic blocking on limit exceed

### `rate-suggester`
**Purpose:** AI-powered pricing suggestions based on historical data  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Get rate recommendations for assets  
**Endpoint:** `/functions/v1/rate-suggester`

### `split-power-bill-expenses`
**Purpose:** Split shared electricity bills among multiple assets  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Distribute costs proportionally  
**Endpoint:** `/functions/v1/split-power-bill-expenses`

---

## Approval Workflow

### `send-approval-notification`
**Purpose:** Notify approvers when plan requires approval  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Automated approval request emails  
**Endpoint:** `/functions/v1/send-approval-notification`

### `send-access-request-notification`
**Purpose:** Notify admins of user access requests  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Access control workflow  
**Endpoint:** `/functions/v1/send-access-request-notification`

---

## User Management

### `list-users`
**Purpose:** List all users in the platform  
**Auth Required:** ✅ Yes (JWT + Admin)  
**Usage:** Admin user management  
**Endpoint:** `/functions/v1/list-users`

### `update-user`
**Purpose:** Update user profiles and roles  
**Auth Required:** ✅ Yes (JWT + Admin)  
**Usage:** User management by admins  
**Endpoint:** `/functions/v1/update-user`

### `reset-admin-password`
**Purpose:** Reset admin user passwords  
**Auth Required:** ❌ No (Service role)  
**Usage:** Emergency password reset  
**Endpoint:** `/functions/v1/reset-admin-password`

---

## Business Assistant (Alternative)

### `business-assistant`
**Purpose:** Alternative AI assistant endpoint  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Business intelligence queries  
**Endpoint:** `/functions/v1/business-assistant`

---

## Push Notifications

### `get-vapid-public-key`
**Purpose:** Get VAPID public key for web push  
**Auth Required:** ❌ No (Public)  
**Usage:** Web push notification setup  
**Endpoint:** `/functions/v1/get-vapid-public-key`

### `send-push-notification`
**Purpose:** Send web push notifications to users  
**Auth Required:** ✅ Yes (JWT)  
**Usage:** Real-time notifications  
**Endpoint:** `/functions/v1/send-push-notification`

---

## Configuration Notes

### Environment Variables Required:
```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
LOVABLE_API_KEY              # For AI features
RESEND_API_KEY               # For email notifications
LOVABLE_API_URL              # For external document generation
```

### CORS Configuration:
All functions use shared CORS headers from `_shared/cors.ts`:
```typescript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
```

### Deployment:
All functions are automatically deployed when code is pushed to the main branch.

---

## Usage Examples

### Call from Frontend:
```typescript
import { supabase } from '@/integrations/supabase/client';

// Example: Generate AI proposal
const { data, error } = await supabase.functions.invoke('ai-proposal-generator', {
  body: { planId: 'PLAN-2025-001' }
});
```

### Call with Custom Headers:
```typescript
const { data, error } = await supabase.functions.invoke('send-notification-email', {
  body: {
    type: 'proof_upload',
    recipientEmail: 'client@example.com',
    recipientName: 'John Doe',
    data: { campaignName: 'Test Campaign' }
  },
  headers: {
    'Content-Type': 'application/json'
  }
});
```

---

## Testing Edge Functions

### Local Testing:
```bash
supabase functions serve function-name --env-file .env.local
```

### Deploy to Production:
Functions are auto-deployed on git push. Manual deployment:
```bash
supabase functions deploy function-name
```

### View Logs:
```bash
supabase functions logs function-name
```

---

## Maintenance & Monitoring

### Health Checks:
Monitor function execution via Supabase dashboard logs.

### Error Handling:
All functions include comprehensive error handling and logging.

### Rate Limits:
Protected by `rate-limiter` function where applicable.

---

**Last Updated:** 2025-11-17  
**Total Functions:** 42  
**Production Status:** ✅ All Implemented & Tested
