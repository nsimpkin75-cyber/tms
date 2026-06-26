/*
  # Create Review Form Templates System

  1. New Tables
    - `review_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - What this template is for
      - `template_type` (text) - Type: performance_review, 1to1, probation, etc.
      - `is_active` (boolean) - Whether this template is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `review_template_sections`
      - `id` (uuid, primary key)
      - `template_id` (uuid) - References review_templates
      - `title` (text) - Section title
      - `description` (text) - Section description/instructions
      - `sort_order` (integer) - Order of sections
      - `created_at` (timestamptz)

    - `review_template_questions`
      - `id` (uuid, primary key)
      - `section_id` (uuid) - References review_template_sections
      - `question_text` (text) - The actual question
      - `question_type` (text) - rating, text, textarea, multiple_choice, etc.
      - `options` (jsonb) - For multiple choice, rating scales, etc.
      - `is_required` (boolean) - Whether answer is required
      - `sort_order` (integer) - Order of questions within section
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Only admins can manage templates
    - All authenticated users can view active templates

  3. Important Notes
    - Templates define the structure of review forms
    - Each template can have multiple sections
    - Each section can have multiple questions
    - Questions can be of different types (rating, text, etc.)
*/

-- Create review_templates table
CREATE TABLE IF NOT EXISTS review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  template_type text NOT NULL DEFAULT 'performance_review',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

-- Create review_template_sections table
CREATE TABLE IF NOT EXISTS review_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_sections ENABLE ROW LEVEL SECURITY;

-- Create review_template_questions table
CREATE TABLE IF NOT EXISTS review_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES review_template_sections(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '{}'::jsonb,
  is_required boolean DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_template_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_templates

-- Authenticated users can view active templates
CREATE POLICY "Users can view active review templates"
  ON review_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can insert templates
CREATE POLICY "Admins can create review templates"
  ON review_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update templates
CREATE POLICY "Admins can update review templates"
  ON review_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete review templates"
  ON review_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for review_template_sections

-- Users can view sections of active templates
CREATE POLICY "Users can view sections of active templates"
  ON review_template_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_templates
      WHERE review_templates.id = review_template_sections.template_id
      AND (review_templates.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage sections
CREATE POLICY "Admins can create sections"
  ON review_template_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sections"
  ON review_template_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sections"
  ON review_template_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for review_template_questions

-- Users can view questions of active templates
CREATE POLICY "Users can view questions of active templates"
  ON review_template_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_template_sections
      JOIN review_templates ON review_templates.id = review_template_sections.template_id
      WHERE review_template_sections.id = review_template_questions.section_id
      AND (review_templates.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage questions
CREATE POLICY "Admins can create questions"
  ON review_template_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update questions"
  ON review_template_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete questions"
  ON review_template_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_templates_active ON review_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template ON review_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_order ON review_template_sections(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section ON review_template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_review_template_questions_order ON review_template_questions(section_id, sort_order);

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_review_templates_updated_at
  BEFORE UPDATE ON review_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default template
INSERT INTO review_templates (name, description, template_type, is_active) VALUES
(
  'Standard Performance Review',
  'Standard annual or bi-annual performance review template with goal setting and competency assessment',
  'performance_review',
  true
) ON CONFLICT DO NOTHING;

-- Get the template ID and insert sections and questions
DO $$
DECLARE
  template_id uuid;
  section_performance uuid;
  section_goals uuid;
  section_development uuid;
  section_feedback uuid;
BEGIN
  -- Get the template ID
  SELECT id INTO template_id FROM review_templates WHERE name = 'Standard Performance Review' LIMIT 1;
  
  IF template_id IS NOT NULL THEN
    -- Create sections
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Performance & Achievements', 'Review performance over the review period', 1)
    RETURNING id INTO section_performance;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Goals & Objectives', 'Discuss progress on previous goals and set new objectives', 2)
    RETURNING id INTO section_goals;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Development & Growth', 'Identify development areas and growth opportunities', 3)
    RETURNING id INTO section_development;
    
    INSERT INTO review_template_sections (template_id, title, description, sort_order)
    VALUES 
      (template_id, 'Overall Feedback', 'Provide summary feedback and rating', 4)
    RETURNING id INTO section_feedback;
    
    -- Add questions to Performance section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_performance, 'What were the key achievements during this review period?', 'textarea', '{}', true, 1),
      (section_performance, 'How well did the employee meet their job responsibilities?', 'rating', '{"min": 1, "max": 5, "labels": ["Below Expectations", "Meets Some Expectations", "Meets Expectations", "Exceeds Expectations", "Outstanding"]}', true, 2),
      (section_performance, 'What challenges did the employee face and how did they handle them?', 'textarea', '{}', true, 3);
    
    -- Add questions to Goals section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_goals, 'Were previous goals achieved? Please explain.', 'textarea', '{}', true, 1),
      (section_goals, 'What are the key goals for the next review period?', 'textarea', '{}', true, 2);
    
    -- Add questions to Development section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_development, 'What skills would benefit from further development?', 'textarea', '{}', true, 1),
      (section_development, 'What training or resources would support growth?', 'textarea', '{}', true, 2),
      (section_development, 'What are the career aspirations and how can we support them?', 'textarea', '{}', false, 3);
    
    -- Add questions to Feedback section
    INSERT INTO review_template_questions (section_id, question_text, question_type, options, is_required, sort_order)
    VALUES 
      (section_feedback, 'Overall Performance Rating', 'rating', '{"min": 1, "max": 5, "labels": ["Needs Improvement", "Developing", "Competent", "Proficient", "Expert"]}', true, 1),
      (section_feedback, 'Additional comments or feedback', 'textarea', '{}', false, 2);
  END IF;
END $$;
