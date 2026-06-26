/*
  # Add reset_skills_matrix_data function

  ## Summary
  Creates a SECURITY DEFINER function that allows full admins to delete all Skills Matrix
  builder test data without touching any other system data.

  ## What it deletes (in safe order to respect FK constraints)
  1. sm_escalations       — escalation logs linked to assessment cycles
  2. sm_mismatches        — rating mismatch flags linked to assessment cycles
  3. sm_assessment_items  — individual topic ratings linked to assessments
  4. sm_assessments       — assessment instances linked to cycles
  5. sm_assessment_cycles — assessment cycles linked to matrices
  6. sm_training_records  — training completion records linked to matrices
  7. sm_role_topics       — topic-role assignments linked to matrices
  8. sm_matrices          — the matrix headers themselves

  ## What it NEVER deletes
  - sm_types, sm_categories, sm_topics  (Topics Library — structure preserved)
  - profiles, auth.users               (users)
  - job_families, departments          (roles, departments)
  - career_plans, pathways data        (career data)
  - one_to_one_* tables                (1:1 review data)

  ## Security
  - SECURITY DEFINER so it bypasses RLS (needed to delete across all rows)
  - Caller must be authenticated and have role='admin' AND admin_type IS NOT NULL
  - Returns a JSON result with deleted row counts for transparency
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
  v_matrices int;
BEGIN
  -- Verify caller identity
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

  -- 1. Escalations
  DELETE FROM sm_escalations
  WHERE cycle_id IN (SELECT id FROM sm_assessment_cycles);
  GET DIAGNOSTICS v_escalations = ROW_COUNT;

  -- 2. Mismatches
  DELETE FROM sm_mismatches
  WHERE cycle_id IN (SELECT id FROM sm_assessment_cycles);
  GET DIAGNOSTICS v_mismatches = ROW_COUNT;

  -- 3. Assessment items
  DELETE FROM sm_assessment_items
  WHERE assessment_id IN (SELECT id FROM sm_assessments);
  GET DIAGNOSTICS v_assessment_items = ROW_COUNT;

  -- 4. Assessments
  DELETE FROM sm_assessments;
  GET DIAGNOSTICS v_assessments = ROW_COUNT;

  -- 5. Assessment cycles
  DELETE FROM sm_assessment_cycles;
  GET DIAGNOSTICS v_cycles = ROW_COUNT;

  -- 6. Training records
  DELETE FROM sm_training_records;
  GET DIAGNOSTICS v_training_records = ROW_COUNT;

  -- 7. Role topics
  DELETE FROM sm_role_topics;
  GET DIAGNOSTICS v_role_topics = ROW_COUNT;

  -- 8. Matrices
  DELETE FROM sm_matrices;
  GET DIAGNOSTICS v_matrices = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'matrices',         v_matrices,
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

-- Revoke public execute, grant only to authenticated users
-- (the function itself checks for full admin role)
REVOKE ALL ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;
