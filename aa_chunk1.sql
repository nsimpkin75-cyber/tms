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

/*
  # Fix Profile Insert Policy

  1. Changes
    - Add INSERT policy to allow users to create their own profile
    - This fixes the "Database error finding user" issue during signup

  2. Security
    - Users can only insert a profile for their own user ID
    - Must be authenticated to insert
*/

-- Create INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

/*
  # Add Review Management Policies

  1. Changes
    - Add INSERT policy for managers and leadership to create reviews
    - Add UPDATE policy for managers to update their reviews
    - Add policies for review_items table
    - Add policies for action_items creation by managers

  2. Security
    - Managers can create reviews for users in their department
    - Only the reviewer can update their own reviews
    - Review items can be managed alongside reviews
    - Managers can create action items for their team members
*/

-- Add INSERT policy for reviews (managers can create reviews)
CREATE POLICY "Managers can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- Add UPDATE policy for reviews
CREATE POLICY "Reviewers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Add policies for review_items
CREATE POLICY "Users can view review items for their reviews"
  ON review_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND (reviews.user_id = auth.uid() OR reviews.reviewer_id = auth.uid())
    )
  );

CREATE POLICY "Reviewers can insert review items"
  ON review_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Reviewers can update review items"
  ON review_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

-- Add policy for managers to create action items for team members
CREATE POLICY "Managers can create action items for team"
  ON action_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = action_items.owner_id
      AND profiles.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles AS owner
      JOIN profiles AS manager ON owner.department = manager.department
      WHERE owner.id = action_items.owner_id
      AND manager.id = auth.uid()
      AND manager.role IN ('manager', 'leadership')
    )
  );

/*
  # Setup Automatic Profile Creation

  1. Changes
    - Creates trigger function to automatically create profile on user signup
    - Adds trigger to auth.users table
    - Fixes existing users without profiles

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only creates profiles for authenticated users
    - Extracts metadata from auth.users
*/

-- Create trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix existing users without profiles
INSERT INTO public.profiles (id, email, full_name, role, department, tenure)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  'employee',
  'Support',
  1
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

/*
  # Fix Test User Identities

  1. Changes
    - Adds missing identity records for test users
    - Required for authentication to work properly

  2. Security
    - Only creates identities for existing authenticated users
    - Uses email provider for standard email/password login
*/

-- Create identities for users that don't have them
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  au.id,
  au.id::text,
  'email',
  jsonb_build_object(
    'sub', au.id::text,
    'email', au.email,
    'email_verified', true,
    'phone_verified', false
  ),
  NOW(),
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN auth.identities ai ON au.id = ai.user_id AND ai.provider = 'email'
WHERE ai.id IS NULL
ON CONFLICT (provider, provider_id) DO NOTHING;

/*
  # Remove Problematic Auth Trigger

  1. Changes
    - Drops the trigger on auth.users that may be causing authentication issues
    - Keeps the function for potential future use
    
  2. Notes
    - All existing test users already have profiles
    - This trigger was causing "Database error querying schema" during login
    - Can be re-enabled later if needed for new user signups
*/

-- Drop the trigger that's causing authentication issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function for potential future use
-- If needed later, can recreate trigger with:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

/*
  # Add Admin Role and Comprehensive Admin Policies

  ## Changes
  
  1. Role Updates
    - Add 'admin' to the user_role enum type
  
  2. Admin Policies for All Tables
    - Profiles: Full CRUD access for admins
    - Reviews: Full CRUD access for admins
    - Goals: Full CRUD access for admins
    - Training Courses: Full CRUD access for admins
    - Training Sessions: Full CRUD access for admins
    - Training Completions: Full CRUD access for admins
    - Training Attendees: Full CRUD access for admins
    - Career Pathways: Full CRUD access for admins
    - Skills: Full CRUD access for admins
    - Job Families: Full CRUD access for admins
    - Profile Skills: Full CRUD access for admins
    - Review Items: Full CRUD access for admins
    - Action Items: Full CRUD access for admins
  
  ## Security
  - Admins can perform all operations on all tables
  - Regular users maintain their existing restricted access
*/

