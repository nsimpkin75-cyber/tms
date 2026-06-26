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

-- Create corresponding profiles
INSERT INTO profiles (id, email, full_name, role, department, tenure) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sarah.johnson@eposnow.com', 'Sarah Johnson', 'manager', 'Sales', 5),
  ('22222222-2222-2222-2222-222222222222', 'john.smith@eposnow.com', 'John Smith', 'employee', 'Sales', 2),
  ('33333333-3333-3333-3333-333333333333', 'emma.wilson@eposnow.com', 'Emma Wilson', 'employee', 'Sales', 3),
  ('44444444-4444-4444-4444-444444444444', 'david.brown@eposnow.com', 'David Brown', 'employee', 'Sales', 1),
  ('55555555-5555-5555-5555-555555555555', 'michael.davies@eposnow.com', 'Michael Davies', 'leadership', 'Sales', 10)
ON CONFLICT (id) DO NOTHING;

-- Create sample reviews from manager to employees
INSERT INTO reviews (id, user_id, reviewer_id, rating, feedback, review_date) VALUES
  ('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 4, 'Excellent progress this month. Exceeded sales targets and demonstrated great customer engagement.', '2025-11-15 10:00:00+00'),
  ('a2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 5, 'Outstanding performance. Consistently delivers high-quality work and supports team members.', '2025-11-20 14:00:00+00'),
  ('a3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 3, 'Good effort this month. Focus on improving product knowledge and closing techniques.', '2025-11-18 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Create review items for each review
INSERT INTO review_items (review_id, category, content, rating) VALUES
  -- John's review items
  ('a1111111-1111-1111-1111-111111111111', 'Wins', 'Closed 15 new accounts, exceeding target by 25%', 4),
  ('a1111111-1111-1111-1111-111111111111', 'Wins', 'Received excellent customer feedback scores', 4),
  ('a1111111-1111-1111-1111-111111111111', 'KPI', 'Sales target achievement: 125%', 4),
  ('a1111111-1111-1111-1111-111111111111', 'Values', 'Demonstrated excellent teamwork and collaboration', 4),
  ('a1111111-1111-1111-1111-111111111111', 'Blockers', 'Needs better CRM documentation practices', 3),
  
  -- Emma's review items
  ('a2222222-2222-2222-2222-222222222222', 'Wins', 'Mentored two new team members successfully', 4),
  ('a2222222-2222-2222-2222-222222222222', 'Wins', 'Achieved highest customer satisfaction score in team', 4),
  ('a2222222-2222-2222-2222-222222222222', 'KPI', 'Customer retention rate: 98%', 4),
  ('a2222222-2222-2222-2222-222222222222', 'Values', 'Exemplifies company values in all interactions', 4),
  
  -- David's review items
  ('a3333333-3333-3333-3333-333333333333', 'Wins', 'Improved cold calling conversion rate', 3),
  ('a3333333-3333-3333-3333-333333333333', 'KPI', 'Sales target achievement: 85%', 3),
  ('a3333333-3333-3333-3333-333333333333', 'Blockers', 'Needs more product training and market knowledge', 2),
  ('a3333333-3333-3333-3333-333333333333', 'Values', 'Good attitude and willingness to learn', 3)
ON CONFLICT (id) DO NOTHING;

-- Create action items
INSERT INTO action_items (owner_id, text, due_date, completed, is_carry_over) VALUES
  -- John's actions
  ('22222222-2222-2222-2222-222222222222', 'Complete CRM training module', '2025-12-31', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Update all customer records in system', '2025-12-20', false, false),
  ('22222222-2222-2222-2222-222222222222', 'Shadow senior rep on enterprise deals', '2026-01-15', false, false),
  
  -- Emma's actions
  ('33333333-3333-3333-3333-333333333333', 'Lead monthly team training session', '2026-01-10', false, false),
  ('33333333-3333-3333-3333-333333333333', 'Document best practices for new starters', '2025-12-25', true, false),
  
  -- David's actions
  ('44444444-4444-4444-4444-444444444444', 'Complete product certification course', '2026-01-20', false, false),
  ('44444444-4444-4444-4444-444444444444', 'Attend weekly sales coaching sessions', '2025-12-31', false, false),
  ('44444444-4444-4444-4444-444444444444', 'Read industry reports and market analysis', '2025-12-30', false, false)
ON CONFLICT (id) DO NOTHING;
