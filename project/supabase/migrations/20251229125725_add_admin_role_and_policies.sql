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