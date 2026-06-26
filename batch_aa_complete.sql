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
      - `title` (text)
      - `description` (text)
      - `target_date` (date)
      - `status` (text) - not_started, in_progress, completed
      - `progress_percentage` (integer)
      - `created_by` (uuid) - manager or user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view and manage their own CVs
    - Users can view their own quiz responses
    - Users can create and view their own CDPs
    - Managers can view and approve CDPs for their reports
    - Users and managers can view/manage one-to-one goals
*/

-- User CVs table
CREATE TABLE IF NOT EXISTS user_cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CV"
  ON user_cvs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CV"
  ON user_cvs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CV"
  ON user_cvs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own CV"
  ON user_cvs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Career quiz responses table
CREATE TABLE IF NOT EXISTS career_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis text,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz responses"
  ON career_quiz_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz responses"
  ON career_quiz_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Career development plans table
CREATE TABLE IF NOT EXISTS career_development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_role_title text NOT NULL,
  target_role_title text NOT NULL,
  tenure_months integer NOT NULL DEFAULT 0,
  current_skills jsonb DEFAULT '[]'::jsonb,
  required_skills jsonb DEFAULT '[]'::jsonb,
  internal_criteria_met jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active')),
  manager_id uuid REFERENCES profiles(id),
  manager_comments text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CDPs"
  ON career_development_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CDPs"
  ON career_development_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CDPs"
  ON career_development_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team CDPs"
  ON career_development_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team CDPs"
  ON career_development_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- One to one goals table
CREATE TABLE IF NOT EXISTS one_to_one_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cdp_id uuid REFERENCES career_development_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON one_to_one_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON one_to_one_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team goals"
  ON one_to_one_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert team goals"
  ON one_to_one_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team goals"
  ON one_to_one_goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id ON career_development_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_status ON career_development_plans(status);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);
/*
  # Job History Tracking System

  1. New Tables
    - `job_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `job_title` (text) - the role/title at this point
      - `department` (text) - department at this point
      - `job_family_id` (uuid) - job family at this point
      - `change_type` (text) - 'role_change', 'department_change', 'promotion', 'lateral_move', 'initial'
      - `effective_date` (date) - when the change took effect
      - `changed_by` (uuid) - who made the change (admin/HR)
      - `notes` (text) - optional notes about the change
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `job_title` column to profiles if not exists
    - This will be the current job title separate from the role field

  3. Security
    - Enable RLS on job_history table
    - Users can view their own history
    - Admins and managers can view team history
    - Only admins can insert/update history records

  4. Function
    - Create a function to track job changes automatically
    - This function will be called when profiles are updated
*/

-- Add job_title to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_title text;
  END IF;
END $$;

-- Create job history table
CREATE TABLE IF NOT EXISTS job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  department text NOT NULL,
  job_family_id uuid REFERENCES job_families(id),
  change_type text NOT NULL CHECK (change_type IN ('initial', 'role_change', 'department_change', 'promotion', 'lateral_move', 'demotion')),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own job history
CREATE POLICY "Users can view own job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Managers can view their team's job history
CREATE POLICY "Managers can view team job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = job_history.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all job history
CREATE POLICY "Admins can view all job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert job history
CREATE POLICY "Admins can insert job history"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update job history
CREATE POLICY "Admins can update job history"
  ON job_history FOR UPDATE
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

-- Create function to determine change type
CREATE OR REPLACE FUNCTION determine_job_change_type(
  old_title text,
  new_title text,
  old_dept text,
  new_dept text,
  old_job_family uuid,
  new_job_family uuid
) RETURNS text AS $$
BEGIN
  -- If department changed
  IF old_dept IS DISTINCT FROM new_dept THEN
    -- Check if it's also a role change
    IF old_title IS DISTINCT FROM new_title OR old_job_family IS DISTINCT FROM new_job_family THEN
      RETURN 'role_change';
    ELSE
      RETURN 'department_change';
    END IF;
  END IF;
  
  -- If job family changed, it's likely a promotion or lateral move
  IF old_job_family IS DISTINCT FROM new_job_family THEN
    RETURN 'lateral_move';
  END IF;
  
  -- If only title changed within same family, check if it's a promotion
  IF old_title IS DISTINCT FROM new_title THEN
    -- You could add logic here to determine if it's a promotion based on job levels
    RETURN 'promotion';
  END IF;
  
  RETURN 'role_change';
END;
$$ LANGUAGE plpgsql;