-- Add admin role to user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Reviews: Admin policies
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
CREATE POLICY "Admins can view all reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert reviews" ON reviews;
CREATE POLICY "Admins can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;
CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (is_admin());

-- Goals: Admin policies
DROP POLICY IF EXISTS "Admins can view all goals" ON goals;
CREATE POLICY "Admins can view all goals"
  ON goals FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert goals" ON goals;
CREATE POLICY "Admins can insert goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update goals" ON goals;
CREATE POLICY "Admins can update goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete goals" ON goals;
CREATE POLICY "Admins can delete goals"
  ON goals FOR DELETE
  TO authenticated
  USING (is_admin());

-- Training Courses: Admin policies
DROP POLICY IF EXISTS "Admins can view all training courses" ON training_courses;
CREATE POLICY "Admins can view all training courses"
  ON training_courses FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert training courses" ON training_courses;
CREATE POLICY "Admins can insert training courses"
  ON training_courses FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update training courses" ON training_courses;
CREATE POLICY "Admins can update training courses"
  ON training_courses FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete training courses" ON training_courses;
CREATE POLICY "Admins can delete training courses"
  ON training_courses FOR DELETE
  TO authenticated
  USING (is_admin());

-- Training Sessions: Admin policies
DROP POLICY IF EXISTS "Admins can view all training sessions" ON training_sessions;
CREATE POLICY "Admins can view all training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert training sessions" ON training_sessions;
CREATE POLICY "Admins can insert training sessions"
  ON training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update training sessions" ON training_sessions;
CREATE POLICY "Admins can update training sessions"
  ON training_sessions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete training sessions" ON training_sessions;
CREATE POLICY "Admins can delete training sessions"
  ON training_sessions FOR DELETE
  TO authenticated
  USING (is_admin());

-- Career Pathways: Admin policies
DROP POLICY IF EXISTS "Admins can view all career pathways" ON career_pathways;
CREATE POLICY "Admins can view all career pathways"
  ON career_pathways FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert career pathways" ON career_pathways;
CREATE POLICY "Admins can insert career pathways"
  ON career_pathways FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update career pathways" ON career_pathways;
CREATE POLICY "Admins can update career pathways"
  ON career_pathways FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete career pathways" ON career_pathways;
CREATE POLICY "Admins can delete career pathways"
  ON career_pathways FOR DELETE
  TO authenticated
  USING (is_admin());

-- Skills: Admin policies
DROP POLICY IF EXISTS "Admins can view all skills" ON skills;
CREATE POLICY "Admins can view all skills"
  ON skills FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert skills" ON skills;
CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update skills" ON skills;
CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete skills" ON skills;
CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (is_admin());

-- Job Families: Admin policies
DROP POLICY IF EXISTS "Admins can view all job families" ON job_families;
CREATE POLICY "Admins can view all job families"
  ON job_families FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert job families" ON job_families;
CREATE POLICY "Admins can insert job families"
  ON job_families FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update job families" ON job_families;
CREATE POLICY "Admins can update job families"
  ON job_families FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete job families" ON job_families;
CREATE POLICY "Admins can delete job families"
  ON job_families FOR DELETE
  TO authenticated
  USING (is_admin());

-- Training Completions: Admin policies
DROP POLICY IF EXISTS "Admins can view all training completions" ON training_completions;
CREATE POLICY "Admins can view all training completions"
  ON training_completions FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert training completions" ON training_completions;
CREATE POLICY "Admins can insert training completions"
  ON training_completions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update training completions" ON training_completions;
CREATE POLICY "Admins can update training completions"
  ON training_completions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete training completions" ON training_completions;
CREATE POLICY "Admins can delete training completions"
  ON training_completions FOR DELETE
  TO authenticated
  USING (is_admin());

