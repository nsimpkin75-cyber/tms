/*
  # Update reset_skills_matrix_data function

  ## Summary
  Updates the reset function to also delete sm_matrix_roles (job family assignments per matrix),
  which was missed in the initial version. Adds it between sm_role_topics and sm_matrices deletion.
*/

CREATE OR REPLACE FUNCTION public.reset_skills_matrix_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_full_admin boolean;
  v_escalations int;
  v_mismatches int;
  v_assessment_items int;
  v_assessments int;
  v_cycles int;
  v_training_records int;
  v_role_topics int;
  v_matrix_roles int;
  v_matrices int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (role = 'admin' AND admin_type IS NOT NULL AND admin_type <> '')
  INTO v_is_full_admin
  FROM profiles
  WHERE id = v_uid;

  IF NOT COALESCE(v_is_full_admin, false) THEN
    RAISE EXCEPTION 'Access denied: Full Admin role required';
  END IF;

  -- Delete in FK-safe order

  DELETE FROM sm_escalations;
  GET DIAGNOSTICS v_escalations = ROW_COUNT;

  DELETE FROM sm_mismatches;
  GET DIAGNOSTICS v_mismatches = ROW_COUNT;

  DELETE FROM sm_assessment_items;
  GET DIAGNOSTICS v_assessment_items = ROW_COUNT;

  DELETE FROM sm_assessments;
  GET DIAGNOSTICS v_assessments = ROW_COUNT;

  DELETE FROM sm_assessment_cycles;
  GET DIAGNOSTICS v_cycles = ROW_COUNT;

  DELETE FROM sm_training_records;
  GET DIAGNOSTICS v_training_records = ROW_COUNT;

  DELETE FROM sm_role_topics;
  GET DIAGNOSTICS v_role_topics = ROW_COUNT;

  DELETE FROM sm_matrix_roles;
  GET DIAGNOSTICS v_matrix_roles = ROW_COUNT;

  DELETE FROM sm_matrices;
  GET DIAGNOSTICS v_matrices = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'matrices',         v_matrices,
      'matrix_roles',     v_matrix_roles,
      'role_topics',      v_role_topics,
      'training_records', v_training_records,
      'cycles',           v_cycles,
      'assessments',      v_assessments,
      'assessment_items', v_assessment_items,
      'mismatches',       v_mismatches,
      'escalations',      v_escalations
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;
