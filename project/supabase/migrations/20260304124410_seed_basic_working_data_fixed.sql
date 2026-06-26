/*
  # Seed Basic Working Data

  1. Data Added
    - Manager relationship between test users
    - Sample reviews for demonstration
    - Job family assignments for users
    
  2. Notes
    - Works with existing schema
    - Creates minimal viable data for testing
*/

-- Set up manager relationships
DO $$
DECLARE
  v_manager_id uuid;
  v_admin_id uuid;
  v_employee_id uuid;
BEGIN
  SELECT id INTO v_manager_id FROM profiles WHERE email = 'manager@test.com' LIMIT 1;
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'admin@test.com' LIMIT 1;
  SELECT id INTO v_employee_id FROM profiles WHERE email = 'employee@test.com' LIMIT 1;
  
  -- Employee reports to manager
  IF v_employee_id IS NOT NULL AND v_manager_id IS NOT NULL THEN
    UPDATE profiles 
    SET manager_id = v_manager_id
    WHERE id = v_employee_id;
  END IF;
  
  -- Manager reports to admin
  IF v_manager_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
    UPDATE profiles 
    SET manager_id = v_admin_id
    WHERE id = v_manager_id;
  END IF;
END $$;

-- Assign job families
DO $$
DECLARE
  v_support_job_id uuid;
  v_employee_id uuid;
  v_manager_id uuid;
BEGIN
  SELECT id INTO v_support_job_id FROM job_families WHERE department = 'Support' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_employee_id FROM profiles WHERE email = 'employee@test.com' LIMIT 1;
  SELECT id INTO v_manager_id FROM profiles WHERE email = 'manager@test.com' LIMIT 1;
  
  IF v_support_job_id IS NOT NULL THEN
    UPDATE profiles 
    SET job_family_id = v_support_job_id
    WHERE id IN (v_employee_id, v_manager_id);
  END IF;
END $$;

-- Create sample review
DO $$
DECLARE
  v_manager_id uuid;
  v_employee_id uuid;
  v_review_id uuid;
BEGIN
  SELECT id INTO v_manager_id FROM profiles WHERE email = 'manager@test.com' LIMIT 1;
  SELECT id INTO v_employee_id FROM profiles WHERE email = 'employee@test.com' LIMIT 1;
  
  IF v_manager_id IS NOT NULL AND v_employee_id IS NOT NULL THEN
    INSERT INTO reviews (
      employee_id,
      manager_id,
      type,
      status,
      overall_rating,
      summary
    ) VALUES (
      v_employee_id,
      v_manager_id,
      'monthly',
      'completed',
      3,
      'Great progress this month. Strong performance on customer support metrics.'
    )
    RETURNING id INTO v_review_id;
    
    -- Add review items
    INSERT INTO review_items (review_id, category, content, rating) VALUES
    (v_review_id, 'Wins', 'Resolved 95% of tickets within SLA', 4),
    (v_review_id, 'Wins', 'Received positive customer feedback', 3),
    (v_review_id, 'KPI', 'Customer satisfaction score: 4.5/5', 4),
    (v_review_id, 'Values', 'Demonstrated excellent teamwork', 3);
  END IF;
END $$;

-- Create some action items
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id INTO v_employee_id FROM profiles WHERE email = 'employee@test.com' LIMIT 1;
  
  IF v_employee_id IS NOT NULL THEN
    INSERT INTO action_items (owner_id, text, due_date, completed) VALUES
    (v_employee_id, 'Complete customer service training', CURRENT_DATE + INTERVAL '7 days', false),
    (v_employee_id, 'Review documentation updates', CURRENT_DATE + INTERVAL '3 days', false),
    (v_employee_id, 'Mentor new team member', CURRENT_DATE + INTERVAL '14 days', false);
  END IF;
END $$;

-- Assign some skills to users
DO $$
DECLARE
  v_employee_id uuid;
  v_skill_id uuid;
BEGIN
  SELECT id INTO v_employee_id FROM profiles WHERE email = 'employee@test.com' LIMIT 1;
  
  IF v_employee_id IS NOT NULL THEN
    FOR v_skill_id IN (SELECT id FROM skills LIMIT 5)
    LOOP
      INSERT INTO profile_skills (profile_id, skill_id)
      VALUES (v_employee_id, v_skill_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
