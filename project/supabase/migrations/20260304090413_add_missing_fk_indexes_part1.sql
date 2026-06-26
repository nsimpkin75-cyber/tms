/*
  # Add Missing Foreign Key Indexes - Part 1

  1. Purpose
    - Add indexes for foreign key columns to improve query performance
    - Addresses Supabase security advisor warnings about unindexed foreign keys

  2. Changes
    - Creates indexes for foreign key columns in multiple tables (first batch)
    - All indexes use IF NOT EXISTS to prevent errors on re-run

  3. Performance Impact
    - Significantly improves JOIN performance
    - Improves foreign key constraint checking performance
*/

-- assessment_notifications
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_recipient_id
  ON assessment_notifications(recipient_id);

-- business_strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by
  ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id
  ON business_strategies(owner_id);

-- career_development_plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id
  ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id
  ON career_development_plans(user_id);

-- career_external_qualifications
CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_user_id
  ON career_external_qualifications(user_id);

-- career_pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id
  ON career_pathways(user_id);

-- career_plan_milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id
  ON career_plan_milestones(career_plan_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id
  ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id
  ON career_plans(target_job_family_id);

-- career_quiz_responses
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id
  ON career_quiz_responses(user_id);

-- career_quiz_sessions
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_user_id
  ON career_quiz_sessions(user_id);

-- catchup_summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id
  ON catchup_summaries(employee_id);

-- competencies
CREATE INDEX IF NOT EXISTS idx_competencies_value_id
  ON competencies(value_id);

-- copilot_conversation_history
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id
  ON copilot_conversation_history(user_id);

-- department_skills_matrix
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_created_by
  ON department_skills_matrix(created_by);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_job_family_id
  ON department_skills_matrix(job_family_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_id_fkey
  ON department_skills_matrix(skill_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_type_id_fkey
  ON department_skills_matrix(skill_type_id);

-- department_strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_creator_id
  ON department_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_focus_area_id
  ON department_strategies(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_parent_strategy_id
  ON department_strategies(parent_strategy_id);

-- department_strategy_actions
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_assigned_to
  ON department_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_department_strategy_id
  ON department_strategy_actions(department_strategy_id);

-- department_strategy_approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_approver_id
  ON department_strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_department_strategy_id
  ON department_strategy_approvals(department_strategy_id);

-- department_strategy_kpis
CREATE INDEX IF NOT EXISTS idx_department_strategy_kpis_department_strategy_id
  ON department_strategy_kpis(department_strategy_id);

-- employee_skill_assessments
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_employee_id_fkey
  ON employee_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_skill_id_fkey
  ON employee_skill_assessments(skill_id);

-- employee_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_employee_id_fkey
  ON employee_skills_assessment_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_matrix_id
  ON employee_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_skill_id_fkey
  ON employee_skills_assessment_responses(skill_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id
  ON goals(user_id);

-- job_family_competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id
  ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id
  ON job_family_competencies(required_level_id);

-- job_history
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by
  ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id
  ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id_fkey
  ON job_history(user_id);