-- Training Attendees: Admin policies
DROP POLICY IF EXISTS "Admins can view all training attendees" ON training_attendees;
CREATE POLICY "Admins can view all training attendees"
  ON training_attendees FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert training attendees" ON training_attendees;
CREATE POLICY "Admins can insert training attendees"
  ON training_attendees FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update training attendees" ON training_attendees;
CREATE POLICY "Admins can update training attendees"
  ON training_attendees FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete training attendees" ON training_attendees;
CREATE POLICY "Admins can delete training attendees"
  ON training_attendees FOR DELETE
  TO authenticated
  USING (is_admin());

-- Profile Skills: Admin policies
DROP POLICY IF EXISTS "Admins can view all profile skills" ON profile_skills;
CREATE POLICY "Admins can view all profile skills"
  ON profile_skills FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert profile skills" ON profile_skills;
CREATE POLICY "Admins can insert profile skills"
  ON profile_skills FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update profile skills" ON profile_skills;
CREATE POLICY "Admins can update profile skills"
  ON profile_skills FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete profile skills" ON profile_skills;
CREATE POLICY "Admins can delete profile skills"
  ON profile_skills FOR DELETE
  TO authenticated
  USING (is_admin());

-- Review Items: Admin policies
DROP POLICY IF EXISTS "Admins can view all review items" ON review_items;
CREATE POLICY "Admins can view all review items"
  ON review_items FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert review items" ON review_items;
CREATE POLICY "Admins can insert review items"
  ON review_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update review items" ON review_items;
CREATE POLICY "Admins can update review items"
  ON review_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete review items" ON review_items;
CREATE POLICY "Admins can delete review items"
  ON review_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- Action Items: Admin policies
DROP POLICY IF EXISTS "Admins can view all action items" ON action_items;
CREATE POLICY "Admins can view all action items"
  ON action_items FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert action items" ON action_items;
CREATE POLICY "Admins can insert action items"
  ON action_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update action items" ON action_items;
CREATE POLICY "Admins can update action items"
  ON action_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete action items" ON action_items;
CREATE POLICY "Admins can delete action items"
  ON action_items FOR DELETE
  TO authenticated
  USING (is_admin());
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
/*
  # Add Career Progression to Job Families

  ## Changes
  
  1. Schema Updates
    - Add `progression_to` column to job_families table to track next role in career path
    - Add `alternative_paths` column to store other possible career transitions
  
  ## Notes
  - progression_to stores the primary next role (can be null for terminal roles)
  - alternative_paths stores array of other possible career moves (e.g., moving to different departments)
*/

-- Add progression_to column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_to'
  ) THEN
    ALTER TABLE job_families ADD COLUMN progression_to text;
  END IF;
END $$;

-- Add alternative_paths column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'alternative_paths'
  ) THEN
    ALTER TABLE job_families ADD COLUMN alternative_paths text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;
/*
  # Add Multiple Progression Options and Learning Resources

  ## Changes
  
  1. Schema Updates
    - Replace `progression_to` with `progression_options` array to support multiple next roles
    - Add `learning_resources` text field to store development and training information
    - Migrate existing progression_to data to progression_options array
  
  ## Notes
  - progression_options stores multiple possible next roles (array of strings)
  - learning_resources stores training courses, certifications, and skills to develop
  - Existing single progression_to values are migrated to the new array format
*/

-- Add progression_options column as an array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_options'
  ) THEN
    ALTER TABLE job_families ADD COLUMN progression_options text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Add learning_resources column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'learning_resources'
  ) THEN
    ALTER TABLE job_families ADD COLUMN learning_resources text;
  END IF;
END $$;

-- Migrate existing progression_to data to progression_options
DO $$
BEGIN
  UPDATE job_families 
  SET progression_options = ARRAY[progression_to]::text[]
  WHERE progression_to IS NOT NULL 
    AND progression_to != ''
    AND (progression_options IS NULL OR array_length(progression_options, 1) IS NULL);
END $$;

-- Drop the old progression_to column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_to'
  ) THEN
    ALTER TABLE job_families DROP COLUMN progression_to;
  END IF;
