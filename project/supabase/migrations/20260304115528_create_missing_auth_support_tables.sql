/*
  # Create Missing Auth Support Tables and Functions
  
  1. Purpose
    - Create user_admin_permissions table for granular permissions
    - Create view_as_sessions table for admin impersonation
    - Create get_active_view_as_session function
  
  2. Tables Created
    - user_admin_permissions: Store granular admin permissions
    - view_as_sessions: Track admin view-as sessions
  
  3. Security
    - Enable RLS on all tables
    - Only admins can manage permissions
    - Only full admins can use view-as
*/

-- Create user_admin_permissions table
CREATE TABLE IF NOT EXISTS user_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_name text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);

ALTER TABLE user_admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all permissions"
  ON user_admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage permissions"
  ON user_admin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create view_as_sessions table
CREATE TABLE IF NOT EXISTS view_as_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE view_as_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own sessions"
  ON view_as_sessions FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can create sessions"
  ON view_as_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update own sessions"
  ON view_as_sessions FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Create get_active_view_as_session function
CREATE OR REPLACE FUNCTION get_active_view_as_session(admin_user_id uuid)
RETURNS TABLE (
  session_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
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
    vas.started_at
  FROM view_as_sessions vas
  JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id
    AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC
  LIMIT 1;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_user_id ON user_admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id ON view_as_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_active ON view_as_sessions(admin_id, ended_at) WHERE ended_at IS NULL;
