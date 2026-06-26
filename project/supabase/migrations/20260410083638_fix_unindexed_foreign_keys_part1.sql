/*
  # Fix unindexed foreign keys - Part 1

  Adds covering indexes for foreign key columns that were missing indexes.
  Tables: assessment_cycles, career_plans, competencies, goal_actions,
          job_history, matrix_assignments, matrix_skills, moderation tables,
          one_to_one tables
*/

-- assessment_cycles
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_created_by ON public.assessment_cycles(created_by);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_matrix_id ON public.assessment_cycles(matrix_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_profile_id ON public.career_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON public.career_plans(target_job_family_id);

-- competencies
CREATE INDEX IF NOT EXISTS idx_competencies_value_id ON public.competencies(value_id);

-- goal_actions
CREATE INDEX IF NOT EXISTS idx_goal_actions_assigned_to ON public.goal_actions(assigned_to);

-- job_history
CREATE INDEX IF NOT EXISTS idx_job_history_profile_id ON public.job_history(profile_id);

-- matrix_assignments
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_employee_id ON public.matrix_assignments(employee_id);

-- matrix_skills
CREATE INDEX IF NOT EXISTS idx_matrix_skills_matrix_id ON public.matrix_skills(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_skills_skill_id ON public.matrix_skills(skill_id);

-- moderation_case_decisions
CREATE INDEX IF NOT EXISTS idx_moderation_case_decisions_decided_by ON public.moderation_case_decisions(decided_by);

-- moderation_workflow_configs
CREATE INDEX IF NOT EXISTS idx_moderation_workflow_configs_created_by ON public.moderation_workflow_configs(created_by);

-- one_to_one_action_items
CREATE INDEX IF NOT EXISTS idx_oto_action_items_meeting_id ON public.one_to_one_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_oto_action_items_owner_id ON public.one_to_one_action_items(owner_id);

-- one_to_one_meetings
CREATE INDEX IF NOT EXISTS idx_oto_meetings_employee_id ON public.one_to_one_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_oto_meetings_manager_id ON public.one_to_one_meetings(manager_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_oto_monthly_reviews_manager_id ON public.one_to_one_monthly_reviews(manager_id);

-- one_to_one_notes
CREATE INDEX IF NOT EXISTS idx_oto_notes_created_by ON public.one_to_one_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_oto_notes_meeting_id ON public.one_to_one_notes(meeting_id);

-- one_to_one_scheduled_meetings
CREATE INDEX IF NOT EXISTS idx_oto_scheduled_meetings_employee_id ON public.one_to_one_scheduled_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_oto_scheduled_meetings_manager_id ON public.one_to_one_scheduled_meetings(manager_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_oto_weekly_checkins_manager_id ON public.one_to_one_weekly_checkins(manager_id);
