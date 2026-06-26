
/*
  # Seed Test Data for Reviews System

  1. Test Users Created
    - Manager: sarah.johnson@eposnow.com (Sales Manager)
    - Employees: john.smith@eposnow.com, emma.wilson@eposnow.com, david.brown@eposnow.com (Sales team members)
    - Leadership: michael.davies@eposnow.com (Sales Director)

  2. Sample Data
    - Historical reviews for each employee
    - Action items (completed and pending)
    - Review items across categories (Wins, Blockers, KPI, Values)
    - Scheduled reviews for Q1-Q4 2026

  3. Security
    - All passwords: password123
    - Email confirmed for all test accounts
*/

-- Create test auth users
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
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'sarah.johnson@eposnow.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'john.smith@eposnow.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'emma.wilson@eposnow.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'david.brown@eposnow.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'michael.davies@eposnow.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

SELECT 'Batch AA executed successfully' as status;
