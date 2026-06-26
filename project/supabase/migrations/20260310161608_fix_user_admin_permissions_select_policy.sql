/*
  # Fix user_admin_permissions SELECT Policy

  1. Problem
    - Users cannot view their own permissions during login
    - Only admins can SELECT from user_admin_permissions
    - This causes 500 errors when non-admin users log in

  2. Solution
    - Add policy allowing users to view their own permissions
    - Keep admin policy for viewing all permissions

  3. Security
    - Users can only see their own permission records
    - Admins can see all permissions
*/

-- Add policy for users to view their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
