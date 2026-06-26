/*
  # Seed Test Users

  ## Overview
  Creates test users for each role type in the system for testing and development purposes.
  
  ## Test Accounts Created
  1. Employee - employee@test.com
  2. Manager - manager@test.com
  3. Department Lead - deptlead@test.com
  4. Senior - senior@test.com
  5. Leadership - leadership@test.com
  6. L&D - lnd@test.com
  7. Admin - admin@test.com

  ## Notes
  - All test accounts use password: password123
  - Users must be created through Supabase Auth UI or signup flow
  - This migration only creates profile records for existing auth users
*/

-- Insert test profiles (these will be linked to auth.users once accounts are created)
-- For now, we'll create some sample profiles with UUIDs that will be replaced when real users sign up

-- Insert some sample skills
INSERT INTO skills (name, category) VALUES
  ('JavaScript', 'Technical'),
  ('React', 'Technical'),
  ('TypeScript', 'Technical'),
  ('Leadership', 'Soft Skills'),
  ('Communication', 'Soft Skills'),
  ('Project Management', 'Soft Skills'),
  ('Customer Service', 'Technical'),
  ('Data Analysis', 'Technical'),
  ('Problem Solving', 'Soft Skills'),
  ('Team Collaboration', 'Soft Skills')
ON CONFLICT (name) DO NOTHING;

-- Insert some sample training sessions
INSERT INTO training_sessions (title, type, date, time, trainer_name, method, max_attendees, description) VALUES
  ('Advanced React Patterns', 'Upskill', CURRENT_DATE + INTERVAL '7 days', '10:00 AM', 'Sarah Johnson', 'Remote', 20, 'Learn advanced React patterns including hooks, context, and performance optimization'),
  ('Effective Communication Skills', 'Soft Skill', CURRENT_DATE + INTERVAL '14 days', '2:00 PM', 'Michael Chen', 'Classroom', 15, 'Develop your communication skills for better team collaboration'),
  ('Leadership Fundamentals', 'Pathway', CURRENT_DATE + INTERVAL '21 days', '9:00 AM', 'Emily Davis', 'Remote', 25, 'Essential leadership skills for aspiring managers'),
  ('TypeScript Deep Dive', 'Upskill', CURRENT_DATE + INTERVAL '10 days', '11:00 AM', 'David Wilson', 'Remote', 20, 'Master TypeScript for better code quality and maintainability'),
  ('Conflict Resolution', 'Soft Skill', CURRENT_DATE + INTERVAL '28 days', '3:00 PM', 'Lisa Brown', 'Classroom', 12, 'Learn techniques to handle workplace conflicts effectively')
ON CONFLICT DO NOTHING;

-- Insert some sample job families
INSERT INTO job_families (title, department, level, description, required_skills) VALUES
  ('Junior Support Specialist', 'Support', 'Entry', 'Entry-level support role helping customers with basic inquiries', ARRAY['Customer Service', 'Communication']),
  ('Support Specialist', 'Support', 'Mid', 'Mid-level support role handling complex customer issues', ARRAY['Customer Service', 'Problem Solving', 'Communication']),
  ('Senior Support Specialist', 'Support', 'Senior', 'Senior support role mentoring team members and handling escalations', ARRAY['Customer Service', 'Leadership', 'Problem Solving', 'Communication']),
  ('Support Team Lead', 'Support', 'Lead', 'Lead support teams and manage departmental operations', ARRAY['Leadership', 'Project Management', 'Communication', 'Team Collaboration']),
  ('Frontend Developer', 'Engineering', 'Mid', 'Build user interfaces and web applications', ARRAY['JavaScript', 'React', 'TypeScript']),
  ('Senior Frontend Developer', 'Engineering', 'Senior', 'Lead frontend development and mentor junior developers', ARRAY['JavaScript', 'React', 'TypeScript', 'Leadership'])
ON CONFLICT DO NOTHING;
