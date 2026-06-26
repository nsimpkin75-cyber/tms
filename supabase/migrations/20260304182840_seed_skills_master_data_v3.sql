/*
  # Seed Skills Master Data v3

  1. Changes
    - Add sample skills to skills_master table with correct column names
    
  2. Notes
    - This provides initial data for the skills matrix system
*/

-- Insert sample skills using correct column names
INSERT INTO skills_master (id, name, skill_type_id, definition, is_active) VALUES
  -- Technical Skills
  ('b1111111-1111-1111-1111-111111111111', 'React Development', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Building user interfaces with React', true),
  ('b2222222-2222-2222-2222-222222222222', 'TypeScript', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Strong typing for JavaScript', true),
  ('b3333333-3333-3333-3333-333333333333', 'API Development', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Building RESTful APIs', true),
  ('b4444444-4444-4444-4444-444444444444', 'Database Design', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Designing database schemas', true),
  ('b5555555-5555-5555-5555-555555555555', 'Testing & QA', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Writing and running tests', true),
  
  -- Soft Skills
  ('c1111111-1111-1111-1111-111111111111', 'Communication', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Clear and effective communication', true),
  ('c2222222-2222-2222-2222-222222222222', 'Teamwork', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Collaborating effectively with others', true),
  ('c3333333-3333-3333-3333-333333333333', 'Problem Solving', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Analytical thinking and problem resolution', true),
  ('c4444444-4444-4444-4444-444444444444', 'Leadership', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Leading and mentoring others', true),
  ('c5555555-5555-5555-5555-555555555555', 'Time Management', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Managing time and priorities effectively', true),
  
  -- Product Knowledge
  ('d1111111-1111-1111-1111-111111111111', 'Product Strategy', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Understanding product vision and strategy', true),
  ('d2222222-2222-2222-2222-222222222222', 'User Research', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Conducting user research and analysis', true),
  ('d3333333-3333-3333-3333-333333333333', 'Market Analysis', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Analyzing market trends and competitors', true),
  ('d4444444-4444-4444-4444-444444444444', 'Feature Prioritization', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Prioritizing features and roadmap items', true),
  ('d5555555-5555-5555-5555-555555555555', 'Business Acumen', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Understanding business metrics and goals', true),
  
  -- Expert Knowledge
  ('e1111111-1111-1111-1111-111111111111', 'System Architecture', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'Designing scalable system architectures', true),
  ('e2222222-2222-2222-2222-222222222222', 'DevOps', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'CI/CD and infrastructure management', true),
  ('e3333333-3333-3333-3333-333333333333', 'Security', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'Application security and best practices', true)
ON CONFLICT (id) DO NOTHING;