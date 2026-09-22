/*
# Compliance & Competency Engine — Database Schema

## Overview
Transforms the existing Skills Matrix into a dynamic, role-based Compliance and Competency Engine
tailored for social housing and landlord regulatory requirements (Housing Ombudsman, Consumer
Standards, Building Safety Act, and professional competency frameworks).

## New Tables

1. **compliance_items** — Master list of compliance certificates and competencies
   - `id` (uuid PK)
   - `name` (text) — e.g. "Asbestos Awareness", "Gas Safety", "Vulnerable Tenant Communication"
   - `description` (text)
   - `item_type` (enum: 'compliance' | 'competency') — regulatory compliance vs job-role competency
   - `requirement_type` (enum: 'mandatory' | 'essential' | 'optional') — Mandatory=Legal/Regulatory, Essential=Role-Specific, Optional=Professional Development
   - `regulatory_body` (text, nullable) — e.g. "Housing Ombudsman", "Building Safety Act"
   - `evidence_required` (boolean, default true) — whether documentary evidence must be uploaded
   - `expiry_months` (integer, nullable) — null = no expiry; 12 = annual; 24 = biannual
   - `renewal_cycle` (text, nullable) — "annual", "biannual", "none"
   - `sort_order` (integer, default 0)
   - `is_active` (boolean, default true)
   - `created_by` (uuid, references auth.users)
   - `created_at`, `updated_at` (timestamps)

2. **compliance_role_requirements** — Maps compliance items to job roles
   - `id` (uuid PK)
   - `compliance_item_id` (uuid FK → compliance_items)
   - `job_family_id` (uuid FK → job_families)
   - `requirement_type` (enum: 'mandatory' | 'essential' | 'optional') — overrides item-level if needed
   - `is_active` (boolean, default true)
   - `created_by`, `created_at`
   - UNIQUE(compliance_item_id, job_family_id)

3. **compliance_records** — Employee evidence/verification records
   - `id` (uuid PK)
   - `profile_id` (uuid FK → profiles) — the employee
   - `compliance_item_id` (uuid FK → compliance_items)
   - `status` (enum: 'compliant' | 'expiring_soon' | 'non_compliant' | 'pending_verification' | 'not_started')
   - `evidence_file_path` (text, nullable) — uploaded file path in Supabase Storage
   - `evidence_file_name` (text, nullable)
   - `completion_date` (date, nullable) — when the training/cert was completed
   - `expiry_date` (date, nullable) — calculated from completion_date + expiry_months
   - `self_assessment_rating` (integer, nullable, 1-4) — 1=Foundational, 4=Expert
   - `manager_verified` (boolean, default false)
   - `manager_verified_by` (uuid, nullable, references auth.users)
   - `manager_verified_at` (timestamptz, nullable)
   - `manager_notes` (text, nullable)
   - `reminder_sent_at` (timestamptz, nullable)
   - `created_at`, `updated_at`
   - UNIQUE(profile_id, compliance_item_id)

4. **compliance_audit_log** — Audit trail for board/regulator reports
   - `id` (uuid PK)
   - `profile_id` (uuid FK → profiles)
   - `compliance_item_id` (uuid FK → compliance_items)
   - `action` (text) — e.g. "evidence_uploaded", "verified", "expired", "reminder_sent"
   - `performed_by` (uuid, references auth.users)
   - `details` (jsonb, nullable)
   - `created_at` (timestamp)

## Modified Tables
None — all new tables are additive and don't alter existing structures.

## Security (RLS)
- **compliance_items**: SELECT for all authenticated; write (INSERT/UPDATE/DELETE) for admins only
- **compliance_role_requirements**: SELECT for all authenticated; write for admins only
- **compliance_records**: SELECT — employees see their own, managers/admins see team/all; INSERT/UPDATE — employees can update their own, managers can verify, admins full access
- **compliance_audit_log**: SELECT for admins/managers/leadership; INSERT for all authenticated (system writes audit entries); no UPDATE/DELETE

## Important Notes
1. All tables use `gen_random_uuid()` for primary keys
2. Enum types are created with `DO $$ ... CREATE TYPE ... $$` blocks for idempotency
3. Expiry dates are calculated in application logic from completion_date + expiry_months
4. The compliance engine integrates with existing job_families table for role mapping
5. Storage bucket "compliance-evidence" should be created for file uploads (handled in app)
*/

