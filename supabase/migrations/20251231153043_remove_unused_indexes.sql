/*
  # Remove Unused Indexes

  ## Overview
  This migration removes indexes that have not been used, which helps improve:
  - Write performance (INSERT, UPDATE, DELETE operations)
  - Storage efficiency
  - Maintenance overhead

  ## Indexes Removed
  
  ### Department Strategies
  - `idx_dept_strategies_business_strategy` - Unused
  - `idx_dept_strategies_department` - Unused
  - `idx_dept_strategies_approval` - Unused
  
  ### Strategy Actions
  - `idx_strategy_actions_dept_strategy` - Unused
  - `idx_strategy_actions_assigned` - Unused
  - `idx_strategy_actions_status` - Unused
  
  ### Standalone Department Strategies
  - `idx_standalone_dept_strategies_dept` - Unused
  
  ### Standalone Strategy Actions
  - `idx_standalone_actions_strategy` - Unused
  - `idx_standalone_actions_assigned` - Unused
  
  ### Goal Milestones
  - `idx_goal_milestones_goal` - Unused
  - `idx_goal_milestones_assigned_to` - Unused
  - `idx_goal_milestones_sort_order` - Unused
  
  ### Job Titles
  - `idx_job_titles_active` - Unused
  
  ### Job Families
  - `idx_job_families_job_title` - Unused
  
  ### Profiles
  - `idx_profiles_job_title` - Unused (job_title field no longer primary identifier)
  - `idx_profiles_active` - Unused

  ## Important Notes
  - Foreign key indexes were KEPT (added in previous migration)
  - Only truly unused indexes are being removed
  - These can be recreated if query patterns change in the future
*/

-- Department Strategies
DROP INDEX IF EXISTS idx_dept_strategies_business_strategy;
DROP INDEX IF EXISTS idx_dept_strategies_department;
DROP INDEX IF EXISTS idx_dept_strategies_approval;

-- Strategy Actions
DROP INDEX IF EXISTS idx_strategy_actions_dept_strategy;
DROP INDEX IF EXISTS idx_strategy_actions_assigned;
DROP INDEX IF EXISTS idx_strategy_actions_status;

-- Standalone Department Strategies
DROP INDEX IF EXISTS idx_standalone_dept_strategies_dept;

-- Standalone Strategy Actions
DROP INDEX IF EXISTS idx_standalone_actions_strategy;
DROP INDEX IF EXISTS idx_standalone_actions_assigned;

-- Goal Milestones
DROP INDEX IF EXISTS idx_goal_milestones_goal;
DROP INDEX IF EXISTS idx_goal_milestones_assigned_to;
DROP INDEX IF EXISTS idx_goal_milestones_sort_order;

-- Job Titles
DROP INDEX IF EXISTS idx_job_titles_active;

-- Job Families
DROP INDEX IF EXISTS idx_job_families_job_title;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_job_title;
DROP INDEX IF EXISTS idx_profiles_active;