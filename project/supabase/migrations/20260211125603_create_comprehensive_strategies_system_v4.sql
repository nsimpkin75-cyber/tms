/*
  # Create Comprehensive Strategies System
  
  1. Overview
    - New comprehensive strategies system
    - Supports executive-level and department-level strategies
    - Parent/child strategy linking
    - Multi-step creation workflow
    - Approval workflow for department strategies
    - Integration with Reviews module for KPIs
  
  2. New Tables
    - `strategies` - Main strategies (executive or department level)
    - `strategy_focus_areas` - Areas of focus for each strategy
    - `strategy_milestones` - Milestones/goals within focus areas
    - `strategy_leads` - Assignment of leads to focus areas
    - `department_strategies` - Department-level strategies
    - `department_strategy_actions` - Actions for department strategies
    - `strategy_kpis` - Key performance indicators
    - `strategy_approvals` - Approval workflow tracking
    - `strategy_notifications` - Track notifications sent
  
  3. Security
    - Enable RLS on all tables
    - Comprehensive policies for all user roles
*/

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS strategy_notifications CASCADE;
DROP TABLE IF EXISTS strategy_approvals CASCADE;
DROP TABLE IF EXISTS strategy_kpis CASCADE;
DROP TABLE IF EXISTS department_strategy_actions CASCADE;
DROP TABLE IF EXISTS department_strategies CASCADE;
DROP TABLE IF EXISTS strategy_leads CASCADE;
DROP TABLE IF EXISTS strategy_milestones CASCADE;
DROP TABLE IF EXISTS strategy_focus_areas CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;

-- Main strategies table
CREATE TABLE strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  parent_strategy_id uuid,
  is_department_level boolean DEFAULT false,
  department text,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT strategies_status_check CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  CONSTRAINT strategies_date_check CHECK (end_date >= start_date)
);

-- Add foreign key for parent_strategy after table creation
ALTER TABLE strategies 
  ADD CONSTRAINT strategies_parent_fkey 
  FOREIGN KEY (parent_strategy_id) 
  REFERENCES strategies(id) 
  ON DELETE SET NULL;

-- Strategy focus areas
CREATE TABLE strategy_focus_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Strategy milestones
CREATE TABLE strategy_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text DEFAULT 'not_started',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT milestones_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked'))
);

-- Strategy leads assignment
CREATE TABLE strategy_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  UNIQUE(focus_area_id, user_id)
);

-- Department strategies
CREATE TABLE department_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  department text NOT NULL,
  title text NOT NULL,
  description text,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'draft',
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT dept_strategy_status_check CHECK (status IN ('draft', 'pending_approval', 'active', 'rejected', 'archived'))
);

-- Department strategy actions
CREATE TABLE department_strategy_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id),
  target_date date,
  status text DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dept_actions_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked'))
);

-- Strategy KPIs
CREATE TABLE strategy_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE,
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  success_measure text NOT NULL,
  target_value numeric,
  current_value numeric DEFAULT 0,
  measurement_unit text,
  assigned_to_user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT kpi_parent_check CHECK (
    (strategy_id IS NOT NULL AND department_strategy_id IS NULL) OR
    (strategy_id IS NULL AND department_strategy_id IS NOT NULL)
  )
);

-- Approval workflow
CREATE TABLE strategy_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'pending',
  feedback text,
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT approval_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested'))
);

-- Notifications
CREATE TABLE strategy_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notif_type_check CHECK (notification_type IN ('strategy_assigned', 'approval_requested', 'approved', 'rejected', 'changes_requested', 'status_changed'))
);

-- Create indexes
CREATE INDEX idx_strategies_creator ON strategies(creator_id);
CREATE INDEX idx_strategies_parent ON strategies(parent_strategy_id);
CREATE INDEX idx_strategies_status ON strategies(status);
CREATE INDEX idx_focus_areas_strategy ON strategy_focus_areas(strategy_id);
CREATE INDEX idx_milestones_focus_area ON strategy_milestones(focus_area_id);
CREATE INDEX idx_leads_focus_area ON strategy_leads(focus_area_id);
CREATE INDEX idx_leads_user ON strategy_leads(user_id);
CREATE INDEX idx_dept_strategies_parent ON department_strategies(parent_strategy_id);
CREATE INDEX idx_dept_strategies_focus ON department_strategies(focus_area_id);
CREATE INDEX idx_dept_strategies_creator ON department_strategies(creator_id);
CREATE INDEX idx_kpis_strategy ON strategy_kpis(strategy_id);
CREATE INDEX idx_kpis_dept_strategy ON strategy_kpis(department_strategy_id);
CREATE INDEX idx_kpis_assigned_to ON strategy_kpis(assigned_to_user_id);
CREATE INDEX idx_approvals_dept_strategy ON strategy_approvals(department_strategy_id);
CREATE INDEX idx_approvals_approver ON strategy_approvals(approver_id);
CREATE INDEX idx_notifications_user ON strategy_notifications(user_id);

-- Enable RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategies
CREATE POLICY "Admins and leadership can view all strategies"
  ON strategies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Users with access can view active strategies"
  ON strategies FOR SELECT TO authenticated
  USING (status = 'active' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'leadership') OR profiles.has_strategic_roadmap_access = true)));

CREATE POLICY "Strategy creators can view own strategies"
  ON strategies FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Admins and leadership can create strategies"
  ON strategies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Strategy creators and admins can update strategies"
  ON strategies FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

-- RLS for strategy_focus_areas
CREATE POLICY "Users can view focus areas" ON strategy_focus_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and creators can manage focus areas" ON strategy_focus_areas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategies WHERE strategies.id = strategy_focus_areas.strategy_id AND (strategies.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategies WHERE strategies.id = strategy_focus_areas.strategy_id AND (strategies.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_milestones
CREATE POLICY "Users can view milestones" ON strategy_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leads can manage milestones" ON strategy_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_milestones.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = sfa.id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_milestones.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = sfa.id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_leads
CREATE POLICY "Users can view leads" ON strategy_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and creators can assign leads" ON strategy_leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_leads.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_leads.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for department_strategies
CREATE POLICY "Users can view relevant dept strategies" ON department_strategies FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'leadership') OR profiles.department = department_strategies.department)) OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = department_strategies.focus_area_id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()));

CREATE POLICY "Strategy leads can create dept strategies" ON department_strategies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = focus_area_id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Creators and admins can update dept strategies" ON department_strategies FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()));

-- RLS for department_strategy_actions
CREATE POLICY "Users can view relevant actions" ON department_strategy_actions FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

CREATE POLICY "Dept strategy creators can manage actions" ON department_strategy_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_kpis
CREATE POLICY "Users can view relevant KPIs" ON strategy_kpis FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND (s.creator_id = auth.uid() OR s.status = 'active')) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()));

CREATE POLICY "Admins and creators can manage KPIs" ON strategy_kpis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND s.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND s.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()));

-- RLS for strategy_approvals
CREATE POLICY "Relevant users can view approvals" ON strategy_approvals FOR SELECT TO authenticated
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_approvals.department_strategy_id AND ds.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Strategy creators can request approvals" ON strategy_approvals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_id AND ds.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Approvers can respond to approvals" ON strategy_approvals FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))
  WITH CHECK (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

-- RLS for strategy_notifications
CREATE POLICY "Users can view own notifications" ON strategy_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON strategy_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can mark notifications as read" ON strategy_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