END $$;
/*
  # Add Job Family Details Fields

  1. Changes
    - Add `responsibilities` column (text array) - List of key responsibilities for the role
    - Add `experience_required` column (text) - Description of required experience (e.g., "2-3 years in implementation")
    - Add `typical_time_in_role` column (text) - Expected duration in role before progression (e.g., "18-24 months")
  
  2. Notes
    - All fields are nullable to maintain backward compatibility
    - responsibilities stored as array for structured data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'responsibilities'
  ) THEN
    ALTER TABLE job_families ADD COLUMN responsibilities text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'experience_required'
  ) THEN
    ALTER TABLE job_families ADD COLUMN experience_required text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'typical_time_in_role'
  ) THEN
    ALTER TABLE job_families ADD COLUMN typical_time_in_role text;
  END IF;
END $$;
/*
  # Add Sort Order to Job Families

  1. Changes
    - Add `sort_order` column (integer) - Defines the display order within a department
    - Defaults to 0 for backward compatibility
  
  2. Notes
    - Lower numbers appear first (e.g., Entry level = 1, Mid = 2, etc.)
    - This allows explicit control over progression visualization
    - Jobs within same department will be ordered by sort_order, then by level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE job_families ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Set initial sort_order based on level hierarchy for existing records
UPDATE job_families
SET sort_order = CASE level
  WHEN 'Entry' THEN 1
  WHEN 'Mid' THEN 2
  WHEN 'Senior' THEN 3
  WHEN 'Lead' THEN 4
  WHEN 'Principal' THEN 5
  ELSE 0
END
WHERE sort_order = 0;
/*
  # Create Training Module to Job Family Linking System

  1. New Tables
    - `training_module_links`
      - `id` (uuid, primary key)
      - `training_course_id` (uuid, foreign key to training_courses)
      - `job_family_id` (uuid, foreign key to job_families)
      - `is_mandatory` (boolean) - Whether this module is required for the role
      - `created_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Add `module_url` column to training_courses for external links
  
  3. Security
    - Enable RLS on training_module_links table
    - Add policies for authenticated users to read links
    - Add policies for admin users to manage links
  
  4. Notes
    - This allows training modules to be linked to multiple job families
    - Each link can specify if the module is mandatory for progression
    - Modules can have external URLs (e.g., LinkedIn Learning, Udemy)
*/

-- Create the linking table
CREATE TABLE IF NOT EXISTS training_module_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  is_mandatory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_course_id, job_family_id)
);

-- Add module_url column to training_courses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'module_url'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN module_url text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE training_module_links ENABLE ROW LEVEL SECURITY;

-- Policies for reading links (all authenticated users)
CREATE POLICY "Authenticated users can view training module links"
  ON training_module_links
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for managing links (admin only)
CREATE POLICY "Admin users can insert training module links"
  ON training_module_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update training module links"
  ON training_module_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete training module links"
  ON training_module_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
/*
  # Update Job Family Levels with Data Migration (Correct Order)

  1. Changes
    - Remove old level constraint FIRST
    - Update existing data to new level format
    - Add new level constraint with expanded options
    - New levels include:
      - IC1, IC2, IC3 (Individual Contributor)
      - Technical IC1-IC5 (Technical Individual Contributor)
      - Manager M1-M5 (Management levels)
      - Leader (Leadership)
      - Executive (Executive level)
  
  2. Data Migration
    - Entry -> IC1
    - Mid -> IC2
    - Senior -> IC3
    - Lead -> Manager M1
    - Principal -> Manager M2
  
  3. Notes
    - Constraint is dropped first to allow data updates
    - Existing data will be migrated to the new format
    - The new constraint ensures only valid levels can be used
*/

-- FIRST: Drop the old constraint
ALTER TABLE job_families 
DROP CONSTRAINT IF EXISTS job_families_level_check;

