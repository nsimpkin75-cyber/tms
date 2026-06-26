/*
  # Add Missing Foreign Key Indexes - Part 1

  1. Changes
    - Add indexes for foreign keys that are missing covering indexes
    - This improves query performance for joins and foreign key lookups
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Action items
CREATE INDEX IF NOT EXISTS idx_action_items_owner_id ON action_items(owner_id);

-- Career pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_from_job_family ON career_pathways(from_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_to_job_family ON career_pathways(to_job_family_id);

-- Career plan milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan_id ON career_plan_milestones(plan_id);

-- Competency categories
CREATE INDEX IF NOT EXISTS idx_competency_categories_framework ON competency_categories(framework_id);

-- Cycle actions
CREATE INDEX IF NOT EXISTS idx_cycle_actions_cycle_id ON cycle_actions(cycle_id);

-- Cycle KPIs
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle_id ON cycle_kpis(cycle_id);

-- Goal actions
CREATE INDEX IF NOT EXISTS idx_goal_actions_goal_id ON goal_actions(goal_id);

-- Goal departments
CREATE INDEX IF NOT EXISTS idx_goal_departments_goal_id ON goal_departments(goal_id);

-- Goal KPIs
CREATE INDEX IF NOT EXISTS idx_goal_kpis_goal_id ON goal_kpis(goal_id);

-- Module content items
CREATE INDEX IF NOT EXISTS idx_module_content_items_module_id ON module_content_items(module_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);