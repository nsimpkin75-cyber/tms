/*
  # Fix Duplicate update_updated_at_column Functions

  1. Problem
    - Multiple versions of update_updated_at_column function exist
    - Causing schema errors

  2. Solution
    - Drop all existing versions (CASCADE removes dependent triggers)
    - Create single secure version with proper search_path
    - Recreate triggers for key tables

  3. Security
    - Sets search_path to empty to prevent manipulation attacks
    - Maintains SECURITY DEFINER for trigger execution
*/

-- Drop all existing versions of the function (CASCADE removes triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with secure configuration
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for main tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_cycles_updated_at
  BEFORE UPDATE ON review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_instances_updated_at
  BEFORE UPDATE ON review_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_courses_updated_at
  BEFORE UPDATE ON training_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_families_updated_at
  BEFORE UPDATE ON job_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategic_goals_updated_at
  BEFORE UPDATE ON strategic_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competency_frameworks_updated_at
  BEFORE UPDATE ON competency_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_plans_updated_at
  BEFORE UPDATE ON career_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_development_plans_updated_at
  BEFORE UPDATE ON skill_development_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
