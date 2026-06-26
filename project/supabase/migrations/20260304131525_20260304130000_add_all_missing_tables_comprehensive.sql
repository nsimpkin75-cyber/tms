/*
  # Add All Missing Tables - Comprehensive Schema Update

  ## Overview
  This migration adds all missing tables required by the application, including:
  - Competency Framework System
  - Career Pathways & Plans  
  - Strategic Roadmaps & Goals
  - Review Templates & Cycles
  - One-to-One Reviews
  - Skills Matrix & Assessments
  - Training Courses & Modules
  - Performance Ratings & Tracking

  ## New Tables Added
  1. competency_frameworks - Define competency frameworks
  2. competency_categories - Categories within frameworks
  3. competency_levels - Proficiency levels for competencies
  4. review_form_templates - Template definitions for review forms
  5. review_template_sections - Sections within templates
  6. review_template_questions - Questions in each section
  7. review_cycles - Review cycle configurations
  8. cycle_kpis - KPIs associated with cycles
  9. cycle_actions - Actions associated with cycles
  10. review_instances - Individual review instances
  11. review_responses - Responses to review questions
  12. one_to_one_meetings - One-to-one meeting records
  13. one_to_one_notes - Notes from one-to-ones
  14. one_to_one_action_items - Action items from meetings
  15. skills_matrix - Skills assessment matrix
  16. skill_assessments - Individual skill assessments
  17. skill_development_plans - Development plans for skills
  18. career_pathways - Career progression pathways
  19. career_plans - Individual career plans
  20. career_plan_milestones - Milestones in career plans
  21. strategic_goals - Organization strategic goals
  22. goal_kpis - KPIs for strategic goals
  23. goal_actions - Actions for strategic goals
  24. goal_departments - Departments involved in goals
  25. training_courses - Training course definitions
  26. training_modules - Modules within courses
  27. training_completions - Training completion tracking
  28. module_content_items - Content items in modules
  29. performance_ratings - Performance rating tracking
  30. rating_approval_workflow - Approval workflow for ratings

  ## Security
  - RLS enabled on all tables
  - Appropriate policies for authenticated users
  - Admin access for management tables
  - User access to their own data
*/

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

CREATE POLICY "Anyone can view frameworks"
  ON competency_frameworks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage frameworks"
  ON competency_frameworks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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

CREATE POLICY "Anyone can view categories"
  ON competency_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON competency_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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

CREATE POLICY "Anyone can view levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage levels"
  ON competency_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Review Templates System
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

CREATE POLICY "Anyone can view templates"
  ON review_form_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON review_form_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS review_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES review_form_templates(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sections"
  ON review_template_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sections"
  ON review_template_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

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

CREATE POLICY "Anyone can view questions"
  ON review_template_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage questions"
  ON review_template_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Review Cycles System
CREATE TABLE IF NOT EXISTS review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_id uuid REFERENCES review_form_templates(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON review_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS cycle_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES review_cycles(id) ON DELETE CASCADE NOT NULL,
  kpi_name text NOT NULL,
  target_value text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cycle_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cycle KPIs"
  ON cycle_kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycle KPIs"
  ON cycle_kpis FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS cycle_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES review_cycles(id) ON DELETE CASCADE NOT NULL,
  action_text text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cycle_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cycle actions"
  ON cycle_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycle actions"
  ON cycle_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Review Instances System
CREATE TABLE IF NOT EXISTS review_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES review_cycles(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'completed')),
  scheduled_date date,
  completed_date date,
  overall_rating integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review instances"
  ON review_instances FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR manager_id = auth.uid());

CREATE POLICY "Managers can view team review instances"
  ON review_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Managers can create review instances"
  ON review_instances FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers can update review instances"
  ON review_instances FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES review_instances(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES review_template_questions(id) ON DELETE CASCADE NOT NULL,
  response_value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review responses"
  ON review_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances
      WHERE id = review_responses.instance_id
      AND (employee_id = auth.uid() OR manager_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage review responses"
  ON review_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances
      WHERE id = review_responses.instance_id
      AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_instances
      WHERE id = review_responses.instance_id
      AND manager_id = auth.uid()
    )
  );

-- One-to-One Meeting System
CREATE TABLE IF NOT EXISTS one_to_one_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  meeting_type text DEFAULT 'weekly' CHECK (meeting_type IN ('weekly', 'monthly', 'ad_hoc')),
  duration_minutes integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meetings"
  ON one_to_one_meetings FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR manager_id = auth.uid());

CREATE POLICY "Managers can view team meetings"
  ON one_to_one_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Managers can create meetings"
  ON one_to_one_meetings FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update meetings"
  ON one_to_one_meetings FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_meetings(id) ON DELETE CASCADE NOT NULL,
  notes text,
  discussion_points text[],
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting notes"
  ON one_to_one_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings
      WHERE id = one_to_one_notes.meeting_id
      AND (employee_id = auth.uid() OR manager_id = auth.uid())
    )
  );

CREATE POLICY "Participants can create notes"
  ON one_to_one_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings
      WHERE id = meeting_id
      AND (employee_id = auth.uid() OR manager_id = auth.uid())
    )
  );

CREATE POLICY "Creators can update notes"
  ON one_to_one_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_meetings(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_text text NOT NULL,
  due_date date,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting actions"
  ON one_to_one_action_items FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM one_to_one_meetings
      WHERE id = one_to_one_action_items.meeting_id
      AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create actions"
  ON one_to_one_action_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings
      WHERE id = meeting_id
      AND (employee_id = auth.uid() OR manager_id = auth.uid())
    )
  );

