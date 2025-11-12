# Power Bill Reminder System - Setup Guide

## Overview
The automated power bill reminder system sends email notifications to administrators when bills are due in 3 days and 7 days.

## Features Implemented

### 1. Power Bill Analytics Dashboard (`/admin/power-bills-analytics`)
- Monthly trends visualization (line chart)
- Total bills, amounts, pending/paid status (summary cards)
- Top assets by expense (bar chart)
- Recent pending bills list
- Refresh functionality

### 2. Bulk Payment Feature (`/admin/power-bills-bulk-payment`)
- Select multiple pending bills at once
- Mark bills as paid with payment date
- Upload payment receipt (optional)
- Receipt stored in Supabase Storage
- Updates all selected bills in one transaction
- Shows total amount and bill count

### 3. Automated Email Reminder System

#### Edge Function: `send-power-bill-reminders`
Location: `supabase/functions/send-power-bill-reminders/index.ts`

**What it does:**
- Checks for bills due in 3 days (urgent warning)
- Checks for bills due in 7 days (advance notice)
- Sends beautifully formatted HTML emails via Resend
- Groups bills by due date
- Shows total count and amount
- Includes detailed bill table with asset info

#### Email Content Includes:
- Summary card (total bills & amount)
- Detailed table with:
  - Asset ID
  - Location
  - Consumer Name
  - Service Number
  - Bill Amount
- Total amount footer
- Action items checklist

## Setup Instructions

### 1. Configure Resend API Key (Required)

The reminder system uses Resend for sending emails. You need to:

1. Go to [https://resend.com](https://resend.com) and create an account
2. Verify your email domain at [https://resend.com/domains](https://resend.com/domains)
3. Create an API key at [https://resend.com/api-keys](https://resend.com/api-keys)
4. The `RESEND_API_KEY` secret should already be configured in your project

### 2. Update Email Recipients

Edit the edge function to set your admin email(s):

```typescript
// In supabase/functions/send-power-bill-reminders/index.ts
// Line ~103 and ~122

to: ['admin@go-ads.in'], // Replace with your actual admin email(s)
```

You can add multiple recipients:
```typescript
to: ['admin1@go-ads.in', 'admin2@go-ads.in', 'finance@go-ads.in'],
```

### 3. Set Up Automated Scheduling (Optional)

To run the reminder check automatically every day, you can:

#### Option A: Use Supabase Cron Jobs (Recommended)
Add to your `supabase/config.toml`:

```toml
[functions.send-power-bill-reminders.cron]
schedule = "0 9 * * *"  # Run daily at 9 AM
```

#### Option B: Use External Cron Service
Services like:
- Cron-job.org
- EasyCron
- Your own server's crontab

Set up a daily HTTP request to:
```
POST https://psryfvfdmjguhamvmqqd.supabase.co/functions/v1/send-power-bill-reminders
```

### 4. Manual Trigger

You can manually trigger the reminder check anytime using:

```bash
curl -X POST \
  'https://psryfvfdmjguhamvmqqd.supabase.co/functions/v1/send-power-bill-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

Or create a button in the UI to trigger it.

## Email Preview

The reminder emails include:
- 📧 **Subject (3-day)**: "⚠️ X Power Bills Due in 3 Days"
- 📧 **Subject (7-day)**: "📅 X Power Bills Due in 7 Days"
- Professional gradient header
- Color-coded urgency (yellow for 3-day, blue for 7-day)
- Responsive table layout
- Total calculations
- Action checklist

## Testing

To test the reminder system:

1. Create test bills in the database with due dates 3 or 7 days from today
2. Manually invoke the edge function
3. Check your email inbox for the reminder

Example SQL for test data:
```sql
INSERT INTO asset_power_bills (
  asset_id, bill_month, bill_amount, 
  consumer_name, service_number, payment_status
) VALUES (
  'HYD-BSQ-0001',
  CURRENT_DATE + INTERVAL '3 days',
  2500,
  'Test Consumer',
  'SRV-001',
  'Pending'
);
```

## Dashboard Navigation

From the Power Bills Dashboard (`/admin/power-bills`), you can:
- Click **"Analytics"** → View analytics dashboard
- Click **"Bulk Payment"** → Process multiple payments
- Click **"Bulk Upload"** → Import bills from Excel

## Support

If emails are not being sent:
1. Verify `RESEND_API_KEY` is configured
2. Check email domain is verified on Resend
3. Check edge function logs for errors
4. Verify recipient email addresses are correct

## Future Enhancements

Potential improvements:
- WhatsApp reminders integration
- SMS notifications for urgent bills
- Per-asset custom reminder schedules
- Auto-escalation for overdue bills
- Dashboard widget showing upcoming reminders
