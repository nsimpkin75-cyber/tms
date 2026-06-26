/*
  # Create Copilot Configuration System

  1. New Tables
    - `copilot_config`
      - `id` (uuid, primary key)
      - `system_prompt` (text) - Custom system prompt for the copilot
      - `model_name` (text) - LLM model to use (e.g., gpt-4, claude-3)
      - `temperature` (numeric) - Temperature setting for responses
      - `max_tokens` (integer) - Maximum tokens for responses
      - `top_p` (numeric) - Top-p sampling parameter
      - `frequency_penalty` (numeric) - Frequency penalty parameter
      - `presence_penalty` (numeric) - Presence penalty parameter
      - `knowledge_base` (text) - Additional knowledge/context for the copilot
      - `is_active` (boolean) - Whether this config is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `copilot_functions`
      - `id` (uuid, primary key)
      - `name` (text) - Function name (e.g., join_training_course)
      - `display_name` (text) - Human-readable name
      - `description` (text) - What the function does
      - `parameters_schema` (jsonb) - JSON schema for parameters
      - `is_enabled` (boolean) - Whether this function is available
      - `category` (text) - training, career, reviews, etc.
      - `created_at` (timestamptz)

    - `copilot_conversation_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User having the conversation
      - `role` (text) - user, assistant, system
      - `content` (text) - Message content
      - `function_call` (jsonb) - If a function was called
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Only admins can modify copilot configuration
    - Only admins can manage functions
    - Users can only view their own conversation history

  3. Important Notes
    - Only one config should be active at a time
    - Functions are defined to allow the copilot to take actions in the app
    - Conversation history helps maintain context across sessions
*/

-- Create copilot_config table
CREATE TABLE IF NOT EXISTS copilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT 'You are a helpful career development assistant at Epos Now. You help employees with their career pathways, training recommendations, and performance reviews.',
  model_name text NOT NULL DEFAULT 'gpt-4',
  temperature numeric DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 1000 CHECK (max_tokens > 0),
  top_p numeric DEFAULT 1.0 CHECK (top_p >= 0 AND top_p <= 1),
  frequency_penalty numeric DEFAULT 0 CHECK (frequency_penalty >= -2 AND frequency_penalty <= 2),
  presence_penalty numeric DEFAULT 0 CHECK (presence_penalty >= -2 AND presence_penalty <= 2),
  knowledge_base text DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_config ENABLE ROW LEVEL SECURITY;

-- Create copilot_functions table
CREATE TABLE IF NOT EXISTS copilot_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL,
  parameters_schema jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_functions ENABLE ROW LEVEL SECURITY;

-- Create copilot_conversation_history table
CREATE TABLE IF NOT EXISTS copilot_conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content text NOT NULL,
  function_call jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copilot_config

-- Admins can view all configs
CREATE POLICY "Admins can view copilot configs"
  ON copilot_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert configs
CREATE POLICY "Admins can create copilot configs"
  ON copilot_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update configs
CREATE POLICY "Admins can update copilot configs"
  ON copilot_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete configs
CREATE POLICY "Admins can delete copilot configs"
  ON copilot_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for copilot_functions

-- Everyone can view enabled functions
CREATE POLICY "Users can view enabled copilot functions"
  ON copilot_functions FOR SELECT
  TO authenticated
  USING (is_enabled = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can insert functions
CREATE POLICY "Admins can create copilot functions"
  ON copilot_functions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update functions
CREATE POLICY "Admins can update copilot functions"
  ON copilot_functions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete functions
CREATE POLICY "Admins can delete copilot functions"
  ON copilot_functions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for copilot_conversation_history

-- Users can view their own conversation history
CREATE POLICY "Users can view own conversation history"
  ON copilot_conversation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY "Users can create own conversation messages"
  ON copilot_conversation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own conversation history
CREATE POLICY "Users can delete own conversation history"
  ON copilot_conversation_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_copilot_config_active ON copilot_config(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_copilot_functions_enabled ON copilot_functions(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_copilot_functions_category ON copilot_functions(category);
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_user ON copilot_conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_created ON copilot_conversation_history(created_at);

-- Insert default configuration
INSERT INTO copilot_config (
  system_prompt,
  model_name,
  temperature,
  max_tokens,
  knowledge_base,
  is_active
) VALUES (
  'You are the Epos Now Futures AI Copilot, a helpful career development assistant. You help employees at Epos Now with:

- Career pathway guidance and progression planning
- Training and development recommendations
- Performance review preparation and insights
- Skills gap analysis and development plans
- Job family information and requirements
- Strategic goal alignment

You have access to functions that can help employees take action directly from our conversation, such as enrolling in training courses or viewing their career pathways. Always be supportive, professional, and focused on helping employees grow in their careers at Epos Now.

When recommending actions, consider the employee''s current role, career aspirations, and available opportunities within the organization.',
  'gpt-4',
  0.7,
  2000,
  'Company Information:
- Epos Now is a leading point-of-sale and retail management solutions provider
- We value continuous learning and career development
- We have structured career pathways across multiple job families
- Training is available for both technical and soft skills
- Performance is reviewed regularly with managers

Available Career Pathways:
- Software Engineering: Entry → Mid → Senior → Lead → Principal
- Product Management: Associate → Product Manager → Senior PM → Director
- Sales: Representative → Senior Rep → Team Lead → Manager
- Customer Success: Support → Senior Support → Team Lead → Manager

Key Values:
1. Customer Focus
2. Innovation
3. Collaboration
4. Accountability
5. Growth Mindset',
  true
) ON CONFLICT DO NOTHING;

-- Insert default functions that the copilot can call
INSERT INTO copilot_functions (name, display_name, description, parameters_schema, category, is_enabled) VALUES
(
  'view_career_pathways',
  'View Career Pathways',
  'Shows the user available career pathways and progression options in their field or across the organization',
  '{"type": "object", "properties": {}}'::jsonb,
  'career',
  true
),
(
  'join_training_course',
  'Enroll in Training Course',
  'Enrolls the user in a specific training course',
  '{"type": "object", "properties": {"course_id": {"type": "string", "description": "The ID of the training course to join"}}, "required": ["course_id"]}'::jsonb,
  'training',
  true
),
(
  'view_available_training',
  'View Available Training',
  'Shows all available training courses and sessions',
  '{"type": "object", "properties": {"category": {"type": "string", "description": "Filter by training category (optional)", "enum": ["Upskill", "Soft Skill", "Pathway"]}}}'::jsonb,
  'training',
  true
),
(
  'view_my_reviews',
  'View My Reviews',
  'Shows the user their performance review history and upcoming reviews',
  '{"type": "object", "properties": {}}'::jsonb,
  'reviews',
  true
),
(
  'view_skill_gaps',
  'Analyze Skill Gaps',
  'Analyzes the user''s current skills versus their target role requirements',
  '{"type": "object", "properties": {"target_role": {"type": "string", "description": "The job family or role to compare against"}}}'::jsonb,
  'career',
  true
),
(
  'view_strategic_goals',
  'View Strategic Goals',
  'Shows strategic goals assigned to the user or their team',
  '{"type": "object", "properties": {}}'::jsonb,
  'roadmap',
  true
),
(
  'create_career_plan',
  'Create Career Plan',
  'Helps the user create a new career development plan',
  '{"type": "object", "properties": {"target_job_family_id": {"type": "string", "description": "The target job family/role ID"}}}'::jsonb,
  'career',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_copilot_config_updated_at
  BEFORE UPDATE ON copilot_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_copilot_functions_updated_at
  BEFORE UPDATE ON copilot_functions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
