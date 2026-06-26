CREATE OR REPLACE FUNCTION is_cycle_member(p_cycle_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM review_cycle_members
    WHERE cycle_id = p_cycle_id 
    AND employee_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

GRANT EXECUTE ON FUNCTION is_cycle_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION is_leadership_or_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_leadership boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id 
    AND role IN ('leadership', 'admin')
  ) INTO v_is_leadership;
  
  RETURN v_is_leadership;
END;
$$;

GRANT EXECUTE ON FUNCTION is_leadership_or_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR is_cycle_member(id, auth.uid())
    OR is_leadership_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id AND rc.manager_id = auth.uid()
    )
    OR is_leadership_or_admin(auth.uid())
  );