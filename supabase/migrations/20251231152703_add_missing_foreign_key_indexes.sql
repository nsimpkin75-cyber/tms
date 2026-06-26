/*
  # Add Missing Foreign Key Indexes for Performance

  ## Overview
  This migration adds indexes for all foreign key columns that are currently unindexed.
  Foreign key indexes are critical for query performance, especially for JOIN operations
  and CASCADE delete/update operations.

  ## Tables and Indexes Added
  
  ### Business Strategy System
  - `idx_business_strategies_created_by` on business_strategies(created_by)
  - `idx_business_strategies_owner_id` on business_strategies(owner_id)
  
  ### Career Development
  - `idx_career_development_plans_manager_id` on career_development_plans(manager_id)
  - `idx_career_development_plans_user_id` on career_development_plans(user_id)
  - `idx_career_pathways_user_id` on career_pathways(user_id)
  - `idx_career_plan_milestones_career_plan_id` on career_plan_milestones(career_plan_id)
  - `idx_career_plans_current_job_family_id` on career_plans(current_job_family_id)
  - `idx_career_plans_target_job_family_id` on career_plans(target_job_family_id)
  
  ### Career & Training
  - `idx_career_quiz_responses_user_id` on career_quiz_responses(user_id)
  - `idx_catchup_summaries_employee_id` on catchup_summaries(employee_id)
  - `idx_copilot_conversation_history_user_id` on copilot_conversation_history(user_id)
  
  ### Department Strategies
  - `idx_department_strategies_approved_by` on department_strategies(approved_by)
  - `idx_department_strategies_owner_id` on department_strategies(owner_id)
  
  ### Goals & Job Management
  - `idx_goals_user_id` on goals(user_id)
  - `idx_job_family_competencies_competency_id` on job_family_competencies(competency_id)
  - `idx_job_family_competencies_required_level_id` on job_family_competencies(required_level_id)
  - `idx_job_history_changed_by` on job_history(changed_by)
  - `idx_job_history_job_family_id` on job_history(job_family_id)
  - `idx_job_history_user_id` on job_history(user_id)
  
  ### One-to-One Goals
  - `idx_one_to_one_goals_cdp_id` on one_to_one_goals(cdp_id)
  - `idx_one_to_one_goals_created_by` on one_to_one_goals(created_by)
  - `idx_one_to_one_goals_user_id` on one_to_one_goals(user_id)
  
  ### Profiles & Skills
  - `idx_profile_skills_skill_id` on profile_skills(skill_id)
  - `idx_profiles_job_family_id` on profiles(job_family_id)
  - `idx_profiles_manager_id` on profiles(manager_id)
  
  ### Reviews
  - `idx_reviews_reviewer_id` on reviews(reviewer_id)
  
  ### Strategic Management
  - `idx_standalone_dept_strategies_owner_id` on standalone_department_strategies(owner_id)
  - `idx_strategic_goals_assigned_by_id` on strategic_goals(assigned_by_id)
  - `idx_strategic_goals_assigned_to_id` on strategic_goals(assigned_to_id)
  - `idx_strategic_goals_parent_goal_id` on strategic_goals(parent_goal_id)
  - `idx_strategic_goals_roadmap_id` on strategic_goals(roadmap_id)
  - `idx_strategic_roadmaps_owner_id` on strategic_roadmaps(owner_id)
  - `idx_strategy_actions_created_by` on strategy_actions(created_by)
  
  ### System & Training
  - `idx_system_settings_updated_by` on system_settings(updated_by)
  - `idx_training_attendees_training_session_id` on training_attendees(training_session_id)
  - `idx_training_completions_course_id` on training_completions(course_id)
  - `idx_training_module_links_job_family_id` on training_module_links(job_family_id)
  
  ### User Management
  - `idx_user_cvs_user_id` on user_cvs(user_id)
  - `idx_weekly_catchups_employee_id` on weekly_catchups(employee_id)
  - `idx_weekly_catchups_manager_id` on weekly_catchups(manager_id)

  ## Performance Impact
  These indexes will significantly improve:
  - JOIN operation performance
  - Foreign key constraint checking
  - CASCADE operations (delete/update)
  - Query filtering on foreign key columns
*/

-- Business Strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id ON business_strategies(owner_id);

-- Career Development Plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id ON career_development_plans(user_id);

-- Career Pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id ON career_pathways(user_id);

-- Career Plan Milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id ON career_plan_milestones(career_plan_id);

-- Career Plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON career_plans(target_job_family_id);

-- Career Quiz
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);

-- Catchup Summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id ON catchup_summaries(employee_id);

-- Copilot
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id ON copilot_conversation_history(user_id);

-- Department Strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_approved_by ON department_strategies(approved_by);
CREATE INDEX IF NOT EXISTS idx_department_strategies_owner_id ON department_strategies(owner_id);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Job Family Competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id ON job_family_competencies(required_level_id);

-- Job History
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);

-- One-to-One Goals
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_created_by ON one_to_one_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);

-- Profile Skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON profile_skills(skill_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Standalone Department Strategies
CREATE INDEX IF NOT EXISTS idx_standalone_dept_strategies_owner_id ON standalone_department_strategies(owner_id);

-- Strategic Goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_by_id ON strategic_goals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to_id ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent_goal_id ON strategic_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_roadmap_id ON strategic_goals(roadmap_id);

-- Strategic Roadmaps
CREATE INDEX IF NOT EXISTS idx_strategic_roadmaps_owner_id ON strategic_roadmaps(owner_id);

-- Strategy Actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_created_by ON strategy_actions(created_by);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

-- Training Attendees
CREATE INDEX IF NOT EXISTS idx_training_attendees_training_session_id ON training_attendees(training_session_id);

-- Training Completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- Training Module Links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id ON training_module_links(job_family_id);

-- User CVs
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);

-- Weekly Catchups
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee_id ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager_id ON weekly_catchups(manager_id);