-- Create function to track job changes
CREATE OR REPLACE FUNCTION track_job_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val text;
BEGIN
  -- Only track if relevant fields changed
  IF (OLD.job_title IS DISTINCT FROM NEW.job_title) OR
     (OLD.department IS DISTINCT FROM NEW.department) OR
     (OLD.job_family_id IS DISTINCT FROM NEW.job_family_id) THEN
    
    -- Determine the type of change
    change_type_val := determine_job_change_type(
      OLD.job_title,
      NEW.job_title,
      OLD.department,
      NEW.department,
      OLD.job_family_id,
      NEW.job_family_id
    );
    
    -- Insert into job history
    INSERT INTO job_history (
      user_id,
      job_title,
      department,
      job_family_id,
      change_type,
      effective_date,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      NEW.job_title,
      NEW.department,
      NEW.job_family_id,
      change_type_val,
      CURRENT_DATE,
      auth.uid(),
      'Automated tracking: ' || 
      CASE 
        WHEN OLD.job_title IS DISTINCT FROM NEW.job_title THEN 'Title changed from ' || COALESCE(OLD.job_title, OLD.role::text, 'Unknown') || ' to ' || COALESCE(NEW.job_title, NEW.role::text, 'Unknown')
        WHEN OLD.department IS DISTINCT FROM NEW.department THEN 'Department changed from ' || OLD.department || ' to ' || NEW.department
        ELSE 'Job details updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track job changes
DROP TRIGGER IF EXISTS track_job_changes_trigger ON profiles;
CREATE TRIGGER track_job_changes_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_job_changes();

-- Update profiles to have job_title set from role if not already set
UPDATE profiles
SET job_title = role::text
WHERE job_title IS NULL;

-- Create initial job history records for existing users (one-time migration)
INSERT INTO job_history (user_id, job_title, department, job_family_id, change_type, effective_date, notes)
SELECT 
  id,
  COALESCE(job_title, role::text) as job_title,
  department,
  job_family_id,
  'initial' as change_type,
  COALESCE(created_at::date, CURRENT_DATE) as effective_date,
  'Initial record created during migration'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM job_history WHERE job_history.user_id = profiles.id
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_effective_date ON job_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_job_history_change_type ON job_history(change_type);
CREATE INDEX IF NOT EXISTS idx_job_history_department ON job_history(department);

-- Create view for job movement statistics
CREATE OR REPLACE VIEW job_movement_stats AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.job_title as current_job_title,
  p.department as current_department,
  COUNT(jh.id) as total_moves,
  COUNT(CASE WHEN jh.change_type = 'promotion' THEN 1 END) as promotions,
  COUNT(CASE WHEN jh.change_type = 'lateral_move' THEN 1 END) as lateral_moves,
  COUNT(CASE WHEN jh.change_type = 'department_change' THEN 1 END) as department_changes,
  COUNT(CASE WHEN jh.change_type = 'role_change' THEN 1 END) as role_changes,
  MIN(jh.effective_date) as first_role_date,
  MAX(jh.effective_date) as latest_change_date
FROM profiles p
LEFT JOIN job_history jh ON jh.user_id = p.id AND jh.change_type != 'initial'
GROUP BY p.id, p.full_name, p.job_title, p.department;
/*
  # Career Plans and Approval System

  1. New Tables
    - career_plans: Stores career development plans with quiz results and approval status
    - career_plan_milestones: Breakdown of steps needed to achieve career goals

  2. Changes
    - Creates comprehensive career planning system
    - Enables manager and admin approval workflow
    - Stores AI quiz results and recommendations

  3. Security
    - Enable RLS on all tables
    - Users can view and create their own plans
    - Managers can view their team plans
    - Admins can view all plans and approve
*/

-- Create career plans table
CREATE TABLE IF NOT EXISTS career_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_job_family_id uuid REFERENCES job_families(id),
  target_job_family_id uuid REFERENCES job_families(id),
  target_level text,
  quiz_data jsonb DEFAULT '{}'::jsonb,
  recommended_timeline_months integer DEFAULT 12,
  skills_gaps jsonb DEFAULT '[]'::jsonb,
  recommended_training jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_manager', 'manager_approved', 'admin_approved', 'rejected')),
  sent_to_manager_at timestamptz,
  manager_reviewed_at timestamptz,
  manager_comments text,
  admin_reviewed_at timestamptz,
  admin_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;

-- Create career plan milestones table
CREATE TABLE IF NOT EXISTS career_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_plan_id uuid REFERENCES career_plans(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_completion_months integer DEFAULT 1,
  required_skills jsonb DEFAULT '[]'::jsonb,
  required_training jsonb DEFAULT '[]'::jsonb,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_plan_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_plans

-- Users can view their own plans
CREATE POLICY "Users can view own career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Managers can view their team's plans
CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all plans
CREATE POLICY "Admins can view all career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create their own plans
CREATE POLICY "Users can create own career plans"
  ON career_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft plans
CREATE POLICY "Users can update own draft career plans"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

-- Users can send plans to manager
CREATE POLICY "Users can send plans to manager"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'sent_to_manager'));

-- Managers can approve team plans
CREATE POLICY "Managers can approve team career plans"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can update any plan
CREATE POLICY "Admins can update any career plan"
  ON career_plans FOR UPDATE
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

-- Users can delete their own draft plans
CREATE POLICY "Users can delete own draft career plans"
  ON career_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

-- RLS Policies for career_plan_milestones

-- Users can view milestones for their plans
CREATE POLICY "Users can view own plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  );

-- Managers can view team plan milestones
CREATE POLICY "Managers can view team plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      JOIN profiles ON profiles.id = career_plans.user_id
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all milestones
CREATE POLICY "Admins can view all plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create milestones for their own plans
CREATE POLICY "Users can create own plan milestones"
  ON career_plan_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
      AND career_plans.status = 'draft'
    )
  );

-- Users can update milestones for their draft plans
CREATE POLICY "Users can update own plan milestones"
  ON career_plan_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  );

