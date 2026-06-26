/*
  # Seed Complete Review Data for Rachel - Simplified

  1. Purpose
    - Assign Rachel a job title so competencies can load
    - Create KPIs in the strategy and link to review cycle
    - Create actions for Rachel in the cycle
  
  2. Changes
    - Update Rachel's profile with job title
    - Create strategy focus area and KPIs, link to review cycle
    - Create cycle actions for the review cycle
    - Create employee actions for Rachel
*/

-- Step 1: Assign Rachel a job title (Software Engineer)
UPDATE profiles
SET job_title_id = (SELECT id FROM job_titles WHERE title = 'Software Engineer' LIMIT 1),
    job_title = 'Software Engineer'
WHERE email = 'rachel.schaanning@eposnow.com';

-- Step 2: Create Strategy Focus Area and KPIs
DO $$
DECLARE
  v_strategy_id uuid := '91887bca-6128-4e49-b471-adda505483ba';
  v_cycle_id uuid := 'ed019143-4d01-4acf-853a-349a70abb9e0';
  v_rachel_id uuid := '32e70912-f163-4bac-af4d-7db5dce10e98';
  v_manager_id uuid;
  v_focus_area_id uuid;
BEGIN
  -- Get manager ID
  SELECT manager_id INTO v_manager_id FROM review_cycles WHERE id = v_cycle_id;

  -- Create a focus area for the strategy
  INSERT INTO strategy_focus_areas (strategy_id, title, description, sort_order)
  VALUES (v_strategy_id, 'Product Development', 'Deliver high-quality software products on time', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_focus_area_id;

  -- If focus area already exists, get its ID
  IF v_focus_area_id IS NULL THEN
    SELECT id INTO v_focus_area_id
    FROM strategy_focus_areas
    WHERE strategy_id = v_strategy_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- If still no focus area, create one
  IF v_focus_area_id IS NULL THEN
    INSERT INTO strategy_focus_areas (strategy_id, title, description, sort_order)
    VALUES (v_strategy_id, 'Product Development', 'Deliver high-quality software products on time', 1)
    RETURNING id INTO v_focus_area_id;
  END IF;

  -- Create KPIs for the strategy
  INSERT INTO strategy_kpis (
    strategy_id,
    focus_area_id,
    title,
    description,
    success_measure,
    target_value,
    current_value,
    measurement_unit
  )
  VALUES 
    (
      v_strategy_id,
      v_focus_area_id,
      'Sprint Velocity',
      'Measure team productivity through story points completed',
      '40 story points per sprint',
      40,
      35,
      'story points'
    ),
    (
      v_strategy_id,
      v_focus_area_id,
      'Code Quality Score',
      'Maintain high code quality standards',
      '90% or above',
      90,
      88,
      'percentage'
    ),
    (
      v_strategy_id,
      v_focus_area_id,
      'Bug Resolution Time',
      'Resolve bugs quickly to maintain product quality',
      'Under 48 hours average',
      48,
      52,
      'hours'
    )
  ON CONFLICT DO NOTHING;

  -- Link these KPIs to the review cycle
  INSERT INTO review_cycle_kpis (cycle_id, kpi_name, kpi_target, kpi_measurement_unit, from_strategy, can_remove, sort_order)
  SELECT 
    v_cycle_id,
    sk.title,
    sk.success_measure,
    sk.measurement_unit,
    true,
    false,
    ROW_NUMBER() OVER (ORDER BY sk.created_at)::integer
  FROM strategy_kpis sk
  WHERE sk.strategy_id = v_strategy_id
    AND sk.focus_area_id = v_focus_area_id
    AND NOT EXISTS (
      SELECT 1 FROM review_cycle_kpis rck
      WHERE rck.cycle_id = v_cycle_id AND rck.kpi_name = sk.title
    );

  -- Create cycle actions (standard actions for the cycle)
  INSERT INTO review_cycle_actions (cycle_id, action_title, action_description, default_target_date)
  VALUES 
    (v_cycle_id, 'Implement automated testing framework', 'Set up Jest and Cypress for comprehensive frontend testing coverage', (CURRENT_DATE + INTERVAL '30 days')::date),
    (v_cycle_id, 'Refactor authentication module', 'Improve security and maintainability of authentication code', (CURRENT_DATE + INTERVAL '45 days')::date),
    (v_cycle_id, 'Document API endpoints', 'Create comprehensive API documentation for internal and external use', (CURRENT_DATE + INTERVAL '21 days')::date)
  ON CONFLICT DO NOTHING;

  -- Create employee actions for Rachel
  INSERT INTO review_employee_actions (
    cycle_id,
    employee_id,
    action_title,
    action_owner,
    target_date,
    status,
    is_overdue
  )
  VALUES 
    (
      v_cycle_id,
      v_rachel_id,
      'Implement automated testing framework',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'in_progress',
      false
    ),
    (
      v_cycle_id,
      v_rachel_id,
      'Refactor authentication module',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '45 days')::date,
      'in_progress',
      false
    ),
    (
      v_cycle_id,
      v_rachel_id,
      'Document API endpoints',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '21 days')::date,
      'in_progress',
      false
    )
  ON CONFLICT DO NOTHING;

END $$;
