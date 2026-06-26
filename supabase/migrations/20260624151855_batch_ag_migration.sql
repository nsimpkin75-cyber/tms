-- Batch AG: Comprehensive schema - competencies, reviews, training, performance
-- Adds missing columns, creates comprehensive framework tables

-- Add missing columns to job_families
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS progression_to text;
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS alternative_paths text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS key_responsibilities text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_type text CHECK (admin_type IN ('super_admin', 'hr_admin', 'department_admin', 'full_admin', 'job_families_admin', 'people_admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_manager ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(job_title);

-- Competency Framework System
CREATE TABLE IF NOT EXISTS competency_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  emoji text DEFAULT '📊',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competency_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view frameworks" ON competency_frameworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage frameworks" ON competency_frameworks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS competency_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES competency_frameworks(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  emoji text DEFAULT '📁',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competency_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON competency_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON competency_categories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES competency_categories(id) ON DELETE CASCADE NOT NULL,
  level_number integer NOT NULL,
  title text NOT NULL,
  description text,
  behaviors text[] DEFAULT '{}',
  manager_guidance text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competency_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view levels" ON competency_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage levels" ON competency_levels FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Review Templates
CREATE TABLE IF NOT EXISTS review_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('weekly', 'monthly', 'quarterly', 'annual', 'project', 'one_to_one')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON review_form_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON review_form_templates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS review_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES review_form_templates(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sections" ON review_template_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sections" ON review_template_sections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS review_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES review_template_sections(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('text', 'textarea', 'rating', 'select', 'multiselect', 'date')),
  options jsonb,
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions" ON review_template_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON review_template_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text CHECK (type IN ('Upskill', 'Soft Skill', 'Pathway', 'Compliance', 'Technical')),
  duration_hours integer,
  is_mandatory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON training_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON training_courses FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')));

CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules" ON training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage modules" ON training_modules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')));

CREATE TABLE IF NOT EXISTS module_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('text', 'video', 'quiz', 'document', 'interactive')),
  title text NOT NULL,
  content jsonb NOT NULL,
  sort_order integer DEFAULT 0,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE module_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content" ON module_content_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage content" ON module_content_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')));

CREATE TABLE IF NOT EXISTS training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  progress_percentage integer DEFAULT 0,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON training_completions FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Managers can view team" ON training_completions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'l_and_d', 'admin')));
CREATE POLICY "Users can manage own" ON training_completions FOR ALL TO authenticated
USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Performance Ratings
CREATE TABLE IF NOT EXISTS performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating_period text NOT NULL,
  rating_value integer CHECK (rating_value >= 1 AND rating_value <= 5),
  rating_category text,
  rater_id uuid REFERENCES profiles(id),
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ratings" ON performance_ratings FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Managers can view team ratings" ON performance_ratings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')));
CREATE POLICY "Managers can create ratings" ON performance_ratings FOR INSERT TO authenticated
WITH CHECK (rater_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Managers can update ratings" ON performance_ratings FOR UPDATE TO authenticated
USING (rater_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (rater_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS rating_approval_workflow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid REFERENCES performance_ratings(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rating_approval_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approvers can view workflow" ON rating_approval_workflow FOR SELECT TO authenticated
USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin')));
CREATE POLICY "System can create workflow" ON rating_approval_workflow FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')));
CREATE POLICY "Approvers can update workflow" ON rating_approval_workflow FOR UPDATE TO authenticated
USING (approver_id = auth.uid()) WITH CHECK (approver_id = auth.uid());

-- Career Pathways
CREATE TABLE IF NOT EXISTS career_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_job_family_id uuid REFERENCES job_families(id) NOT NULL,
  to_job_family_id uuid REFERENCES job_families(id) NOT NULL,
  pathway_type text DEFAULT 'progression' CHECK (pathway_type IN ('progression', 'lateral', 'alternative')),
  required_skills text[],
  estimated_duration_months integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pathways" ON career_pathways FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pathways" ON career_pathways FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Job History
CREATE TABLE IF NOT EXISTS job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  department text,
  change_type text CHECK (change_type IN ('hire', 'promotion', 'lateral_move', 'demotion', 'transfer')),
  previous_job_title text,
  effective_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON job_history FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Managers can view team history" ON job_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')));
CREATE POLICY "Admins can manage history" ON job_history FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_job_history_profile ON job_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_history_date ON job_history(effective_date);

-- Progression Criteria
CREATE TABLE IF NOT EXISTS progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_level text NOT NULL,
  to_level text NOT NULL,
  category text NOT NULL,
  criteria_description text NOT NULL,
  required_skills text[],
  min_time_in_role_months integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE progression_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view criteria" ON progression_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage criteria" ON progression_criteria FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- AI Quiz Preferences
CREATE TABLE IF NOT EXISTS ai_quiz_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_data jsonb NOT NULL DEFAULT '{}',
  career_interests text[],
  skill_preferences text[],
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE ai_quiz_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON ai_quiz_preferences FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Users can manage own preferences" ON ai_quiz_preferences FOR ALL TO authenticated
USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins can view all preferences" ON ai_quiz_preferences FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Training Links
CREATE TABLE IF NOT EXISTS training_module_job_family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  is_recommended boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_course_id, job_family_id)
);

ALTER TABLE training_module_job_family_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view links" ON training_module_job_family_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage links" ON training_module_job_family_links FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin')));

CREATE INDEX IF NOT EXISTS idx_training_links_course ON training_module_job_family_links(training_course_id);
CREATE INDEX IF NOT EXISTS idx_training_links_job_family ON training_module_job_family_links(job_family_id);

-- Performance and competency indexes
CREATE INDEX IF NOT EXISTS idx_competency_categories_framework ON competency_categories(framework_id);
CREATE INDEX IF NOT EXISTS idx_competency_levels_category ON competency_levels(category_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_course ON training_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_content_items_module ON module_content_items(module_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_profile ON training_completions(profile_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_course ON training_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_profile ON performance_ratings(profile_id);
CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_rating ON rating_approval_workflow(rating_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_from ON career_pathways(from_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_to ON career_pathways(to_job_family_id);

-- User status view
CREATE OR REPLACE VIEW user_status_view AS
SELECT 
  p.id, p.email, p.full_name, p.role, p.department, p.last_active,
  CASE 
    WHEN p.last_active > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN p.last_active > NOW() - INTERVAL '1 hour' THEN 'away'
    ELSE 'offline'
  END as status
FROM profiles p;

-- Function to update last active
CREATE OR REPLACE FUNCTION update_last_active() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE profiles SET last_active = NOW() WHERE id = auth.uid(); END; $$;