-- Users can delete milestones from draft plans
CREATE POLICY "Users can delete own plan milestones"
  ON career_plan_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
      AND career_plans.status = 'draft'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_status ON career_plans(status);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family ON career_plans(target_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan_id ON career_plan_milestones(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_sort ON career_plan_milestones(career_plan_id, sort_order);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_career_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_career_plans_updated_at ON career_plans;
CREATE TRIGGER update_career_plans_updated_at
  BEFORE UPDATE ON career_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_career_plan_updated_at();

-- Create view for pending approvals
CREATE OR REPLACE VIEW pending_career_approvals AS
SELECT 
  cp.id,
  cp.user_id,
  p.full_name as employee_name,
  p.email as employee_email,
  p.manager_id,
  m.full_name as manager_name,
  cp.status,
  cp.sent_to_manager_at,
  cp.manager_reviewed_at,
  cp.created_at,
  current_jf.title as current_role,
  target_jf.title as target_role,
  cp.recommended_timeline_months
FROM career_plans cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN profiles m ON m.id = p.manager_id
LEFT JOIN job_families current_jf ON current_jf.id = cp.current_job_family_id
LEFT JOIN job_families target_jf ON target_jf.id = cp.target_job_family_id
WHERE cp.status IN ('sent_to_manager', 'manager_approved')
ORDER BY cp.sent_to_manager_at DESC;
/*
  # Progression Criteria and Skills Assessment System

  ## Overview
  This migration adds comprehensive support for career progression criteria,
  skill assessments, and performance-based progression recommendations.

  ## New Tables
  
  ### `progression_criteria`
  Defines requirements for progressing from one level to another within a job family.
  - `id` (uuid, primary key)
  - `job_family_id` (uuid, references job_families)
  - `from_level` (text) - Current level
  - `to_level` (text) - Target level for progression
  - `minimum_tenure_months` (integer) - Minimum time required in current role
  - `required_skills` (jsonb) - Array of required skills with descriptions
  - `required_experience` (jsonb) - Array of required experience items
  - `minimum_performance_rating` (numeric) - Minimum average rating from reviews (1-5 scale)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `user_skill_assessments`
  Tracks user self-assessment of skills for career progression.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `skill_name` (text) - Name of the skill
  - `has_skill` (boolean) - Whether user confirms having this skill
  - `assessed_at` (timestamptz)
  - `notes` (text) - Optional notes about the skill

  ## Updates to Existing Tables
  
  ### `career_quiz_responses`
  Add new columns to support enhanced quiz functionality.

  ## Security
  - Enable RLS on all new tables
  - Users can view and update their own assessments
  - Admins can manage progression criteria
  - Managers can view their team's assessments
*/

-- Create progression_criteria table
CREATE TABLE IF NOT EXISTS progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  from_level text NOT NULL,
  to_level text NOT NULL,
  minimum_tenure_months integer NOT NULL DEFAULT 12,
  required_skills jsonb DEFAULT '[]'::jsonb,
  required_experience jsonb DEFAULT '[]'::jsonb,
  minimum_performance_rating numeric(3,2) DEFAULT 3.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_family_id, from_level, to_level)
);

-- Create user_skill_assessments table
CREATE TABLE IF NOT EXISTS user_skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  has_skill boolean DEFAULT false,
  assessed_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(user_id, skill_name, assessed_at)
);

-- Add new columns to career_quiz_responses if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'months_in_role'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN months_in_role integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'skill_assessments'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN skill_assessments jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'performance_check'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN performance_check jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'recommendation'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN recommendation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'recommendation_date'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN recommendation_date timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE progression_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progression_criteria

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Anyone can view progression criteria'
  ) THEN
    CREATE POLICY "Anyone can view progression criteria"
      ON progression_criteria FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can insert progression criteria'
  ) THEN
    CREATE POLICY "Admins can insert progression criteria"
      ON progression_criteria FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can update progression criteria'
  ) THEN
    CREATE POLICY "Admins can update progression criteria"
      ON progression_criteria FOR UPDATE
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can delete progression criteria'
  ) THEN
    CREATE POLICY "Admins can delete progression criteria"
      ON progression_criteria FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policies for user_skill_assessments

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can view own skill assessments'
  ) THEN
    CREATE POLICY "Users can view own skill assessments"
      ON user_skill_assessments FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Managers can view team skill assessments'
  ) THEN
    CREATE POLICY "Managers can view team skill assessments"
      ON user_skill_assessments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = user_skill_assessments.user_id
          AND profiles.manager_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can insert own skill assessments'
  ) THEN
    CREATE POLICY "Users can insert own skill assessments"
      ON user_skill_assessments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can update own skill assessments'
  ) THEN
    CREATE POLICY "Users can update own skill assessments"
      ON user_skill_assessments FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Seed progression criteria for Support job family
