/*
  # Create Test Users - No Naming Conflicts

  ## Overview
  Creates test users with proper password hashing and no variable naming conflicts.

  ## Test Accounts
  - admin@test.com - password: password123
  - manager@test.com - password: password123
  - employee@test.com - password: password123
*/

-- Clean up existing test users
DELETE FROM public.profiles WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com');

DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com')
);

DELETE FROM auth.users WHERE email IN ('admin@test.com', 'manager@test.com', 'employee@test.com');

-- Create test users
DO $$
DECLARE
  v_employee_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  v_manager_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid;
  v_admin_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid;
  v_hashed_password text;
BEGIN
  -- Hash the password 'password123'
  v_hashed_password := crypt('password123', gen_salt('bf'));

  -- Insert employee user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_employee_id, 'authenticated', 'authenticated',
    'employee@test.com', v_hashed_password, NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Employee","role":"employee"}'::jsonb,
    NOW(), NOW(), '', '', '', '', false
  );

  -- Insert manager user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_manager_id, 'authenticated', 'authenticated',
    'manager@test.com', v_hashed_password, NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Manager","role":"manager"}'::jsonb,
    NOW(), NOW(), '', '', '', '', false
  );

  -- Insert admin user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
    'admin@test.com', v_hashed_password, NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Admin","role":"admin"}'::jsonb,
    NOW(), NOW(), '', '', '', '', false
  );

  -- Create identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (v_employee_id, v_employee_id, format('{"sub":"%s","email":"employee@test.com"}', v_employee_id)::jsonb, 'email', v_employee_id::text, NOW(), NOW(), NOW()),
    (v_manager_id, v_manager_id, format('{"sub":"%s","email":"manager@test.com"}', v_manager_id)::jsonb, 'email', v_manager_id::text, NOW(), NOW(), NOW()),
    (v_admin_id, v_admin_id, format('{"sub":"%s","email":"admin@test.com"}', v_admin_id)::jsonb, 'email', v_admin_id::text, NOW(), NOW(), NOW());

  -- Update profiles (they should have been created by the trigger)
  UPDATE public.profiles 
  SET 
    role = 'employee'::user_role,
    department = 'Support',
    job_title = 'Support Specialist',
    manager_id = v_manager_id,
    tenure = 1
  WHERE id = v_employee_id;

  UPDATE public.profiles 
  SET 
    role = 'manager'::user_role,
    department = 'Support',
    job_title = 'Support Team Lead',
    tenure = 3
  WHERE id = v_manager_id;

  UPDATE public.profiles 
  SET 
    role = 'admin'::user_role,
    department = 'Operations',
    job_title = 'System Administrator',
    tenure = 5
  WHERE id = v_admin_id;
END $$;
