/*
  # Create Admin Test User

  ## Changes
  
  1. Creates test admin user in auth.users
  2. Creates corresponding profile with admin role
  
  ## Test Credentials
  - Email: admin@test.com
  - Password: admin123
  - Role: admin
*/

-- Create admin user in auth.users
DO $$
DECLARE
  admin_user_id uuid := '99999999-9999-9999-9999-999999999999';
BEGIN
  -- Insert admin user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id) THEN
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
      updated_at
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@test.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  END IF;

  -- Insert identity if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = admin_user_id) THEN
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id::text,
      admin_user_id,
      format('{"sub":"%s","email":"admin@test.com"}', admin_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Insert or update profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    department,
    tenure,
    created_at
  ) VALUES (
    admin_user_id,
    'admin@test.com',
    'System Administrator',
    'admin',
    'IT',
    5,
    now()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    role = 'admin',
    full_name = 'System Administrator',
    department = 'IT';
END $$;