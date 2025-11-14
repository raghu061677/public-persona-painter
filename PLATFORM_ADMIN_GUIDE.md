# Platform Admin Setup Guide

## What is Platform Admin?

Platform Admin is the **master account** for Go-Ads 360° that has full access to:

- ✅ **Companies Management** - View, approve, suspend all media owners and agencies
- ✅ **Global User Management** - Manage all users across all companies
- ✅ **Marketplace Control** - Oversee all asset listings and bookings
- ✅ **Subscription Management** - Handle billing and subscriptions
- ✅ **Commission Tracking** - Monitor platform fees and transactions
- ✅ **System-Wide Analytics** - View aggregated reports across all tenants

## Quick Setup (2 Steps)

### Step 1: Navigate to Setup Page

Go to: **`/admin/platform-admin-setup`**

Or click this link in your browser:
```
http://localhost:5173/admin/platform-admin-setup
```

### Step 2: Click "Setup Platform Admin Access"

The system will:
1. Create a "Go-Ads Platform" company (type: `platform_admin`)
2. Link your user account to this company as an admin
3. Grant you full platform access

**That's it!** After the page refreshes, you'll have access to all platform admin features.

---

## What You Can Access After Setup

### 1. Companies Management (`/admin/companies`)
View all registered companies (media owners and agencies):
- Approve pending registrations
- Suspend or activate companies
- View company details and users
- Manage subscriptions

### 2. Platform Admin Dashboard (`/admin/platform`)
System-wide overview:
- Total companies, users, assets
- Revenue across all tenants
- Active campaigns
- Platform health metrics

### 3. Global User Management
- View users from all companies
- Reset passwords
- Assign roles
- Monitor user activity

### 4. Marketplace Oversight
- See all public assets from all media owners
- Monitor booking requests
- Track commission fees

### 5. Subscription & Billing
- Manage subscription tiers
- Track payments
- Calculate commissions
- Generate platform revenue reports

---

## Architecture Overview

### Three Company Types

1. **Media Owner** 
   - Owns OOH advertising assets (billboards, hoardings, etc.)
   - Can make assets public on marketplace
   - Receives bookings from agencies

2. **Agency**
   - Runs campaigns for brand clients
   - Can book media from owners via marketplace
   - Pays portal fees (2% commission)

3. **Platform Admin** (You!)
   - Manages the entire Go-Ads 360° platform
   - Has visibility into all companies
   - Controls approvals and subscriptions

### Security Model

Platform admin access uses:
- Special company type: `type = 'platform_admin'`
- RLS function: `is_platform_admin(user_id)` checks if user belongs to platform admin company
- All database policies respect this check

---

## Troubleshooting

**Problem:** Still getting "You don't have permission to access this page"

**Solution:**
1. Make sure you completed the setup at `/admin/platform-admin-setup`
2. Log out and log back in to refresh your session
3. Check the backend to verify your account is linked to the platform admin company

<lov-actions>
  <lov-open-backend>View Backend</lov-open-backend>
</lov-actions>

**Check in Backend:**
- Go to `company_users` table
- Find your user_id
- Verify `company_id` links to a company with `type = 'platform_admin'`

---

## Next Steps After Setup

1. **Onboard Demo Companies**
   - Create sample media owner and agency for testing
   - Use `/onboarding` route or run `SELECT seed_demo_companies()`

2. **Configure Platform Settings**
   - Set subscription tiers and pricing
   - Define commission rates
   - Configure approval workflows

3. **Invite Team Members**
   - Add other administrators via User Management
   - Assign appropriate roles

4. **Start Onboarding Real Companies**
   - Review pending registrations in Companies Management
   - Approve legitimate businesses
   - Monitor marketplace activity

---

## Manual Setup (Alternative Method)

If the automatic setup doesn't work, you can manually run this in the backend SQL editor:

```sql
-- Replace 'your-email@example.com' with your actual email
SELECT setup_platform_admin('your-email@example.com', 'Go-Ads Platform');
```

This will return a JSON response showing success and the created company ID.
