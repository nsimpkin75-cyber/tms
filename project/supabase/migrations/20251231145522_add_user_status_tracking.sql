/*
  # Add User Status Tracking

  1. Updates to profiles table
    - Add `active` (boolean) - Manual activation/deactivation by admin
    - Default to true for new users
  
  2. New View
    - `user_status_view` - Combines profiles with auth.users to show complete status
    - Shows: id, email, full_name, role, active (manual), confirmed (email), status (computed)
  
  3. Security
    - Only admins can update active status
    - View is accessible to authenticated users
  
  4. Status Logic
    - "pending" - User invited but hasn't confirmed email (confirmed_at IS NULL)
    - "inactive" - Admin deactivated (active = false)
    - "active" - User confirmed and active (confirmed_at IS NOT NULL AND active = true)
*/

-- Add active field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Create view to show user status combining profiles and auth.users
CREATE OR REPLACE VIEW user_status_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.job_title,
  p.department,
  p.tenure,
  p.manager_id,
  p.job_family_id,
  p.has_strategic_roadmap_access,
  p.active,
  p.created_at,
  au.confirmed_at,
  CASE 
    WHEN au.confirmed_at IS NULL THEN 'pending'
    WHEN p.active = false THEN 'inactive'
    ELSE 'active'
  END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant access to the view
GRANT SELECT ON user_status_view TO authenticated;

-- Update policy to allow admins to update active status
CREATE POLICY "Admins can update user active status"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
