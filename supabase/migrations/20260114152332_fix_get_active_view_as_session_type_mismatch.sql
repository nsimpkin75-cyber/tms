/*
  # Fix get_active_view_as_session function type mismatch

  1. Changes
    - Cast the role column to text to match the function return type
    - This fixes the "structure of query does not match function result type" error
  
  2. Issue
    - The profiles.role column is of type user_role (enum)
    - The function declares it returns text
    - Need to explicitly cast user_role to text in the SELECT statement
*/

-- Recreate the function with proper type casting
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
    p.role::text as target_role,  -- Cast enum to text
    vas.started_at
  FROM view_as_sessions vas
  JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id
  AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC
  LIMIT 1;
END;
$$;
