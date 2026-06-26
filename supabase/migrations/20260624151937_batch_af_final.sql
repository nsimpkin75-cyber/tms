-- Batch AF (Final): Skills Matrix and Test Admin
-- Skill Types, Categories, Matrices

CREATE TABLE IF NOT EXISTS skill_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view skill types" ON skill_types;
CREATE POLICY "Anyone can view skill types" ON skill_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage skill types" ON skill_types;
CREATE POLICY "Admins can manage skill types" ON skill_types FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

INSERT INTO skill_types (name, sort_order) VALUES
  ('Product Knowledge', 1), ('Expert Knowledge', 2), ('Technical Skills', 3), ('Soft Skills', 4), ('Other', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON skill_categories;
CREATE POLICY "Anyone can view categories" ON skill_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON skill_categories;
CREATE POLICY "Admins can manage categories" ON skill_categories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS skills_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type_id uuid REFERENCES skill_types(id),
  category_id uuid REFERENCES skill_categories(id),
  definition text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view skills" ON skills_master;
CREATE POLICY "Anyone can view skills" ON skills_master FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage skills" ON skills_master;
CREATE POLICY "Admins can manage skills" ON skills_master FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS skills_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  job_title text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills_matrices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view matrices" ON skills_matrices;
CREATE POLICY "Anyone can view matrices" ON skills_matrices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage matrices" ON skills_matrices;
CREATE POLICY "Admins can manage matrices" ON skills_matrices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS matrix_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills_master(id),
  proficiency_level integer CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matrix_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view matrix skills" ON matrix_skills;
CREATE POLICY "Anyone can view matrix skills" ON matrix_skills FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage matrix skills" ON matrix_skills;
CREATE POLICY "Admins can manage matrix skills" ON matrix_skills FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS matrix_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matrix_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignments" ON matrix_assignments;
CREATE POLICY "Users can view own assignments" ON matrix_assignments FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "Admins can manage assignments" ON matrix_assignments;
CREATE POLICY "Admins can manage assignments" ON matrix_assignments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS skill_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills_master(id),
  current_level integer CHECK (current_level >= 1 AND current_level <= 5),
  target_level integer CHECK (target_level >= 1 AND target_level <= 5),
  rated_by uuid REFERENCES profiles(id),
  rating_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ratings" ON skill_ratings;
CREATE POLICY "Users can view own ratings" ON skill_ratings FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "Managers can view team ratings" ON skill_ratings;
CREATE POLICY "Managers can view team ratings" ON skill_ratings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')));
DROP POLICY IF EXISTS "Admins can manage all ratings" ON skill_ratings;
CREATE POLICY "Admins can manage all ratings" ON skill_ratings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE TABLE IF NOT EXISTS assessment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view cycles" ON assessment_cycles;
CREATE POLICY "Anyone can view cycles" ON assessment_cycles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage cycles" ON assessment_cycles;
CREATE POLICY "Admins can manage cycles" ON assessment_cycles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_skills_master_type ON skills_master(type_id);
CREATE INDEX IF NOT EXISTS idx_skills_master_category ON skills_master(category_id);
CREATE INDEX IF NOT EXISTS idx_matrix_skills_matrix ON matrix_skills(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_skills_skill ON matrix_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_matrix ON matrix_assignments(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_profile ON matrix_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_profile ON skill_ratings(profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill ON skill_ratings(skill_id);

-- Create Test Admin Account
DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_password text := 'Admin123!';
BEGIN
  DELETE FROM public.profiles WHERE email IN ('admin@test.com', 'test@admin.com');
  DELETE FROM auth.identities WHERE provider_id IN (
    SELECT id::text FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com')
  );
  DELETE FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com');

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, v_admin_id, 'authenticated', 'authenticated',
    'test@admin.com', crypt(v_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Admin"}'::jsonb, NOW(), NOW(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_admin_id::text, v_admin_id,
    format('{"sub":"%s","email":"test@admin.com","email_verified":true,"phone_verified":false}', v_admin_id)::jsonb,
    'email', NOW(), NOW(), NOW()
  );

  INSERT INTO public.profiles (id, email, full_name, role, admin_type, department, tenure)
  VALUES (v_admin_id, 'test@admin.com', 'Test Admin', 'admin', 'full_admin', 'IT', 1)
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin', admin_type = 'full_admin', department = 'IT', tenure = 1;
END $$;
