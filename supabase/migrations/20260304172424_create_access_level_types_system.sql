/*
  # Access Level Types System

  1. New Tables
    - access_level_types: Configurable access level types with permissions
    - user_access_levels: Junction table for multi-select user access levels

  2. Changes
    - Profiles table will continue to have role column for backward compatibility
    - New system allows multiple access levels per user

  3. Security
    - Enable RLS on all tables
    - Only admins can manage access level types
    - Admins can assign access levels to users

  4. Default Access Levels
    - Employee
    - Manager
    - Admin
    - L&D Admin (new - with specific permissions)
*/

-- Access Level Types table
CREATE TABLE IF NOT EXISTS access_level_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE access_level_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view access level types"
  ON access_level_types FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage access level types"
  ON access_level_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- User Access Levels junction table
CREATE TABLE IF NOT EXISTS user_access_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  access_level_id uuid REFERENCES access_level_types(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, access_level_id)
);

ALTER TABLE user_access_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access levels"
  ON user_access_levels FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all access levels"
  ON user_access_levels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage access levels"
  ON user_access_levels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_access_levels_user ON user_access_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_levels_access_level ON user_access_levels(access_level_id);

-- Insert default access level types
INSERT INTO access_level_types (name, description, permissions, is_system) VALUES
  (
    'Employee',
    'Standard employee access',
    '{"view_own_profile": true, "view_own_reviews": true, "access_training": true, "access_career_plans": true}',
    true
  ),
  (
    'Manager',
    'Team manager access',
    '{"view_own_profile": true, "view_own_reviews": true, "access_training": true, "access_career_plans": true, "manage_team": true, "conduct_reviews": true, "view_team_reports": true}',
    true
  ),
  (
    'Admin',
    'Full system administrator',
    '{"full_access": true}',
    true
  ),
  (
    'L&D Admin',
    'Learning & Development administrator',
    '{"view_own_profile": true, "create_skills_matrices": true, "create_assessment_forms": true, "send_assessment_forms": true, "manage_training": true, "access_reports": true, "view_all_users": true}',
    false
  )
ON CONFLICT (name) DO NOTHING;

-- Migrate existing users to new system
DO $$
DECLARE
  employee_id uuid;
  manager_id uuid;
  admin_id uuid;
  user_record RECORD;
BEGIN
  -- Get access level type IDs
  SELECT id INTO employee_id FROM access_level_types WHERE name = 'Employee';
  SELECT id INTO manager_id FROM access_level_types WHERE name = 'Manager';
  SELECT id INTO admin_id FROM access_level_types WHERE name = 'Admin';

  -- Migrate existing users
  FOR user_record IN SELECT id, role FROM profiles LOOP
    IF user_record.role = 'admin' THEN
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, admin_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    ELSIF user_record.role = 'manager' THEN
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, manager_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    ELSE
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, employee_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Create helper function to check if user has access level
CREATE OR REPLACE FUNCTION has_access_level(user_id_param uuid, level_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_access_levels ual
    JOIN access_level_types alt ON ual.access_level_id = alt.id
    WHERE ual.user_id = user_id_param
    AND alt.name = level_name
    AND alt.is_active = true
  );
END;
$$;

-- Create helper function to get user's access levels
CREATE OR REPLACE FUNCTION get_user_access_levels(user_id_param uuid)
RETURNS TABLE(id uuid, name text, permissions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT alt.id, alt.name, alt.permissions
  FROM user_access_levels ual
  JOIN access_level_types alt ON ual.access_level_id = alt.id
  WHERE ual.user_id = user_id_param
  AND alt.is_active = true;
END;
$$;