-- Create enum types idempotently
DO $$ BEGIN
  CREATE TYPE compliance_item_type AS ENUM ('compliance', 'competency');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_requirement_type AS ENUM ('mandatory', 'essential', 'optional');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_record_status AS ENUM ('compliant', 'expiring_soon', 'non_compliant', 'pending_verification', 'not_started');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. compliance_items — Master list
CREATE TABLE IF NOT EXISTS compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  item_type compliance_item_type NOT NULL DEFAULT 'competency',
  requirement_type compliance_requirement_type NOT NULL DEFAULT 'essential',
  regulatory_body text,
  evidence_required boolean NOT NULL DEFAULT true,
  expiry_months integer,
  renewal_cycle text DEFAULT 'none',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_compliance_items" ON compliance_items;
CREATE POLICY "select_compliance_items" ON compliance_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_compliance_items_admin" ON compliance_items;
CREATE POLICY "insert_compliance_items_admin" ON compliance_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "update_compliance_items_admin" ON compliance_items;
CREATE POLICY "update_compliance_items_admin" ON compliance_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "delete_compliance_items_admin" ON compliance_items;
CREATE POLICY "delete_compliance_items_admin" ON compliance_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

-- 2. compliance_role_requirements — Maps items to job roles
CREATE TABLE IF NOT EXISTS compliance_role_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_item_id uuid NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE,
  requirement_type compliance_requirement_type NOT NULL DEFAULT 'essential',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(compliance_item_id, job_family_id)
);

ALTER TABLE compliance_role_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_compliance_role_reqs" ON compliance_role_requirements;
CREATE POLICY "select_compliance_role_reqs" ON compliance_role_requirements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_compliance_role_reqs_admin" ON compliance_role_requirements;
CREATE POLICY "insert_compliance_role_reqs_admin" ON compliance_role_requirements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "update_compliance_role_reqs_admin" ON compliance_role_requirements;
CREATE POLICY "update_compliance_role_reqs_admin" ON compliance_role_requirements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "delete_compliance_role_reqs_admin" ON compliance_role_requirements;
CREATE POLICY "delete_compliance_role_reqs_admin" ON compliance_role_requirements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

-- 3. compliance_records — Employee evidence/verification
CREATE TABLE IF NOT EXISTS compliance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  compliance_item_id uuid NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  status compliance_record_status NOT NULL DEFAULT 'not_started',
  evidence_file_path text,
  evidence_file_name text,
  completion_date date,
  expiry_date date,
  self_assessment_rating integer CHECK (self_assessment_rating BETWEEN 1 AND 4),
  manager_verified boolean NOT NULL DEFAULT false,
  manager_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  manager_verified_at timestamptz,
  manager_notes text,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, compliance_item_id)
);

ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;

-- Employees see their own records; managers see their team's; admins/leadership see all
DROP POLICY IF EXISTS "select_compliance_records" ON compliance_records;
CREATE POLICY "select_compliance_records" ON compliance_records FOR SELECT
  TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'senior'))
    OR EXISTS (
      SELECT 1 FROM profiles mgr
      JOIN profiles emp ON emp.manager_id = mgr.id
      WHERE mgr.id = auth.uid() AND emp.id = compliance_records.profile_id
    )
  );

-- Employees can insert their own records
DROP POLICY IF EXISTS "insert_compliance_records" ON compliance_records;
CREATE POLICY "insert_compliance_records" ON compliance_records FOR INSERT
  TO authenticated WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Employees can update their own (evidence upload, self-assessment); managers can verify
DROP POLICY IF EXISTS "update_compliance_records" ON compliance_records;
CREATE POLICY "update_compliance_records" ON compliance_records FOR UPDATE
  TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leadership'))
  ) WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leadership'))
  );

-- Only admins can delete
DROP POLICY IF EXISTS "delete_compliance_records_admin" ON compliance_records;
CREATE POLICY "delete_compliance_records_admin" ON compliance_records FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

