-- Fix RLS policies for company_users table to allow company creation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own company memberships" ON company_users;
DROP POLICY IF EXISTS "Users can insert their own company membership" ON company_users;
DROP POLICY IF EXISTS "Users can update their own company membership" ON company_users;
DROP POLICY IF EXISTS "Platform admins can manage all company users" ON company_users;

-- Allow users to view their own company memberships
CREATE POLICY "Users can view their own company memberships"
ON company_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- Allow users to create their own company membership (for onboarding)
CREATE POLICY "Users can create their own company membership"
ON company_users
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own company membership
CREATE POLICY "Users can update their own company membership"
ON company_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_platform_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- Allow platform admins to manage all company users
CREATE POLICY "Platform admins can manage all company users"
ON company_users
FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));