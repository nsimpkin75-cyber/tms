/*
  # Fix Missing Tables, Views, and Columns - Final

  1. Changes
    - Create missing employee_skill_summary view (all column names corrected)
    - Create missing skill assessment discrepancies table
    - Create missing skill development actions table
    - Create missing one_to_one_scheduled_meetings table
    
  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Create skill_assessment_discrepancies table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_assessment_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
  employee_rating integer NOT NULL,
  manager_rating integer NOT NULL,
  rating_gap integer NOT NULL,
  ai_analysis text,
  ai_discussion_prompts jsonb,
  flagged_for_discussion boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_assessment_discrepancies' AND policyname = 'Users can view their own skill discrepancies') THEN
    ALTER TABLE skill_assessment_discrepancies ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own skill discrepancies"
      ON skill_assessment_discrepancies FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can create skill discrepancies"
      ON skill_assessment_discrepancies FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can update skill discrepancies"
      ON skill_assessment_discrepancies FOR UPDATE
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );
  END IF;
END $$;

-- Create skill_development_actions table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_development_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  action_type text NOT NULL,
  status text DEFAULT 'open',
  target_date date,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_development_actions' AND policyname = 'Users can view their own skill actions') THEN
    ALTER TABLE skill_development_actions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own skill actions"
      ON skill_development_actions FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can create skill actions"
      ON skill_development_actions FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers and employees can update skill actions"
      ON skill_development_actions FOR UPDATE
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );
  END IF;
END $$;

-- Create one_to_one_scheduled_meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS one_to_one_scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_datetime timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'one_to_one_scheduled_meetings' AND policyname = 'Users can view their own scheduled meetings') THEN
    ALTER TABLE one_to_one_scheduled_meetings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own scheduled meetings"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can create scheduled meetings"
      ON one_to_one_scheduled_meetings FOR INSERT
      TO authenticated
      WITH CHECK (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can update scheduled meetings"
      ON one_to_one_scheduled_meetings FOR UPDATE
      TO authenticated
      USING (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can delete scheduled meetings"
      ON one_to_one_scheduled_meetings FOR DELETE
      TO authenticated
      USING (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
END $$;

-- Create employee_skill_summary view with all corrected column names
CREATE OR REPLACE VIEW employee_skill_summary AS
SELECT
  sa.profile_id as employee_id,
  sm.id as skill_id,
  sm.name as skill_name,
  COALESCE(st.name, 'General') as skill_type,
  '📊' as skill_type_icon,
  sa.target_level,
  false as is_mandatory,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by = sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_self_rating,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by != sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_manager_rating,
  sa.current_level as current_rating,
  sa.assessment_date as last_assessed_at,
  'active' as cycle_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad 
      WHERE sad.employee_id = sa.profile_id 
      AND sad.skill_id = sm.id 
      AND sad.flagged_for_discussion = true 
      AND sad.resolved_at IS NULL
    ) THEN true 
    ELSE false 
  END as has_discrepancy,
  (SELECT ai_analysis FROM skill_assessment_discrepancies WHERE employee_id = sa.profile_id AND skill_id = sm.id ORDER BY created_at DESC LIMIT 1) as discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_employee ON skill_assessment_discrepancies(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_skill ON skill_assessment_discrepancies(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_flagged ON skill_assessment_discrepancies(flagged_for_discussion, resolved_at);

CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_employee ON skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_skill ON skill_development_actions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_status ON skill_development_actions(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_cycle ON one_to_one_scheduled_meetings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_manager ON one_to_one_scheduled_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_employee ON one_to_one_scheduled_meetings(employee_id);