/*
  # Enhanced Admin Access Level System

  1. New Access Levels
    - full_admin: Full system view, can view as others, but cannot amend/approve in view-as mode
    - job_families_admin: Can access and amend all job family functionalities
    - people_admin: Can add users, reset passwords, add training
    - manager: Existing manager access
    - employee: Existing employee access

  2. New Tables
    - admin_permissions: Stores granular admin permissions
    - view_as_sessions: Tracks when admins are viewing as other users

  3. Changes
    - Add admin_type column to profiles
    - Add can_view_as permission
    - Add audit logging for view-as actions

  4. Security
    - Only full_admin can use view-as functionality
    - All view-as actions are logged
    - RLS policies restrict access appropriately
*/

-- Add admin_type column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_type text;
  END IF;
END $$;

-- Update existing admin users to full_admin type
UPDATE profiles 
SET admin_type = 'full_admin' 
WHERE role = 'admin' AND admin_type IS NULL;

-- Create admin permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user admin permissions mapping
CREATE TABLE IF NOT EXISTS user_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_name text REFERENCES admin_permissions(name) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);

-- Create view-as sessions table for audit trail
CREATE TABLE IF NOT EXISTS view_as_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Insert standard admin permissions
INSERT INTO admin_permissions (name, description) VALUES
  ('view_as_user', 'Can view the system as another user'),
  ('manage_users', 'Can add, edit, and manage user accounts'),
  ('reset_passwords', 'Can reset user passwords'),
  ('manage_job_families', 'Can create and edit job families'),
  ('manage_training', 'Can add and manage training modules'),
  ('manage_reviews', 'Can manage review templates and processes'),
  ('manage_strategic_roadmap', 'Can edit strategic roadmap'),
  ('manage_competency_framework', 'Can edit competency framework'),
  ('manage_departments', 'Can manage departments and job titles'),
  ('view_all_data', 'Can view all system data')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_as_sessions ENABLE ROW LEVEL SECURITY;

-- Admin permissions policies
CREATE POLICY "Admins can view all permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User admin permissions policies
CREATE POLICY "Admins can view user permissions"
  ON user_admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Full admins can grant permissions"
  ON user_admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

CREATE POLICY "Full admins can revoke permissions"
  ON user_admin_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

-- View-as sessions policies
CREATE POLICY "Admins can view their own view-as sessions"
  ON view_as_sessions FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Full admins can create view-as sessions"
  ON view_as_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

CREATE POLICY "Full admins can end their view-as sessions"
  ON view_as_sessions FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_user_id 
  ON user_admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_permission 
  ON user_admin_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin 
  ON view_as_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target 
  ON view_as_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_active 
  ON view_as_sessions(admin_id, ended_at) 
  WHERE ended_at IS NULL;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  user_id uuid,
  permission_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_admin_permissions uap
    WHERE uap.user_id = $1
    AND uap.permission_name = $2
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_admin_permission(uuid, text) TO authenticated;

-- Function to get active view-as session
CREATE OR REPLACE FUNCTION get_active_view_as_session(admin_user_id uuid)
RETURNS TABLE (
  session_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
  target_role text,
  started_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vas.id as session_id,
    vas.target_user_id,
    p.email as target_email,
    p.full_name as target_name,
    p.role as target_role,
    vas.started_at
  FROM view_as_sessions vas
  JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id
  AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_view_as_session(uuid) TO authenticated;

-- Automatically grant permissions based on admin_type
CREATE OR REPLACE FUNCTION sync_admin_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing permissions for this user
  DELETE FROM user_admin_permissions WHERE user_id = NEW.id;
  
  -- Grant permissions based on admin_type
  IF NEW.role = 'admin' THEN
    CASE NEW.admin_type
      WHEN 'full_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions;
        
      WHEN 'job_families_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions
        WHERE name IN (
          'manage_job_families',
          'manage_competency_framework',
          'view_all_data'
        );
        
      WHEN 'people_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions
        WHERE name IN (
          'manage_users',
          'reset_passwords',
          'manage_training',
          'view_all_data'
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync permissions
DROP TRIGGER IF EXISTS sync_admin_permissions_trigger ON profiles;
CREATE TRIGGER sync_admin_permissions_trigger
  AFTER INSERT OR UPDATE OF role, admin_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_permissions();

-- Sync existing admin users
UPDATE profiles SET admin_type = admin_type WHERE role = 'admin';

COMMENT ON TABLE admin_permissions IS 'Defines available admin permissions in the system';
COMMENT ON TABLE user_admin_permissions IS 'Maps users to their granted admin permissions';
COMMENT ON TABLE view_as_sessions IS 'Audit trail of when admins view system as other users';
COMMENT ON FUNCTION has_admin_permission IS 'Check if a user has a specific admin permission';
COMMENT ON FUNCTION get_active_view_as_session IS 'Get the currently active view-as session for an admin';