-- 4. compliance_audit_log — Audit trail
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  compliance_item_id uuid REFERENCES compliance_items(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_compliance_audit" ON compliance_audit_log;
CREATE POLICY "select_compliance_audit" ON compliance_audit_log FOR SELECT
  TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leadership', 'senior'))
  );

DROP POLICY IF EXISTS "insert_compliance_audit" ON compliance_audit_log;
CREATE POLICY "insert_compliance_audit" ON compliance_audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_items_type ON compliance_items(item_type);
CREATE INDEX IF NOT EXISTS idx_compliance_items_active ON compliance_items(is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_role_reqs_item ON compliance_role_requirements(compliance_item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_role_reqs_role ON compliance_role_requirements(job_family_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_profile ON compliance_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_item ON compliance_records(compliance_item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_status ON compliance_records(status);
CREATE INDEX IF NOT EXISTS idx_compliance_records_expiry ON compliance_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_profile ON compliance_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_item ON compliance_audit_log(compliance_item_id);

-- Storage bucket for compliance evidence uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-evidence', 'compliance-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for compliance-evidence bucket
DROP POLICY IF EXISTS "compliance_evidence_upload" ON storage.objects;
CREATE POLICY "compliance_evidence_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'compliance-evidence');

DROP POLICY IF EXISTS "compliance_evidence_read_own" ON storage.objects;
CREATE POLICY "compliance_evidence_read_own" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'compliance-evidence'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'leadership', 'senior'))
    )
  );

DROP POLICY IF EXISTS "compliance_evidence_delete_own" ON storage.objects;
CREATE POLICY "compliance_evidence_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'compliance-evidence'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Seed initial compliance items for social housing
INSERT INTO compliance_items (name, description, item_type, requirement_type, regulatory_body, expiry_months, renewal_cycle, sort_order) VALUES
  ('Asbestos Awareness', 'Mandatory training for anyone who may encounter asbestos-containing materials in housing stock.', 'compliance', 'mandatory', 'Health & Safety Executive', 12, 'annual', 1),
  ('Gas Safety Awareness', 'Understanding gas safety obligations under the Gas Safety (Installation and Use) Regulations.', 'compliance', 'mandatory', 'Gas Safe Register', 12, 'annual', 2),
  ('Fire Safety Awareness', 'Fire safety training aligned with the Regulatory Reform (Fire Safety) Order 2005 and Building Safety Act.', 'compliance', 'mandatory', 'Building Safety Act', 12, 'annual', 3),
  ('Safeguarding Vulnerable Tenants', 'Recognising and responding to safeguarding concerns for vulnerable adults and children.', 'compliance', 'mandatory', 'Housing Ombudsman', 24, 'biannual', 4),
  ('Data Protection (UK GDPR)', 'Understanding data protection obligations when handling tenant information.', 'compliance', 'mandatory', 'ICO', 12, 'annual', 5),
  ('Health & Safety Awareness', 'General health and safety training for housing workers.', 'compliance', 'mandatory', 'HSE', 12, 'annual', 6),
  ('Anti-Social Behaviour Management', 'Managing ASB cases in line with the Housing Ombudsman''s Complaint Handling Code.', 'competency', 'essential', 'Housing Ombudsman', null, 'none', 7),
  ('Vulnerable Tenant Communication', 'Effective communication techniques for working with vulnerable tenants.', 'competency', 'essential', 'Consumer Standards', null, 'none', 8),
  ('Housing Ombudsman Complaint Handling', 'Understanding the Complaint Handling Code and dispute resolution processes.', 'compliance', 'mandatory', 'Housing Ombudsman', 24, 'biannual', 9),
  ('Building Safety Act Compliance', 'Understanding obligations under the Building Safety Act for high-rise residential buildings.', 'compliance', 'mandatory', 'Building Safety Act', 12, 'annual', 10),
  ('Damp and Mould Response', 'Recognising and responding to damp and mould reports per Consumer Standards.', 'competency', 'essential', 'Consumer Standards', 12, 'annual', 11),
  ('Right to Manage & Right to Buy', 'Understanding statutory consultation and right to manage/buy processes.', 'competency', 'essential', null, null, 'none', 12)
ON CONFLICT DO NOTHING;
