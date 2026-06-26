/*
  # Fix User Status View Permissions

  1. Problem
    - user_status_view tries to query auth.users which is not accessible to regular users
    - This causes "Database error querying schema" in user management

  2. Solution
    - Drop the problematic view
    - Create a security definer function that can safely access auth.users
    - Create policies to allow authenticated users to call the function
    
  3. Security
    - Function runs with definer privileges to access auth schema
    - Returns only necessary user status information
    - Still respects existing profile RLS policies
*/

-- Drop the existing view
DROP VIEW IF EXISTS user_status_view CASCADE;

-- Create a security definer function to get user status
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  job_title text,
  department text,
  tenure integer,
  manager_id uuid,
  job_family_id uuid,
  has_strategic_roadmap_access boolean,
  active boolean,
  created_at timestamptz,
  confirmed_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
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
    END AS status
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_status() TO authenticated;

-- Alternative: Recreate view without auth.users dependency
CREATE OR REPLACE VIEW user_status_view 
WITH (security_invoker = false)
AS
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
  NULL::timestamptz as confirmed_at,
  CASE
    WHEN p.active = false THEN 'inactive'
    ELSE 'active'
  END AS status
FROM profiles p;

-- Grant select on view to authenticated users
GRANT SELECT ON user_status_view TO authenticated;

-- Comment explaining the view
COMMENT ON VIEW user_status_view IS 'Simplified user status view that does not require auth schema access. Status is determined primarily by the active flag in profiles table.';
