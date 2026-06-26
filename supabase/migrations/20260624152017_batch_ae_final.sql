-- Batch AE (Final): Organisation Settings and Core Auth System
-- Org settings, auth functions, admin support tables

CREATE TABLE IF NOT EXISTS organisation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text DEFAULT 'en-GB' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read organisation settings" ON organisation_settings;
CREATE POLICY "Authenticated users can read organisation settings"
  ON organisation_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can update organisation settings" ON organisation_settings;
CREATE POLICY "Admins can update organisation settings"
  ON organisation_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert organisation settings" ON organisation_settings;
CREATE POLICY "Admins can insert organisation settings"
  ON organisation_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

INSERT INTO organisation_settings (language)
SELECT 'en-GB' WHERE NOT EXISTS (SELECT 1 FROM organisation_settings);

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_organisation_settings_updated_at()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS organisation_settings_updated_at ON organisation_settings;
CREATE TRIGGER organisation_settings_updated_at BEFORE UPDATE ON organisation_settings FOR EACH ROW
EXECUTE FUNCTION update_organisation_settings_updated_at();

-- Create is_admin functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin'); END; $$;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin'); END; $$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated, anon;

-- Create handle_new_user function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
SECURITY DEFINER SET search_path = public, auth LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
          COALESCE(NEW.raw_user_meta_data->>'role', 'employee'), COALESCE(NEW.raw_user_meta_data->>'department', 'General'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Create admin support tables
CREATE TABLE IF NOT EXISTS user_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_name text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);

ALTER TABLE user_admin_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view permissions" ON user_admin_permissions;
CREATE POLICY "Admins can view permissions" ON user_admin_permissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage permissions" ON user_admin_permissions;
CREATE POLICY "Admins can manage permissions" ON user_admin_permissions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TABLE IF NOT EXISTS view_as_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE view_as_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own sessions" ON view_as_sessions;
CREATE POLICY "Admins can view own sessions" ON view_as_sessions FOR SELECT TO authenticated USING (admin_id = auth.uid());
DROP POLICY IF EXISTS "Admins can create sessions" ON view_as_sessions;
CREATE POLICY "Admins can create sessions" ON view_as_sessions FOR INSERT TO authenticated
WITH CHECK (admin_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins can update own sessions" ON view_as_sessions;
CREATE POLICY "Admins can update own sessions" ON view_as_sessions FOR UPDATE TO authenticated
USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());

CREATE OR REPLACE FUNCTION get_active_view_as_session(admin_user_id uuid)
RETURNS TABLE (session_id uuid, target_user_id uuid, target_email text, target_name text, started_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT vas.id, vas.target_user_id, p.email, p.full_name, vas.started_at
  FROM view_as_sessions vas JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC LIMIT 1;
END; $$;

CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_user_id ON user_admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id ON view_as_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_active ON view_as_sessions(admin_id, ended_at) WHERE ended_at IS NULL;

-- Add admin_type column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_type text CHECK (admin_type IN ('full_admin', 'job_families_admin', 'people_admin', 'super_admin', 'hr_admin', 'department_admin'));

UPDATE profiles SET admin_type = 'full_admin', role = 'admin' 
WHERE email IN ('nicola.hurcombe@eposnow.com', 'nicola@example.com', 'admin@example.com');
