/*
  # Remove Unused Indexes - Part 3

  1. Changes
    - Complete removing unused indexes
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove final batch of unused indexes
DROP INDEX IF EXISTS idx_user_access_levels_access_level;
DROP INDEX IF EXISTS idx_assessment_cycles_matrix;
DROP INDEX IF EXISTS idx_assessment_cycles_created_by;
DROP INDEX IF EXISTS idx_competencies_sort;
DROP INDEX IF EXISTS idx_skill_discrepancies_employee;
DROP INDEX IF EXISTS idx_skill_discrepancies_skill;
DROP INDEX IF EXISTS idx_skill_discrepancies_flagged;
DROP INDEX IF EXISTS idx_skill_dev_actions_employee;
DROP INDEX IF EXISTS idx_skill_dev_actions_skill;
DROP INDEX IF EXISTS idx_skill_dev_actions_status;
DROP INDEX IF EXISTS idx_scheduled_meetings_cycle;
DROP INDEX IF EXISTS idx_scheduled_meetings_manager;
DROP INDEX IF EXISTS idx_scheduled_meetings_employee;