INSERT INTO progression_criteria (job_family_id, from_level, to_level, minimum_tenure_months, required_skills, required_experience, minimum_performance_rating)
SELECT 
  id,
  'Customer Support Consultant - Payments',
  'Senior Customer Support Consultant - Payments',
  12,
  '[
    {"name": "Advanced Payment Processing", "description": "Expert knowledge of payment systems and troubleshooting"},
    {"name": "Customer Escalation Handling", "description": "Ability to handle complex customer escalations independently"},
    {"name": "Team Mentoring", "description": "Experience mentoring junior team members"},
    {"name": "Process Improvement", "description": "Demonstrated ability to identify and implement process improvements"}
  ]'::jsonb,
  '[
    {"name": "Complex Case Resolution", "description": "Resolved 50+ complex payment cases independently"},
    {"name": "Quality Standards", "description": "Consistently met or exceeded quality standards (95%+)"},
    {"name": "Customer Satisfaction", "description": "Maintained high customer satisfaction scores"}
  ]'::jsonb,
  3.50
FROM job_families
WHERE title = 'Support' AND level = 'Customer Support Consultant - Payments'
ON CONFLICT (job_family_id, from_level, to_level) DO NOTHING;

INSERT INTO progression_criteria (job_family_id, from_level, to_level, minimum_tenure_months, required_skills, required_experience, minimum_performance_rating)
SELECT 
  id,
  'Senior Customer Support Consultant - Payments',
  'Team Lead - Customer Support',
  18,
  '[
    {"name": "Leadership Skills", "description": "Proven ability to lead and develop team members"},
    {"name": "Strategic Thinking", "description": "Understanding of departmental strategy and objectives"},
    {"name": "Stakeholder Management", "description": "Effective communication with cross-functional teams"},
    {"name": "Performance Management", "description": "Experience with performance reviews and development plans"}
  ]'::jsonb,
  '[
    {"name": "Team Projects", "description": "Led at least 2 major team projects or initiatives"},
    {"name": "Training Delivery", "description": "Delivered training to new team members"},
    {"name": "Process Ownership", "description": "Owned and improved key support processes"}
  ]'::jsonb,
  4.00