-- SECOND: Update existing data to match new level format
UPDATE job_families SET level = 'IC1' WHERE level = 'Entry';
UPDATE job_families SET level = 'IC2' WHERE level = 'Mid';
UPDATE job_families SET level = 'IC3' WHERE level = 'Senior';
UPDATE job_families SET level = 'Manager M1' WHERE level = 'Lead';
UPDATE job_families SET level = 'Manager M2' WHERE level = 'Principal';

-- THIRD: Add the new constraint with all level options
ALTER TABLE job_families 
ADD CONSTRAINT job_families_level_check 
CHECK (level = ANY (ARRAY[
  'IC1'::text, 
  'IC2'::text, 
  'IC3'::text,
  'Technical IC1'::text,
  'Technical IC2'::text,
  'Technical IC3'::text,
  'Technical IC4'::text,
  'Technical IC5'::text,
  'Manager M1'::text,
  'Manager M2'::text,
  'Manager M3'::text,
  'Manager M4'::text,
  'Manager M5'::text,
  'Leader'::text,
  'Executive'::text
]));
/*
  # Add Manager Relationship and Strategic Roadmap System
  
  1. Profile Updates
    - Add `manager_id` field to create reporting hierarchy
    - Add `job_family_id` field to link to job families
    - Add `has_strategic_roadmap_access` boolean for exec/SLT roles
    
  2. New Tables
    - `strategic_roadmaps`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `owner_id` (uuid) - exec/SLT who created it
      - `status` (text) - draft, active, completed
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamptz)
    
    - `strategic_goals`
      - `id` (uuid, primary key)
      - `roadmap_id` (uuid) - links to strategic_roadmap
      - `title` (text)
      - `description` (text)
      - `assigned_to_id` (uuid) - can be cascaded to managers
      - `assigned_by_id` (uuid) - who assigned it
      - `parent_goal_id` (uuid) - for cascading goals
      - `status` (text) - not_started, in_progress, completed
      - `due_date` (date)
      - `created_at` (timestamptz)
    
    - `weekly_catchups`
      - `id` (uuid, primary key)
      - `manager_id` (uuid) - the manager conducting the catchup
      - `employee_id` (uuid) - the employee
      - `scheduled_date` (date)
      - `status` (text) - scheduled, completed, cancelled
      - `notes` (text)
      - `is_enabled` (boolean) - can be turned off by manager
      - `frequency` (text) - weekly, biweekly, monthly
      - `created_at` (timestamptz)
    
    - `catchup_summaries`
      - `id` (uuid, primary key)
      - `manager_id` (uuid)
      - `employee_id` (uuid)
      - `month` (text) - YYYY-MM format
      - `summary` (text) - collated notes from the month
      - `total_catchups` (integer)
      - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for role-based access to strategic roadmaps
    - Add policies for managers to manage their team's catch-ups
    - Add policies for employees to view their own data
  
  4. Important Notes
    - Strategic roadmap access is restricted to leadership and admin roles
    - Managers can only create/edit catch-ups for their direct reports
    - Goals can be cascaded from exec → manager → employee
    - Weekly catch-ups auto-collate into monthly summaries
*/

-- Add new fields to profiles table
DO $$
BEGIN
  -- Add manager_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- Add job_family_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_family_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_family_id uuid REFERENCES job_families(id) ON DELETE SET NULL;
  END IF;
  
  -- Add has_strategic_roadmap_access field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_strategic_roadmap_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_strategic_roadmap_access boolean DEFAULT false;
  END IF;
END $$;

-- Create strategic_roadmaps table
CREATE TABLE IF NOT EXISTS strategic_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategic_roadmaps ENABLE ROW LEVEL SECURITY;

-- Create strategic_goals table
CREATE TABLE IF NOT EXISTS strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid REFERENCES strategic_roadmaps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_goal_id uuid REFERENCES strategic_goals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
  due_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategic_goals ENABLE ROW LEVEL SECURITY;

-- Create weekly_catchups table
CREATE TABLE IF NOT EXISTS weekly_catchups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes text,
  is_enabled boolean DEFAULT true,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  key_discussion_points text[],
  action_items text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_catchups ENABLE ROW LEVEL SECURITY;

