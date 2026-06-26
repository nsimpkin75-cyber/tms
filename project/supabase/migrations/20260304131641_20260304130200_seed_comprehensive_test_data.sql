/*
  # Seed Comprehensive Test Data

  ## Overview
  Seeds the database with comprehensive test data including:
  - Test users (admin, manager, employees)
  - Skills and competencies
  - Job families with progressions
  - Training courses and modules
  - Review templates
  - Sample reviews and meetings

  ## Test Accounts
  - admin@test.com (Admin) - password: password123
  - manager@test.com (Manager) - password: password123
  - employee@test.com (Employee) - password: password123
*/

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test auth users if they don't exist
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

-- Create identities for test users
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
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'email',
    jsonb_build_object('sub', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::text, 'email', 'employee@test.com'),
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'email',
    jsonb_build_object('sub', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::text, 'email', 'manager@test.com'),
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'email',
    jsonb_build_object('sub', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::text, 'email', 'admin@test.com'),
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Update or insert profiles for test users
INSERT INTO profiles (id, email, full_name, role, department, tenure, job_title, manager_id)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'employee@test.com',
    'Test Employee',
    'employee',
    'Support',
    1,
    'Support Specialist',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'manager@test.com',
    'Test Manager',
    'manager',
    'Support',
    3,
    'Support Team Lead',
    NULL
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
    'admin@test.com',
    'Test Admin',
    'admin',
    'Operations',
    5,
    'System Administrator',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  tenure = EXCLUDED.tenure,
  job_title = EXCLUDED.job_title,
  manager_id = EXCLUDED.manager_id;

-- Seed Skills
INSERT INTO skills (name, category) VALUES
  ('Customer Service', 'Technical'),
  ('Communication', 'Soft Skills'),
  ('Problem Solving', 'Soft Skills'),
  ('Leadership', 'Soft Skills'),
  ('Time Management', 'Soft Skills'),
  ('JavaScript', 'Technical'),
  ('React', 'Technical'),
  ('TypeScript', 'Technical'),
  ('SQL', 'Technical'),
  ('Project Management', 'Soft Skills'),
  ('Team Collaboration', 'Soft Skills'),
  ('Data Analysis', 'Technical'),
  ('Conflict Resolution', 'Soft Skills'),
  ('Mentoring', 'Soft Skills'),
  ('Strategic Planning', 'Soft Skills')
ON CONFLICT (name) DO NOTHING;