CREATE POLICY "Owners can update actions"
  ON one_to_one_action_items FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Skills Matrix System
CREATE TABLE IF NOT EXISTS skills_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  job_family_id uuid REFERENCES job_families(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skills matrix"
  ON skills_matrix FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skills matrix"
  ON skills_matrix FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  current_level integer DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 5),
  target_level integer CHECK (target_level >= 1 AND target_level <= 5),
  assessed_by uuid REFERENCES profiles(id),
  assessment_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON skill_assessments FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team assessments"
  ON skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Managers can create assessments"
  ON skill_assessments FOR INSERT
  TO authenticated
  WITH CHECK (assessed_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers can update assessments"
  ON skill_assessments FOR UPDATE
  TO authenticated
  USING (assessed_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (assessed_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS skill_development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  current_level integer DEFAULT 1,
  target_level integer NOT NULL,
  development_actions text[],
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skill_development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own development plans"
  ON skill_development_plans FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team development plans"
  ON skill_development_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Users can manage own development plans"
  ON skill_development_plans FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Career Pathways System
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

CREATE POLICY "Anyone can view pathways"
  ON career_pathways FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pathways"
  ON career_pathways FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS career_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_job_family_id uuid REFERENCES job_families(id),
  target_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'in_progress', 'completed')),
  manager_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Users can manage own career plans"
  ON career_plans FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE TABLE IF NOT EXISTS career_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES career_plans(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_plan_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM career_plans WHERE id = career_plan_milestones.plan_id AND profile_id = auth.uid())
  );

CREATE POLICY "Users can manage own milestones"
  ON career_plan_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM career_plans WHERE id = plan_id AND profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM career_plans WHERE id = plan_id AND profile_id = auth.uid())
  );

-- Strategic Goals System
CREATE TABLE IF NOT EXISTS strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('growth', 'operational', 'innovation', 'people')),
  start_date date,
  target_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'on_hold', 'cancelled')),
  owner_id uuid REFERENCES profiles(id),
  success_measures text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategic_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view strategic goals"
  ON strategic_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can manage goals"
  ON strategic_goals FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  );

CREATE TABLE IF NOT EXISTS goal_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES strategic_goals(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_value text,
  current_value text,
  unit text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view goal KPIs"
  ON goal_kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can manage goal KPIs"
  ON goal_kpis FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  );

CREATE TABLE IF NOT EXISTS goal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES strategic_goals(id) ON DELETE CASCADE NOT NULL,
  action_text text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view goal actions"
  ON goal_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can manage goal actions"
  ON goal_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  );

CREATE TABLE IF NOT EXISTS goal_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES strategic_goals(id) ON DELETE CASCADE NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view goal departments"
  ON goal_departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leadership can manage goal departments"
  ON goal_departments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin'))
  );

-- Training Courses System
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

CREATE POLICY "Anyone can view courses"
  ON training_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON training_courses FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  );

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

CREATE POLICY "Anyone can view modules"
  ON training_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage modules"
  ON training_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  );

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

CREATE POLICY "Anyone can view content items"
  ON module_content_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage content items"
  ON module_content_items FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  );

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

CREATE POLICY "Users can view own completions"
  ON training_completions FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team completions"
  ON training_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'l_and_d', 'admin'))
  );

CREATE POLICY "Users can manage own completions"
  ON training_completions FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Performance Ratings System
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

CREATE POLICY "Users can view own ratings"
  ON performance_ratings FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team ratings"
  ON performance_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Managers can create ratings"
  ON performance_ratings FOR INSERT
  TO authenticated
  WITH CHECK (rater_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers can update ratings"
  ON performance_ratings FOR UPDATE
  TO authenticated
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

CREATE POLICY "Approvers can view workflow"
  ON rating_approval_workflow FOR SELECT
  TO authenticated
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leadership', 'admin')));

CREATE POLICY "System can create workflow"
  ON rating_approval_workflow FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin')));

CREATE POLICY "Approvers can update workflow"
  ON rating_approval_workflow FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_competency_categories_framework ON competency_categories(framework_id);
CREATE INDEX IF NOT EXISTS idx_competency_levels_category ON competency_levels(category_id);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template ON review_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section ON review_template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_template ON review_cycles(template_id);
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle ON cycle_kpis(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_actions_cycle ON cycle_actions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_cycle ON review_instances(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_employee ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager ON review_instances(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_instance ON review_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_employee ON one_to_one_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_manager ON one_to_one_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_notes_meeting ON one_to_one_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_action_items_meeting ON one_to_one_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_action_items_owner ON one_to_one_action_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_profile ON skill_assessments(profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill ON skill_assessments(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_development_plans_profile ON skill_development_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_from ON career_pathways(from_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_to ON career_pathways(to_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_profile ON career_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan ON career_plan_milestones(plan_id);
CREATE INDEX IF NOT EXISTS idx_goal_kpis_goal ON goal_kpis(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_actions_goal ON goal_actions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_departments_goal ON goal_departments(goal_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_course ON training_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_content_items_module ON module_content_items(module_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_profile ON training_completions(profile_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_course ON training_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_profile ON performance_ratings(profile_id);
CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_rating ON rating_approval_workflow(rating_id);
