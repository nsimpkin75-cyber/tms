/*
  # Create Test Authentication Users

  ## Overview
  Creates authenticated test users in the auth.users table for development and testing.
  Each user is created with the password "password123" and their profile is automatically
  created via triggers.

  ## Test Accounts Created
  1. employee@test.com - Employee role
  2. manager@test.com - Manager role  
  3. admin@test.com - Admin role

  ## Notes
  - All test accounts use password: password123
  - Email confirmation is skipped for test accounts
  - Profiles will be created automatically via database triggers
  - Users can log in immediately after this migration runs

  ## Security
  - Uses pgcrypto extension for secure password hashing
  - Follows Supabase auth.users table structure
*/

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert test users into auth.users with hashed passwords
-- Password: password123
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'employee@test.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Employee"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manager@test.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Manager"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@test.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Admin"}'::jsonb,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create corresponding identities for email authentication
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'email',
    jsonb_build_object(
      'sub', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::text,
      'email', 'employee@test.com'
    ),
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'email',
    jsonb_build_object(
      'sub', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::text,
      'email', 'manager@test.com'
    ),
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'email',
    jsonb_build_object(
      'sub', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::text,
      'email', 'admin@test.com'
    ),
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create profiles for test users
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  department,
  tenure
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'employee@test.com',
    'Test Employee',
    'employee',
    'Support',
    1
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'manager@test.com',
    'Test Manager',
    'manager',
    'Support',
    3
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'admin@test.com',
    'Test Admin',
    'admin',
    'Operations',
    5
  )
ON CONFLICT (id) DO NOTHING;