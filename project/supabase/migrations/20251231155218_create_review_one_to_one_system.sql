/*
  # Create Comprehensive Review and One-to-One Meeting System

  1. New Tables
    - `review_meetings`
      - Scheduled one-to-one meetings between managers and employees
      - Supports weekly check-ins and monthly reviews
      - Tracks meeting status, agenda, and completion
    
    - `review_actions`
      - Actions and milestones discussed in meetings
      - Tracks progress, completion status, and feedback
    
    - `review_kpi_ratings`
      - KPI assessments during reviews
      - Stores ratings and progress notes
    
    - `review_competency_assessments`
      - Competency feedback linked to job family competencies
      - AI-recommended ratings and manager feedback
      - Flags high ratings (4) for manager's manager approval
    
    - `review_summaries`
      - AI-generated overall summaries
      - Areas for development and suggested goals
      - Manager acceptance and modifications
    
    - `review_approvals`
      - Approval workflow for high competency ratings
      - Manager's manager reviews and approves rating 4 assessments
    
    - `review_employee_notes`
      - Employee responses and notes after review completion
    
  2. Security
    - Enable RLS on all tables
    - Managers can manage reviews for their direct reports
    - Employees can view their own reviews and add notes
    - Senior managers can approve competency ratings
*/

-- Review Meetings Table
CREATE TABLE IF NOT EXISTS review_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_type text NOT NULL CHECK (meeting_type IN ('weekly_checkin', 'monthly_review')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date timestamptz NOT NULL,
  completed_date timestamptz,
  agenda text,
  meeting_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_meetings_manager ON review_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_meetings_employee ON review_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_meetings_status ON review_meetings(status);
CREATE INDEX IF NOT EXISTS idx_review_meetings_date ON review_meetings(scheduled_date);

-- Review Actions Table
CREATE TABLE IF NOT EXISTS review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date timestamptz,
  progress_notes text,
  completed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_actions_meeting ON review_actions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_status ON review_actions(status);

-- Review KPI Ratings Table
CREATE TABLE IF NOT EXISTS review_kpi_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  kpi_description text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  target_value text,
  actual_value text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_meeting ON review_kpi_ratings(meeting_id);

-- Review Competency Assessments Table
CREATE TABLE IF NOT EXISTS review_competency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES competencies(id) ON DELETE SET NULL,
  competency_name text NOT NULL,
  feedback text NOT NULL,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 4),
  ai_recommended_rating integer CHECK (ai_recommended_rating >= 1 AND ai_recommended_rating <= 4),
  requires_approval boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'not_required')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_meeting ON review_competency_assessments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_approval ON review_competency_assessments(approval_status) WHERE requires_approval = true;

-- Review Summaries Table
CREATE TABLE IF NOT EXISTS review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  overall_summary text NOT NULL,
  areas_for_development text[],
  suggested_goals text[],
  ai_generated_content jsonb,
  manager_modified boolean DEFAULT false,
  manager_modifications text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_review_summaries_meeting ON review_summaries(meeting_id);

-- Review Approvals Table
CREATE TABLE IF NOT EXISTS review_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_assessment_id uuid NOT NULL REFERENCES review_competency_assessments(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments text,
  reviewed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_approvals_assessment ON review_approvals(competency_assessment_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_status ON review_approvals(status);

-- Review Employee Notes Table
CREATE TABLE IF NOT EXISTS review_employee_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_review_employee_notes_meeting ON review_employee_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_employee_notes_employee ON review_employee_notes(employee_id);

-- Enable RLS
ALTER TABLE review_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_kpi_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competency_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_employee_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_meetings
CREATE POLICY "Managers can view meetings for their team"
  ON review_meetings FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'leadership')
    )
  );

CREATE POLICY "Managers can create meetings for their team"
  ON review_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'leadership', 'admin')
    ) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update their team's meetings"
  ON review_meetings FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can delete their team's meetings"
  ON review_meetings FOR DELETE
  TO authenticated
  USING (manager_id = auth.uid());

-- RLS Policies for review_actions
CREATE POLICY "Users can view actions for their meetings"
  ON review_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can create actions for their meetings"
  ON review_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers and employees can update actions"
  ON review_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can delete actions"
  ON review_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_kpi_ratings
CREATE POLICY "Users can view KPI ratings for their meetings"
  ON review_kpi_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage KPI ratings"
  ON review_kpi_ratings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_competency_assessments
CREATE POLICY "Users can view competency assessments for their meetings"
  ON review_competency_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM review_approvals
      WHERE review_approvals.competency_assessment_id = id
      AND review_approvals.approver_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage competency assessments"
  ON review_competency_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_summaries
CREATE POLICY "Users can view summaries for their meetings"
  ON review_summaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage summaries"
  ON review_summaries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_approvals
CREATE POLICY "Approvers and managers can view approvals"
  ON review_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM review_competency_assessments rca
      JOIN review_meetings rm ON rm.id = rca.meeting_id
      WHERE rca.id = competency_assessment_id
      AND rm.manager_id = auth.uid()
    )
  );

CREATE POLICY "System can create approvals"
  ON review_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_competency_assessments rca
      JOIN review_meetings rm ON rm.id = rca.meeting_id
      WHERE rca.id = competency_assessment_id
      AND rm.manager_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON review_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- RLS Policies for review_employee_notes
CREATE POLICY "Employees and managers can view employee notes"
  ON review_employee_notes FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own notes"
  ON review_employee_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own notes"
  ON review_employee_notes FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_review_meetings_updated_at
  BEFORE UPDATE ON review_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_actions_updated_at
  BEFORE UPDATE ON review_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_kpi_ratings_updated_at
  BEFORE UPDATE ON review_kpi_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_competency_assessments_updated_at
  BEFORE UPDATE ON review_competency_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_summaries_updated_at
  BEFORE UPDATE ON review_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_approvals_updated_at
  BEFORE UPDATE ON review_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_employee_notes_updated_at
  BEFORE UPDATE ON review_employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();
