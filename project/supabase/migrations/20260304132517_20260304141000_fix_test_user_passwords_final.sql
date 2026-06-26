/*
  # Fix Test User Passwords - Final

  ## Overview
  Regenerates test user passwords with proper bcrypt cost factor (10) for Supabase compatibility.

  ## Test Accounts
  - admin@test.com - password: password123
  - manager@test.com - password: password123
  - employee@test.com - password: password123
*/

-- Update passwords for test users with correct bcrypt cost
DO $$
DECLARE
  v_employee_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
  v_manager_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid;
  v_admin_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid;
  v_hashed_password text;
BEGIN
  -- Generate bcrypt hash with cost factor 10 (Supabase default)
  v_hashed_password := crypt('password123', gen_salt('bf', 10));

  -- Update passwords for all test users
  UPDATE auth.users
  SET 
    encrypted_password = v_hashed_password,
    updated_at = NOW()
  WHERE id IN (v_employee_id, v_manager_id, v_admin_id);
  
  -- Verify the update
  RAISE NOTICE 'Updated passwords for % users', (SELECT COUNT(*) FROM auth.users WHERE id IN (v_employee_id, v_manager_id, v_admin_id));
END $$;
