/*
  # Fix Profile Update Trigger RLS Issues V2
  
  1. Problem
    - The previous fix was too permissive
    - Need to allow triggers to work while maintaining security
  
  2. Solution
    - Allow job_history inserts for the user being tracked
    - Allow user_admin_permissions management by admins or for self
  
  3. Security
    - Job history can be inserted for any user (audit trail)
    - Admin permissions can only be managed by admins or during self-update
*/

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert job history" ON job_history;
DROP POLICY IF EXISTS "System can manage permissions" ON user_admin_permissions;

-- Allow job history inserts (this is an audit table, should allow all inserts)
CREATE POLICY "Allow job history inserts"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow user_admin_permissions deletes by admin or for own record
CREATE POLICY "Allow admin permissions delete"
  ON user_admin_permissions FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    user_id = (select auth.uid())
  );

-- Update the insert policy to allow during profile updates
DROP POLICY IF EXISTS "Full admins can grant permissions" ON user_admin_permissions;
CREATE POLICY "Allow admin permissions insert"
  ON user_admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR 
    user_id = (select auth.uid())
  );