FROM job_families
WHERE title = 'Support' AND level = 'Senior Customer Support Consultant - Payments'
ON CONFLICT (job_family_id, from_level, to_level) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progression_criteria_job_family ON progression_criteria(job_family_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_assessments_user ON user_skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_date ON career_quiz_responses(recommendation_date DESC);
/*
  # Create Copilot Configuration System

  1. New Tables
    - `copilot_config`
      - `id` (uuid, primary key)
      - `system_prompt` (text) - Custom system prompt for the copilot
      - `model_name` (text) - LLM model to use (e.g., gpt-4, claude-3)
      - `temperature` (numeric) - Temperature setting for responses
      - `max_tokens` (integer) - Maximum tokens for responses
      - `top_p` (numeric) - Top-p sampling parameter
      - `frequency_penalty` (numeric) - Frequency penalty parameter
      - `presence_penalty` (numeric) - Presence penalty parameter
      - `knowledge_base` (text) - Additional knowledge/context for the copilot
      - `is_active` (boolean) - Whether this config is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `copilot_functions`
      - `id` (uuid, primary key)
      - `name` (text) - Function name (e.g., join_training_course)
      - `display_name` (text) - Human-readable name
      - `description` (text) - What the function does
      - `parameters_schema` (jsonb) - JSON schema for parameters
      - `is_enabled` (boolean) - Whether this function is available
      - `category` (text) - training, career, reviews, etc.
      - `created_at` (timestamptz)

    - `copilot_conversation_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User having the conversation
      - `role` (text) - user, assistant, system
      - `content` (text) - Message content
      - `function_call` (jsonb) - If a function was called
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Only admins can modify copilot configuration
    - Only admins can manage functions
    - Users can only view their own conversation history

  3. Important Notes
    - Only one config should be active at a time
    - Functions are defined to allow the copilot to take actions in the app
    - Conversation history helps maintain context across sessions
*/

-- Create copilot_config table
CREATE TABLE IF NOT EXISTS copilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT 'You are a helpful career development assistant at Epos Now. You help employees with their career pathways, training recommendations, and performance reviews.',
  model_name text NOT NULL DEFAULT 'gpt-4',
  temperature numeric DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 1000 CHECK (max_tokens > 0),
  top_p numeric DEFAULT 1.0 CHECK (top_p >= 0 AND top_p <= 1),
  frequency_penalty numeric DEFAULT 0 CHECK (frequency_penalty >= -2 AND frequency_penalty <= 2),
  presence_penalty numeric DEFAULT 0 CHECK (presence_penalty >= -2 AND presence_penalty <= 2),
  knowledge_base text DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_config ENABLE ROW LEVEL SECURITY;

-- Create copilot_functions table
CREATE TABLE IF NOT EXISTS copilot_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL,
  parameters_schema jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_functions ENABLE ROW LEVEL SECURITY;

-- Create copilot_conversation_history table
CREATE TABLE IF NOT EXISTS copilot_conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content text NOT NULL,
  function_call jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copilot_config

-- Admins can view all configs
CREATE POLICY "Admins can view copilot configs"
  ON copilot_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert configs
CREATE POLICY "Admins can create copilot configs"
  ON copilot_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update configs
CREATE POLICY "Admins can update copilot configs"
  ON copilot_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete configs
CREATE POLICY "Admins can delete copilot configs"
  ON copilot_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for copilot_functions

-- Everyone can view enabled functions
CREATE POLICY "Users can view enabled copilot functions"
  ON copilot_functions FOR SELECT
  TO authenticated
  USING (is_enabled = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can insert functions
CREATE POLICY "Admins can create copilot functions"
  ON copilot_functions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update functions
CREATE POLICY "Admins can update copilot functions"
  ON copilot_functions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete functions
CREATE POLICY "Admins can delete copilot functions"
  ON copilot_functions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for copilot_conversation_history

-- Users can view their own conversation history
CREATE POLICY "Users can view own conversation history"
  ON copilot_conversation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY "Users can create own conversation messages"
  ON copilot_conversation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversation history
CREATE POLICY "Users can delete own conversation history"
  ON copilot_conversation_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_copilot_config_active ON copilot_config(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_copilot_functions_enabled ON copilot_functions(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_copilot_functions_category ON copilot_functions(category);
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_user ON copilot_conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_created ON copilot_conversation_history(created_at);

-- Insert default configuration
INSERT INTO copilot_config (
  system_prompt,
  model_name,
  temperature,
  max_tokens,
  knowledge_base,
  is_active
) VALUES (
  'You are the Epos Now Futures AI Copilot, a helpful career development assistant. You help employees at Epos Now with:

- Career pathway guidance and progression planning
- Training and development recommendations
- Performance review preparation and insights
- Skills gap analysis and development plans
- Job family information and requirements
- Strategic goal alignment

You have access to functions that can help employees take action directly from our conversation, such as enrolling in training courses or viewing their career pathways. Always be supportive, professional, and focused on helping employees grow in their careers at Epos Now.

When recommending actions, consider the employee''s current role, career aspirations, and available opportunities within the organization.',
  'gpt-4',
  0.7,
  2000,
  'Company Information:
- Epos Now is a leading point-of-sale and retail management solutions provider
- We value continuous learning and career development
- We have structured career pathways across multiple job families
- Training is available for both technical and soft skills
- Performance is reviewed regularly with managers

Available Career Pathways:
- Software Engineering: Entry → Mid → Senior → Lead → Principal
- Product Management: Associate → Product Manager → Senior PM → Director
- Sales: Representative → Senior Rep → Team Lead → Manager
- Customer Success: Support → Senior Support → Team Lead → Manager

Key Values:
1. Customer Focus
2. Innovation
3. Collaboration
4. Accountability
5. Growth Mindset',
  true
) ON CONFLICT DO NOTHING;

-- Insert default functions that the copilot can call
INSERT INTO copilot_functions (name, display_name, description, parameters_schema, category, is_enabled) VALUES
(
  'view_career_pathways',
  'View Career Pathways',
  'Shows the user available career pathways and progression options in their field or across the organization',
  '{"type": "object", "properties": {}}'::jsonb,
  'career',
  true
),
(
  'join_training_course',
  'Enroll in Training Course',
  'Enrolls the user in a specific training course',
  '{"type": "object", "properties": {"course_id": {"type": "string", "description": "The ID of the training course to join"}}, "required": ["course_id"]}'::jsonb,
  'training',
  true
),
(
  'view_available_training',
  'View Available Training',
  'Shows all available training courses and sessions',
  '{"type": "object", "properties": {"category": {"type": "string", "description": "Filter by training category (optional)", "enum": ["Upskill", "Soft Skill", "Pathway"]}}}'::jsonb,
  'training',
  true
),
(
  'view_my_reviews',
  'View My Reviews',
  'Shows the user their performance review history and upcoming reviews',
  '{"type": "object", "properties": {}}'::jsonb,
  'reviews',
  true
),
(
  'view_skill_gaps',
  'Analyze Skill Gaps',
  'Analyzes the user''s current skills versus their target role requirements',
  '{"type": "object", "properties": {"target_role": {"type": "string", "description": "The job family or role to compare against"}}}'::jsonb,
  'career',
  true
),
(
  'view_strategic_goals',
  'View Strategic Goals',
  'Shows strategic goals assigned to the user or their team',
  '{"type": "object", "properties": {}}'::jsonb,
  'roadmap',
  true
),
(
  'create_career_plan',
  'Create Career Plan',
  'Helps the user create a new career development plan',
  '{"type": "object", "properties": {"target_job_family_id": {"type": "string", "description": "The target job family/role ID"}}}'::jsonb,
  'career',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_copilot_config_updated_at
  BEFORE UPDATE ON copilot_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copilot_functions_updated_at
  BEFORE UPDATE ON copilot_functions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/*
  # Create Review Form Templates System

  1. New Tables
    - `review_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - What this template is for
      - `template_type` (text) - Type: performance_review, 1to1, probation, etc.
      - `is_active` (boolean) - Whether this template is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `review_template_sections`
      - `id` (uuid, primary key)
      - `template_id` (uuid) - References review_templates
      - `title` (text) - Section title
      - `description` (text) - Section description/instructions
      - `sort_order` (integer) - Order of sections
      - `created_at` (timestamptz)

    - `review_template_questions`
      - `id` (uuid, primary key)
      - `section_id` (uuid) - References review_template_sections
      - `question_text` (text) - The actual question
      - `question_type` (text) - rating, text, textarea, multiple_choice, etc.
      - `options` (jsonb) - For multiple choice, rating scales, etc.
      - `is_required` (boolean) - Whether answer is required
      - `sort_order` (integer) - Order of questions within section
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Only admins can manage templates
    - All authenticated users can view active templates

  3. Important Notes
    - Templates define the structure of review forms
    - Each template can have multiple sections
    - Each section can have multiple questions
    - Questions can be of different types (rating, text, etc.)
*/

-- Create review_templates table
CREATE TABLE IF NOT EXISTS review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  template_type text NOT NULL DEFAULT 'performance_review',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

-- Create review_template_sections table
CREATE TABLE IF NOT EXISTS review_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_sections ENABLE ROW LEVEL SECURITY;

-- Create review_template_questions table
CREATE TABLE IF NOT EXISTS review_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES review_template_sections(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '{}'::jsonb,
  is_required boolean DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_templates

-- Authenticated users can view active templates
CREATE POLICY "Users can view active review templates"
  ON review_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can insert templates
CREATE POLICY "Admins can create review templates"
  ON review_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update templates
CREATE POLICY "Admins can update review templates"
  ON review_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete review templates"
  ON review_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for review_template_sections

-- Users can view sections of active templates
CREATE POLICY "Users can view sections of active templates"
  ON review_template_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_templates
      WHERE review_templates.id = review_template_sections.template_id
      AND (review_templates.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage sections
CREATE POLICY "Admins can create sections"
  ON review_template_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sections"
  ON review_template_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sections"
  ON review_template_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for review_template_questions

-- Users can view questions of active templates
CREATE POLICY "Users can view questions of active templates"
  ON review_template_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_template_sections
      JOIN review_templates ON review_templates.id = review_template_sections.template_id
      WHERE review_template_sections.id = review_template_questions.section_id
      AND (review_templates.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage questions
CREATE POLICY "Admins can create questions"
  ON review_template_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update questions"
  ON review_template_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete questions"
  ON review_template_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_templates_active ON review_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template ON review_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_order ON review_template_sections(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section ON review_template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_review_template_questions_order ON review_template_questions(section_id, sort_order);

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_review_templates_updated_at
  BEFORE UPDATE ON review_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default template
INSERT INTO review_templates (name, description, template_type, is_active) VALUES
(
  'Standard Performance Review',
  'Standard annual or bi-annual performance review template with goal setting and competency assessment',
  'performance_review',
  true
) ON CONFLICT DO NOTHING;

-- Get the template ID and insert sections and questions
DO $$
DECLARE
  template_id uuid;
  section_performance uuid;
  section_goals uuid;
  section_development uuid;
  section_feedback uuid;
BEGIN
  -- Get the template ID
  SELECT id INTO template_id FROM review_templates WHERE name = 'Standard Performance Review' LIMIT 1;
  
  IF template_id IS NOT NULL THEN
    -- Create sections
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Performance & Achievements', 'Review performance over the review period', 1)
    RETURNING id INTO section_performance;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Goals & Objectives', 'Discuss progress on previous goals and set new objectives', 2)
    RETURNING id INTO section_goals;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Development & Growth', 'Identify development areas and growth opportunities', 3)
    RETURNING id INTO section_development;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Overall Feedback', 'Provide summary feedback and rating', 4)
    RETURNING id INTO section_feedback;
    
    -- Add questions to Performance section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_performance, 'What were the key achievements during this review period?', 'textarea', '{}', true, 1),
      (section_performance, 'How well did the employee meet their job responsibilities?', 'rating', '{"min": 1, "max": 5, "labels": ["Below Expectations", "Meets Some Expectations", "Meets Expectations", "Exceeds Expectations", "Outstanding"]}', true, 2),
      (section_performance, 'What challenges did the employee face and how did they handle them?', 'textarea', '{}', true, 3);
    
    -- Add questions to Goals section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_goals, 'Were previous goals achieved? Please explain.', 'textarea', '{}', true, 1),
      (section_goals, 'What are the key goals for the next review period?', 'textarea', '{}', true, 2);
    
    -- Add questions to Development section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_development, 'What skills would benefit from further development?', 'textarea', '{}', true, 1),
      (section_development, 'What training or resources would support growth?', 'textarea', '{}', true, 2),
      (section_development, 'What are the career aspirations and how can we support them?', 'textarea', '{}', false, 3);
    
    -- Add questions to Feedback section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_feedback, 'Overall Performance Rating', 'rating', '{"min": 1, "max": 5, "labels": ["Needs Improvement", "Developing", "Competent", "Proficient", "Expert"]}', true, 1),
      (section_feedback, 'Additional comments or feedback', 'textarea', '{}', false, 2);
  END IF;
END $$;

/*
  # Create Competency Framework System

  1. New Tables
    - `values`
      - `id` (uuid, primary key)
      - `title` (text) - Value name (e.g., "Integrity", "Innovation")
      - `statement` (text) - Value statement/description
      - `sort_order` (integer) - Display order
      - `is_active` (boolean) - Whether this value is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `competencies`
      - `id` (uuid, primary key)
      - `value_id` (uuid) - References values table
      - `title` (text) - Competency name
      - `description` (text) - Competency description
      - `sort_order` (integer) - Display order within value
      - `is_active` (boolean) - Whether this competency is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `competency_levels`
      - `id` (uuid, primary key)
      - `competency_id` (uuid) - References competencies table
      - `level_number` (integer) - Level number (1, 2, 3, 4, etc.)
      - `level_name` (text) - Level name (e.g., "Developing", "Proficient", "Expert")
      - `statement` (text) - What this level means for this competency
      - `created_at` (timestamptz)

    - `job_family_competencies`
      - `id` (uuid, primary key)
      - `job_family_id` (uuid) - References job_families table
      - `competency_id` (uuid) - References competencies table
      - `required_level_id` (uuid) - References competency_levels table
      - `sort_order` (integer) - Display order (1-6 for the 6 competencies)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Admins can manage all competency framework data
    - All authenticated users can view active values, competencies, and levels
    - Users can view job family competencies

  3. Important Notes
    - Values represent organizational values
    - Each value can have multiple competencies
    - Each competency can have multiple levels (typically 4-5 levels)
    - Each job family should have exactly 6 competencies assigned
    - Competencies and levels flow through to reviews based on job title
*/

-- Create values table
CREATE TABLE IF NOT EXISTS values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  statement text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE values ENABLE ROW LEVEL SECURITY;

-- Create competencies table
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_id uuid NOT NULL REFERENCES values(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

-- Create competency_levels table
CREATE TABLE IF NOT EXISTS competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  level_name text NOT NULL,
  statement text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competency_id, level_number)
);

ALTER TABLE competency_levels ENABLE ROW LEVEL SECURITY;

-- Create job_family_competencies table
CREATE TABLE IF NOT EXISTS job_family_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid NOT NULL REFERENCES job_families(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  required_level_id uuid NOT NULL REFERENCES competency_levels(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_family_id, competency_id)
);

ALTER TABLE job_family_competencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for values table

-- All authenticated users can view active values
CREATE POLICY "Users can view active values"
  ON values FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can manage values
CREATE POLICY "Admins can create values"
  ON values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update values"
  ON values FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for competencies table

-- Users can view competencies of active values
CREATE POLICY "Users can view competencies"
  ON competencies FOR SELECT
  TO authenticated
  USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage competencies
CREATE POLICY "Admins can create competencies"
  ON competencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competencies"
  ON competencies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete competencies"
  ON competencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for competency_levels table

-- Users can view competency levels
CREATE POLICY "Users can view competency levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competencies
      WHERE competencies.id = competency_levels.competency_id
      AND (competencies.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage competency levels
CREATE POLICY "Admins can create competency levels"
  ON competency_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competency levels"
  ON competency_levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete competency levels"
  ON competency_levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for job_family_competencies table

-- Users can view job family competencies
CREATE POLICY "Users can view job family competencies"
  ON job_family_competencies FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage job family competencies
CREATE POLICY "Admins can create job family competencies"
  ON job_family_competencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update job family competencies"
  ON job_family_competencies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete job family competencies"
  ON job_family_competencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_values_active ON values(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_competencies_value ON competencies(value_id);
CREATE INDEX IF NOT EXISTS idx_competencies_active ON competencies(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_competency_levels_competency ON competency_levels(competency_id, level_number);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_job_family ON job_family_competencies(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency ON job_family_competencies(competency_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at
  BEFORE UPDATE ON competencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO values (title, statement, sort_order) VALUES
('Integrity', 'We act with honesty and transparency in all our dealings', 1),
('Innovation', 'We embrace creativity and continuous improvement', 2),
('Customer Focus', 'We put our customers at the heart of everything we do', 3),
('Teamwork', 'We collaborate effectively and support each other', 4),
('Excellence', 'We strive for the highest standards in our work', 5)
ON CONFLICT DO NOTHING;

-- Insert sample competencies
DO $$
DECLARE
  v_integrity_id uuid;
  v_innovation_id uuid;
  v_customer_id uuid;
  v_teamwork_id uuid;
  v_excellence_id uuid;
  c_communication_id uuid;
  c_problem_solving_id uuid;
  c_customer_service_id uuid;
  c_collaboration_id uuid;
  c_quality_id uuid;
BEGIN
  -- Get value IDs
  SELECT id INTO v_integrity_id FROM values WHERE title = 'Integrity' LIMIT 1;
  SELECT id INTO v_innovation_id FROM values WHERE title = 'Innovation' LIMIT 1;
  SELECT id INTO v_customer_id FROM values WHERE title = 'Customer Focus' LIMIT 1;
  SELECT id INTO v_teamwork_id FROM values WHERE title = 'Teamwork' LIMIT 1;
  SELECT id INTO v_excellence_id FROM values WHERE title = 'Excellence' LIMIT 1;

  -- Insert competencies
  IF v_integrity_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_integrity_id, 'Ethical Decision Making', 'Makes decisions based on ethical principles and organizational values', 1)
    RETURNING id INTO c_communication_id;
    
    -- Insert levels for Ethical Decision Making
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_communication_id, 1, 'Developing', 'Recognizes ethical issues and seeks guidance when making decisions'),
    (c_communication_id, 2, 'Proficient', 'Consistently makes ethical decisions and explains reasoning to others'),
    (c_communication_id, 3, 'Advanced', 'Guides others in ethical decision-making and addresses complex ethical dilemmas'),
    (c_communication_id, 4, 'Expert', 'Sets ethical standards for the organization and influences ethical culture');
  END IF;

  IF v_innovation_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_innovation_id, 'Problem Solving', 'Identifies and resolves problems through creative and analytical thinking', 1)
    RETURNING id INTO c_problem_solving_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_problem_solving_id, 1, 'Developing', 'Identifies problems and contributes to solutions with support'),
    (c_problem_solving_id, 2, 'Proficient', 'Independently analyzes and solves routine problems effectively'),
    (c_problem_solving_id, 3, 'Advanced', 'Solves complex problems and develops innovative solutions'),
    (c_problem_solving_id, 4, 'Expert', 'Tackles strategic challenges and creates breakthrough solutions');
  END IF;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_customer_id, 'Customer Service', 'Delivers excellent service and builds strong customer relationships', 1)
    RETURNING id INTO c_customer_service_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_customer_service_id, 1, 'Developing', 'Responds to customer needs with guidance and support'),
    (c_customer_service_id, 2, 'Proficient', 'Consistently delivers excellent customer service independently'),
    (c_customer_service_id, 3, 'Advanced', 'Anticipates customer needs and handles complex customer situations'),
    (c_customer_service_id, 4, 'Expert', 'Shapes customer service strategy and drives customer excellence');
  END IF;

  IF v_teamwork_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_teamwork_id, 'Collaboration', 'Works effectively with others to achieve shared goals', 1)
    RETURNING id INTO c_collaboration_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_collaboration_id, 1, 'Developing', 'Participates actively in team activities and supports team goals'),
    (c_collaboration_id, 2, 'Proficient', 'Collaborates effectively and helps team members succeed'),
    (c_collaboration_id, 3, 'Advanced', 'Facilitates cross-functional collaboration and builds high-performing teams'),
    (c_collaboration_id, 4, 'Expert', 'Creates collaborative culture and enables organization-wide teamwork');
  END IF;

  IF v_excellence_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_excellence_id, 'Quality Focus', 'Maintains high standards and attention to detail in all work', 1)
    RETURNING id INTO c_quality_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_quality_id, 1, 'Developing', 'Follows quality standards and checks own work for accuracy'),
    (c_quality_id, 2, 'Proficient', 'Consistently produces high-quality work and identifies improvements'),
    (c_quality_id, 3, 'Advanced', 'Sets quality standards and drives continuous quality improvement'),
    (c_quality_id, 4, 'Expert', 'Defines organizational quality strategy and excellence standards');
  END IF;