-- Seed Job Families with progression paths
INSERT INTO job_families (id, title, department, level, description, required_skills, progression_to, sort_order)
VALUES
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Junior Support Specialist',
    'Support',
    'Entry',
    'Entry-level customer support role',
    ARRAY['Customer Service', 'Communication'],
    'Support Specialist',
    1
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Support Specialist',
    'Support',
    'Mid',
    'Mid-level customer support role',
    ARRAY['Customer Service', 'Communication', 'Problem Solving'],
    'Senior Support Specialist',
    2
  ),
  (
    '10000000-0000-0000-0000-000000000003'::uuid,
    'Senior Support Specialist',
    'Support',
    'Senior',
    'Senior customer support role with mentoring responsibilities',
    ARRAY['Customer Service', 'Communication', 'Problem Solving', 'Mentoring'],
    'Support Team Lead',
    3
  ),
  (
    '10000000-0000-0000-0000-000000000004'::uuid,
    'Support Team Lead',
    'Support',
    'Lead',
    'Team leadership role managing support specialists',
    ARRAY['Leadership', 'Project Management', 'Communication', 'Mentoring'],
    NULL,
    4
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Competency Framework
INSERT INTO competency_frameworks (id, name, description, emoji, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Core Competencies',
    'Organization-wide competency framework',
    '🎯',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Competency Categories
INSERT INTO competency_categories (id, framework_id, name, description, emoji, sort_order)
VALUES
  (
    '21000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Communication',
    'Verbal and written communication skills',
    '💬',
    1
  ),
  (
    '21000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Leadership',
    'Leading and inspiring others',
    '👥',
    2
  ),
  (
    '21000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Technical Skills',
    'Job-specific technical capabilities',
    '⚙️',
    3
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Competency Levels
INSERT INTO competency_levels (category_id, level_number, title, description, behaviors)
VALUES
  (
    '21000000-0000-0000-0000-000000000001'::uuid,
    1,
    'Developing',
    'Basic communication skills',
    ARRAY['Listens actively', 'Asks clarifying questions', 'Responds appropriately']
  ),
  (
    '21000000-0000-0000-0000-000000000001'::uuid,
    2,
    'Competent',
    'Strong communication across channels',
    ARRAY['Communicates clearly in writing', 'Presents information effectively', 'Adapts style to audience']
  ),
  (
    '21000000-0000-0000-0000-000000000001'::uuid,
    3,
    'Proficient',
    'Excellent communication and influence',
    ARRAY['Influences stakeholders', 'Handles difficult conversations', 'Mentors others in communication']
  )
ON CONFLICT DO NOTHING;

-- Seed Training Courses
INSERT INTO training_courses (id, title, description, type, duration_hours, is_mandatory)
VALUES
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    'Customer Service Excellence',
    'Master the art of exceptional customer service',
    'Upskill',
    4,
    false
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    'Leadership Fundamentals',
    'Essential leadership skills for emerging leaders',
    'Pathway',
    8,
    false
  ),
  (
    '30000000-0000-0000-0000-000000000003'::uuid,
    'Effective Communication',
    'Improve your communication skills',
    'Soft Skill',
    3,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Training Modules
INSERT INTO training_modules (course_id, title, description, sort_order, duration_minutes)
VALUES
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    'Understanding Customer Needs',
    'Learn to identify and address customer needs',
    1,
    60
  ),
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    'Handling Difficult Situations',
    'Techniques for managing challenging customer interactions',
    2,
    90
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    'Leadership Styles',
    'Explore different leadership approaches',
    1,
    120
  )
ON CONFLICT DO NOTHING;

-- Seed Review Templates
INSERT INTO review_form_templates (id, name, description, type, is_active)
VALUES
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Monthly Performance Review',
    'Standard monthly review template',
    'monthly',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002'::uuid,
    'Weekly Check-in',
    'Quick weekly progress check',
    'weekly',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003'::uuid,
    'Annual Performance Review',
    'Comprehensive annual assessment',
    'annual',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Review Template Sections
INSERT INTO review_template_sections (template_id, title, description, sort_order)
VALUES
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Performance',
    'Overall performance assessment',
    1
  ),
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Goals',
    'Progress towards goals',
    2
  ),
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Development',
    'Learning and development activities',
    3
  )
ON CONFLICT DO NOTHING;

-- Seed Strategic Goals
INSERT INTO strategic_goals (id, title, description, category, start_date, target_date, status)
VALUES
  (
    '50000000-0000-0000-0000-000000000001'::uuid,
    'Improve Customer Satisfaction',
    'Increase CSAT score to 95%',
    'operational',
    '2026-01-01',
    '2026-12-31',
    'active'
  ),
  (
    '50000000-0000-0000-0000-000000000002'::uuid,
    'Expand Team Capabilities',
    'Upskill team in new technologies',
    'people',
    '2026-01-01',
    '2026-06-30',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- Create some sample one-to-one meetings
INSERT INTO one_to_one_meetings (employee_id, manager_id, scheduled_date, status, meeting_type)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    NOW() + INTERVAL '1 day',
    'scheduled',
    'weekly'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    NOW() - INTERVAL '7 days',
    'completed',
    'weekly'
  )
ON CONFLICT DO NOTHING;

-- Seed copilot config
INSERT INTO copilot_config (name, description, is_active, ai_intervention_threshold, auto_suggest_actions)
VALUES
  ('Default Configuration', 'Standard AI copilot settings', true, 3, true)
ON CONFLICT DO NOTHING;
