/*
  # Add Missing Foreign Key Indexes - Part 2

  1. Changes
    - Continue adding indexes for foreign keys
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Rating approval workflow
CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_rating ON rating_approval_workflow(rating_id);

-- Review competency ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review ON review_competency_ratings(review_id);

-- Review cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_template_id ON review_cycles(template_id);

-- Review instances
CREATE INDEX IF NOT EXISTS idx_review_instances_cycle_id ON review_instances(cycle_id);

-- Review KPIs
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id ON review_kpis(employee_id);

-- Review monthly sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee ON review_monthly_sessions(employee_id);

-- Review notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient ON review_notifications(recipient_id);

-- Review responses
CREATE INDEX IF NOT EXISTS idx_review_responses_instance_id ON review_responses(instance_id);

-- Review six month performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_employee ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_manager ON review_six_month_performance(manager_id);