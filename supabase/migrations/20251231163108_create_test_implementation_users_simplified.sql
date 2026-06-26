/*
  # Create Test Implementation Users (Simplified)

  1. Test Users Created
    - Implementation Manager (Sarah Johnson) - sarah.johnson@futures.com
    - Implementation Employee (Mike Roberts) - mike.roberts@futures.com
    Password for both: FuturesTest2025!

  2. Purpose
    - For UX review of both employee and manager views
    - Linked to Implementation department
    - Complete test data for reviews and performance tracking
*/

-- Create test users
DO $$
DECLARE
  v_manager_id uuid;
  v_employee_id uuid;
  v_manager_exists boolean;
  v_employee_exists boolean;
BEGIN
  -- Check if manager already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'sarah.johnson@futures.com') INTO v_manager_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'mike.roberts@futures.com') INTO v_employee_exists;

  -- Create implementation manager if not exists
  IF NOT v_manager_exists THEN
    v_manager_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_manager_id,
      '00000000-0000-0000-0000-000000000000',
      'sarah.johnson@futures.com',
      crypt('FuturesTest2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sarah Johnson"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      ''
    );

    -- Create auth identity for manager
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_manager_id,
      v_manager_id::text,
      'email',
      jsonb_build_object('sub', v_manager_id::text, 'email', 'sarah.johnson@futures.com'),
      now(),
      now(),
      now()
    );
  ELSE
    SELECT id INTO v_manager_id FROM auth.users WHERE email = 'sarah.johnson@futures.com';
  END IF;

  -- Create manager profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    department,
    job_title,
    manager_id,
    tenure,
    active
  ) VALUES (
    v_manager_id,
    'Sarah Johnson',
    'sarah.johnson@futures.com',
    'manager',
    'Implementation',
    'Implementation Manager',
    NULL,
    24,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title;

  -- Create implementation employee if not exists
  IF NOT v_employee_exists THEN
    v_employee_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_employee_id,
      '00000000-0000-0000-0000-000000000000',
      'mike.roberts@futures.com',
      crypt('FuturesTest2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mike Roberts"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      ''
    );

    -- Create auth identity for employee
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_employee_id,
      v_employee_id::text,
      'email',
      jsonb_build_object('sub', v_employee_id::text, 'email', 'mike.roberts@futures.com'),
      now(),
      now(),
      now()
    );
  ELSE
    SELECT id INTO v_employee_id FROM auth.users WHERE email = 'mike.roberts@futures.com';
  END IF;

  -- Create employee profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    department,
    job_title,
    manager_id,
    tenure,
    active
  ) VALUES (
    v_employee_id,
    'Mike Roberts',
    'mike.roberts@futures.com',
    'employee',
    'Implementation',
    'Professional Services Consultant',
    v_manager_id,
    7,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title,
    manager_id = EXCLUDED.manager_id;

  -- Delete any existing test data for these users
  DELETE FROM review_meetings WHERE employee_id = v_employee_id;
  DELETE FROM performance_ratings WHERE employee_id = v_employee_id;

  -- Create some sample weekly check-ins for the employee
  FOR i IN 1..4 LOOP
    INSERT INTO review_meetings (
      employee_id,
      manager_id,
      scheduled_date,
      meeting_type,
      review_type,
      week_number,
      status
    ) VALUES (
      v_employee_id,
      v_manager_id,
      CURRENT_DATE - ((4 - i) * 7),
      'weekly_1_1',
      'weekly_check_in',
      i,
      CASE WHEN i < 4 THEN 'completed' ELSE 'scheduled' END
    );
  END LOOP;

  -- Create a monthly one-to-one
  INSERT INTO review_meetings (
    employee_id,
    manager_id,
    scheduled_date,
    meeting_type,
    review_type,
    status
  ) VALUES (
    v_employee_id,
    v_manager_id,
    CURRENT_DATE + 7,
    'monthly_review',
    'monthly_one_to_one',
    'scheduled'
  );

  -- Create some performance ratings for the last 5 months
  FOR i IN 1..5 LOOP
    INSERT INTO performance_ratings (
      employee_id,
      review_period,
      competency_score,
      performance_score,
      overall_rating,
      rating_category
    ) VALUES (
      v_employee_id,
      DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::interval)::date,
      2.5 + (i * 0.1),
      3.0 + (i * 0.15),
      (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6,
      CASE 
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 4.5 THEN 'Outstanding'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 3.5 THEN 'Exceeds Expectations'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 3.0 THEN 'Meets Expectations'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 2.0 THEN 'Developing'
        ELSE 'Needs Improvement'
      END
    );
  END LOOP;

END $$;
