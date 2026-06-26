/*
  # Add Missing Foreign Key Indexes - Part 3

  1. Changes
    - Complete adding indexes for foreign keys
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Review template questions
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section ON review_template_questions(section_id);

-- Review template sections
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template ON review_template_sections(template_id);

-- Review weekly checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee ON review_weekly_checkins(employee_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manager_id ON reviews(manager_id);

-- Skill assessments
CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill_id ON skill_assessments(skill_id);

-- Training attendees
CREATE INDEX IF NOT EXISTS idx_training_attendees_session ON training_attendees(training_session_id);

-- Training completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- Training module job family links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family ON training_module_job_family_links(job_family_id);

-- Training modules
CREATE INDEX IF NOT EXISTS idx_training_modules_course_id ON training_modules(course_id);

-- User access levels
CREATE INDEX IF NOT EXISTS idx_user_access_levels_assigned_by ON user_access_levels(assigned_by);

-- View as sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id ON view_as_sessions(admin_id);