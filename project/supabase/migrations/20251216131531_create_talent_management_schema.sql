/*
  # Epos Now Futures - Talent Management System Schema

  ## Overview
  Complete database schema for a comprehensive talent management system with performance reviews,
  career pathways, internal mobility, and learning & development tracking.

  ## New Tables

  1. **profiles**
     - `id` (uuid, FK to auth.users) - User identifier
     - `email` (text) - User email
     - `full_name` (text) - User's full name
     - `role` (enum) - User role: employee, manager, dept_lead, senior, leadership, l_and_d, admin
     - `avatar_url` (text) - Profile picture URL
     - `department` (text) - User's department
     - `tenure` (integer) - Years at company
     - `created_at` (timestamptz) - Record creation timestamp

  2. **skills**
     - `id` (uuid) - Skill identifier
     - `name` (text) - Skill name
     - `category` (text) - Skill category (Technical, Soft Skills, etc.)

  3. **profile_skills**
     - Junction table linking profiles to skills
     - `profile_id` (uuid, FK to profiles)
     - `skill_id` (uuid, FK to skills)

  4. **reviews**
     - `id` (uuid) - Review identifier
     - `employee_id` (uuid, FK to profiles)
     - `manager_id` (uuid, FK to profiles)
     - `type` (text) - Review type: weekly, monthly, project
     - `status` (text) - Status: draft, submitted, completed
     - `overall_rating` (integer) - Overall rating 1-4
     - `summary` (text) - Review summary
     - `created_at` (timestamptz)

  5. **review_items**
     - `id` (uuid) - Item identifier
     - `review_id` (uuid, FK to reviews)
     - `category` (text) - Category: Wins, Blockers, KPI
     - `content` (text) - Item content
     - `rating` (integer) - Item rating

  6. **action_items**
     - `id` (uuid) - Action item identifier
     - `owner_id` (uuid, FK to profiles)
     - `text` (text) - Action item description
     - `due_date` (date) - Due date
     - `completed` (boolean) - Completion status
     - `is_carry_over` (boolean) - Carried over from previous review

  7. **training_sessions**
     - `id` (uuid) - Session identifier
     - `title` (text) - Session title
     - `type` (text) - Type: Upskill, Soft Skill, Pathway
     - `date` (date) - Session date
     - `time` (text) - Session time
     - `trainer_name` (text) - Trainer name
     - `method` (text) - Delivery method: Remote, Classroom
     - `max_attendees` (integer) - Maximum attendees
     - `description` (text) - Session description

  8. **training_attendees**
     - Junction table linking profiles to training sessions
     - `profile_id` (uuid, FK to profiles)
     - `training_session_id` (uuid, FK to training_sessions)
     - `booked_at` (timestamptz)

  9. **job_families**
     - `id` (uuid) - Job family identifier
     - `title` (text) - Job title
     - `department` (text) - Department
     - `level` (text) - Level: Entry, Mid, Senior
     - `description` (text) - Job description
     - `required_skills` (text[]) - Array of required skills

  ## Security
  - RLS enabled on all tables
  - Policies ensure users can only access data they're authorized to view
  - Managers can view their team's data
  - Leadership and admin have broader access
*/

-- Create role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'employee',
    'manager',
    'dept_lead',
    'senior',
    'leadership',
    'l_and_d',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  avatar_url text,
  department text,
  tenure integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L&D and admins can manage skills"
  ON skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')
    )
  );

-- 3. Profile skills junction table
CREATE TABLE IF NOT EXISTS profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, skill_id)
);

ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profile skills"
  ON profile_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own profile skills"
  ON profile_skills FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 4. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('weekly', 'monthly', 'project')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'completed')),
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 4),
  summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR manager_id = auth.uid());

CREATE POLICY "Managers can view team reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')
    )
  );

CREATE POLICY "Managers can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')
    )
  );

CREATE POLICY "Managers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- 5. Review items table
CREATE TABLE IF NOT EXISTS review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('Wins', 'Blockers', 'KPI', 'Values')),
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 4),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review items for accessible reviews"
  ON review_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND (reviews.employee_id = auth.uid() OR reviews.manager_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage review items"
  ON review_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.manager_id = auth.uid()
    )
  );

-- 6. Action items table
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  due_date date,
  completed boolean DEFAULT false,
  is_carry_over boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action items"
  ON action_items FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Managers can view team action items"
  ON action_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')
    )
  );

CREATE POLICY "Users can manage own action items"
  ON action_items FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 7. Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('Upskill', 'Soft Skill', 'Pathway')),
  date date NOT NULL,
  time text NOT NULL,
  trainer_name text NOT NULL,
  method text NOT NULL CHECK (method IN ('Remote', 'Classroom')),
  max_attendees integer DEFAULT 20,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L&D can manage training sessions"
  ON training_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')
    )
  );

-- 8. Training attendees junction table
CREATE TABLE IF NOT EXISTS training_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  training_session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE NOT NULL,
  booked_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, training_session_id)
);

ALTER TABLE training_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all training attendees"
  ON training_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can book own training"
  ON training_attendees FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can cancel own training"
  ON training_attendees FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- 9. Job families table
CREATE TABLE IF NOT EXISTS job_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL,
  level text NOT NULL CHECK (level IN ('Entry', 'Mid', 'Senior', 'Lead', 'Principal')),
  description text,
  required_skills text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view job families"
  ON job_families FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can manage job families"
  ON job_families FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manager ON reviews(manager_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completed ON action_items(completed);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(date);
CREATE INDEX IF NOT EXISTS idx_training_attendees_profile ON training_attendees(profile_id);
CREATE INDEX IF NOT EXISTS idx_training_attendees_session ON training_attendees(training_session_id);