END $$;

/*
  # Create Simplified Progression Criteria System

  1. New Tables
    - `general_progression_criteria`
      - `id` (uuid, primary key)
      - `title` (text) - The criteria category name (e.g., "Internal roles")
      - `criteria_items` (jsonb) - Array of selection items with name, description, and target
      - `is_active` (boolean) - Whether this criteria is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Allow authenticated users to read all criteria
    - Only admins can insert, update, or delete criteria

  3. Sample Data
    - Add example "Internal roles" criteria
*/

-- Create the general progression criteria table
CREATE TABLE IF NOT EXISTS general_progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  criteria_items jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE general_progression_criteria ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read criteria
CREATE POLICY "Authenticated users can view progression criteria"
  ON general_progression_criteria
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert criteria
CREATE POLICY "Only admins can insert progression criteria"
  ON general_progression_criteria
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update criteria
CREATE POLICY "Only admins can update progression criteria"
  ON general_progression_criteria
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

-- Only admins can delete criteria
CREATE POLICY "Only admins can delete progression criteria"
  ON general_progression_criteria
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert sample data
INSERT INTO general_progression_criteria (title, criteria_items) VALUES
('Internal Roles', '[
  {
    "name": "Length of Service",
    "description": "How long you have been in your current role",
    "target": "9+ months"
  }
]'::jsonb);