-- Create catchup_summaries table
CREATE TABLE IF NOT EXISTS catchup_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM format
  summary text,
  total_catchups integer DEFAULT 0,
  key_themes text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, employee_id, month)
);

ALTER TABLE catchup_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategic_roadmaps

-- Leadership and admins can view all roadmaps
CREATE POLICY "Leadership can view all strategic roadmaps"
  ON strategic_roadmaps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    )
  );

-- Owners and admins can insert roadmaps
CREATE POLICY "Authorized users can create strategic roadmaps"
  ON strategic_roadmaps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    )
    AND owner_id = auth.uid()
  );

-- Owners and admins can update their roadmaps
CREATE POLICY "Owners can update their strategic roadmaps"
  ON strategic_roadmaps FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete roadmaps
CREATE POLICY "Admins can delete strategic roadmaps"
  ON strategic_roadmaps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for strategic_goals

-- Users can view goals assigned to them or their team
CREATE POLICY "Users can view relevant strategic goals"
  ON strategic_goals FOR SELECT
  TO authenticated
  USING (
    assigned_to_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.manager_id = auth.uid()
      AND p.id = assigned_to_id
    )
  );

-- Authorized users can create goals
CREATE POLICY "Authorized users can create strategic goals"
  ON strategic_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role IN ('leadership', 'admin', 'manager') OR profiles.has_strategic_roadmap_access = true)
      )
    )
  );

-- Goal assigners can update their goals
CREATE POLICY "Goal owners can update strategic goals"
  ON strategic_goals FOR UPDATE
  TO authenticated
  USING (
    assigned_by_id = auth.uid() OR
    assigned_to_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins and assigners can delete goals
CREATE POLICY "Authorized users can delete strategic goals"
  ON strategic_goals FOR DELETE
  TO authenticated
  USING (
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for weekly_catchups

-- Managers and employees can view their catchups
CREATE POLICY "Users can view their weekly catchups"
  ON weekly_catchups FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Managers can create catchups for their reports
CREATE POLICY "Managers can create weekly catchups"
  ON weekly_catchups FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Managers and admins can update catchups
CREATE POLICY "Managers can update their weekly catchups"
  ON weekly_catchups FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Managers and admins can delete catchups
CREATE POLICY "Managers can delete their weekly catchups"
  ON weekly_catchups FOR DELETE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for catchup_summaries

-- Managers, employees, and admins can view summaries
CREATE POLICY "Users can view catchup summaries"
  ON catchup_summaries FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('leadership', 'admin')
    )
  );

-- Managers can create summaries
CREATE POLICY "Managers can create catchup summaries"
  ON catchup_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
  );

-- Managers can update their summaries
CREATE POLICY "Managers can update catchup summaries"
  ON catchup_summaries FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_roadmap ON strategic_goals(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager ON weekly_catchups(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_month ON catchup_summaries(month);

-- Update existing leadership/admin profiles to have strategic roadmap access
UPDATE profiles
SET has_strategic_roadmap_access = true
WHERE role IN ('leadership', 'admin');
/*
  # Career Pathways Features

  1. New Tables
    - `user_cvs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (jsonb) - stores CV data in structured format
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `career_quiz_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `quiz_data` (jsonb) - stores questions and answers
      - `ai_analysis` (text) - AI analysis of responses
      - `recommendations` (jsonb) - structured recommendations
      - `created_at` (timestamptz)
    
    - `career_development_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `current_role_title` (text)
      - `target_role_title` (text)
      - `tenure_months` (integer) - months in current role
      - `current_skills` (jsonb) - array of skill IDs
      - `required_skills` (jsonb) - skills needed for progression
      - `internal_criteria_met` (jsonb) - criteria checklist
      - `status` (text) - pending, approved, rejected, active
      - `manager_id` (uuid, foreign key to profiles)
      - `manager_comments` (text)
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `one_to_one_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `cdp_id` (uuid, foreign key to career_development_plans) - nullable
      - `title` (tex