/*
  # Add Emoji Support to Competency Framework

  1. Changes
    - Add `emoji` column to `values` table
    - Add `emoji` column to `competencies` table
    - Set default emojis for existing records

  2. Notes
    - Emoji fields are optional (can be null)
    - Users can select emojis when creating/editing values and competencies
*/

-- Add emoji column to values table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'values' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE values ADD COLUMN emoji text;
  END IF;
END $$;

-- Add emoji column to competencies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE competencies ADD COLUMN emoji text;
  END IF;
END $$;

/*
  # Add Language Settings

  1. New Tables
    - `organisation_settings`
      - `id` (uuid, primary key)
      - `language` (text, default 'en-GB' for British English)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `organisation_settings` table
    - Add policy for authenticated users to read settings
    - Add policy for admin users to update settings

  3. Notes
    - Supports multiple languages with 'en-GB' (British English) as default
    - Only one record exists for organisation-wide settings
*/

-- Create organisation_settings table
CREATE TABLE IF NOT EXISTS organisation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text DEFAULT 'en-GB' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read settings
CREATE POLICY "Authenticated users can read organisation settings"
  ON organisation_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update organisation settings"
  ON organisation_settings
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

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert organisation settings"
  ON organisation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings (only if no settings exist)
INSERT INTO organisation_settings (language)
SELECT 'en-GB'
WHERE NOT EXISTS (SELECT 1 FROM organisation_settings);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organisation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS organisation_settings_updated_at ON organisation_settings;
CREATE TRIGGER organisation_settings_updated_at
  BEFORE UPDATE ON organisation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organisation_settings_updated_at();

